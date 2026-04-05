import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../chat.service';
import { FriendshipService } from '../../friendship/friendship.service';
import { Types } from 'mongoose';

@WebSocketGateway({
  cors: {
    origin: '*', // To be restricted in production
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected users: userId -> socketId
  private connectedUsers: Map<string, string> = new Map();

  // Track voice room participants: roomId -> Set<userId>
  private voiceRooms: Map<string, Set<string>> = new Map();
  // Map socketId -> {userId, roomId} to handle cleanup on disconnect
  private socketState: Map<string, { userId: string; roomId?: string }> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly friendshipService: FriendshipService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Get token from auth handshake or query params
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token.replace('Bearer ', ''));
      const userId = payload.sub; // or payload.id depending on your jwt structure

      if (!userId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Store userId in client data for easy access
      client.data.userId = userId;
      
      // Register status: Online
      this.connectedUsers.set(userId, client.id);
      this.socketState.set(client.id, { userId });
      
      // Join a private room for this user to allow targeting multi-device connections if needed
      client.join(`user_${userId}`);

      console.log(`[ChatGateway] User connected: ${userId} (Socket: ${client.id})`);
      
      // Notify user of successful connection
      client.emit('connected', { userId, socketId: client.id });

    } catch (error) {
      console.error(`[ChatGateway] Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const state = this.socketState.get(client.id);
    if (state) {
      const { userId, roomId } = state;
      
      // Cleanup voice room if active
      if (roomId) {
        this.handleLeaveVoiceRoom(client);
      }

      this.connectedUsers.delete(userId);
      this.socketState.delete(client.id);
      console.log(`[ChatGateway] User disconnected: ${userId}`);
    }
  }

  /**
   * Send Private Message (1-to-1)
   */
  @SubscribeMessage('sendPrivateMessage')
  async handlePrivateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; message: string; messageType?: string },
  ) {
    const senderId = client.data.userId;
    const { receiverId, message, messageType = 'text' } = data;

    if (!receiverId || !message) {
      return { status: 'error', message: 'ReceiverId and message are required' };
    }

    try {
      // 1. Persist to DB using ChatService
      const savedMessage = await this.chatService.createPrivateMessage(
        senderId,
        receiverId,
        message,
        messageType
      );

      // 2. Transmit to receiver if online (direct socket or private room)
      // Sending to room 'user_receiverId' handles all active sessions of that user
      this.server.to(`user_${receiverId}`).emit('newPrivateMessage', savedMessage);

      // 3. Confirm to sender
      return { status: 'ok', data: savedMessage };
    } catch (error) {
       console.error(`[ChatGateway] Error sending message: ${error.message}`);
       return { status: 'error', message: 'Failed to send message' };
    }
  }

  /**
   * Join a Channel Room (Group Chat)
   */
  @SubscribeMessage('joinChannel')
  handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const { channelId } = data;
    client.join(`channel_${channelId}`);
    return { status: 'joined', channelId };
  }

  /**
   * Send Channel Message
   */
  @SubscribeMessage('sendChannelMessage')
  async handleChannelMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; message: string },
  ) {
    const senderId = client.data.userId;
    const { channelId, message } = data;

    try {
      const savedMessage = await this.chatService.createForUser(senderId, {
        channelId,
        message
      });

      // Broadcast to all in channel
      this.server.to(`channel_${channelId}`).emit('newChannelMessage', savedMessage);

      return { status: 'ok', data: savedMessage };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId?: string; channelId?: string; isTyping: boolean },
  ) {
    const senderId = client.data.userId;

    if (data.receiverId) {
      const areFriends = await this.friendshipService.areFriends(senderId, data.receiverId);
      if (!areFriends) return; // Silent discard for typing
    }

    const target = data.channelId ? `channel_${data.channelId}` : `user_${data.receiverId}`;
    
    if (target) {
      client.to(target).emit('userTyping', {
        userId: senderId,
        isTyping: data.isTyping,
        channelId: data.channelId
      });
    }
  }

  // ─────────────────────────────────────────────
  //         WebRTC SIGNALING EVENTS
  // ─────────────────────────────────────────────

  /** Caller initiates a call */
  @SubscribeMessage('callUser')
  async handleCallUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; callerName: string; callerAvatar?: string },
  ) {
    const callerId = client.data.userId;

    // Check friendship before calling
    const areFriends = await this.friendshipService.areFriends(callerId, data.receiverId);
    if (!areFriends) {
      return { status: 'error', message: 'You can only call your friends' };
    }

    this.server.to(`user_${data.receiverId}`).emit('incomingCall', {
      callerId,
      callerName: data.callerName,
      callerAvatar: data.callerAvatar || '',
    });
    return { status: 'ringing' };
  }

  /** Callee accepts the call */
  @SubscribeMessage('answerCall')
  handleAnswerCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callerId: string; answer: any },
  ) {
    this.server.to(`user_${data.callerId}`).emit('callAnswered', { answer: data.answer });
  }

  /** Callee rejects the call */
  @SubscribeMessage('rejectCall')
  handleRejectCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { callerId: string },
  ) {
    this.server.to(`user_${data.callerId}`).emit('callRejected');
  }

  /** Either party ends the call */
  @SubscribeMessage('endCall')
  handleEndCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { peerId: string },
  ) {
    this.server.to(`user_${data.peerId}`).emit('callEnded');
  }

  /** Exchange WebRTC offer */
  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; offer: any },
  ) {
    this.server.to(`user_${data.receiverId}`).emit('offer', {
      senderId: client.data.userId,
      offer: data.offer,
    });
  }

  /** Exchange WebRTC answer */
  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; answer: any },
  ) {
    this.server.to(`user_${data.receiverId}`).emit('answer', {
      senderId: client.data.userId,
      answer: data.answer,
    });
  }

  /** Exchange ICE candidates */
  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; candidate: any },
  ) {
    this.server.to(`user_${data.receiverId}`).emit('ice-candidate', {
      senderId: client.data.userId,
      candidate: data.candidate,
    });
  }

  /**
   * Notify message deletion
   */
  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; receiverId: string },
  ) {
    const senderId = client.data.userId;
    try {
      await this.chatService.deleteMessage(senderId, data.messageId);
      
      // Notify receiver if they are online
      this.server.to(`user_${data.receiverId}`).emit('messageDeleted', { messageId: data.messageId });
      
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Notify conversation deletion
   */
  @SubscribeMessage('deleteConversation')
  async handleDeleteConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interlocutorId: string },
  ) {
    const userId = client.data.userId;
    try {
      await this.chatService.deleteConversation(userId, data.interlocutorId);
      
      // Notify both parties (the caller's other sessions and the interlocutor)
      this.server.to(`user_${userId}`).emit('conversationDeleted', { interlocutorId: data.interlocutorId });
      this.server.to(`user_${data.interlocutorId}`).emit('conversationDeleted', { interlocutorId: userId });
      
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // ─────────────────────────────────────────────
  //         VOICE ROOM MANAGEMENT
  // ─────────────────────────────────────────────

  @SubscribeMessage('joinVoiceRoom')
  async handleJoinVoiceRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.data.userId;
    const { roomId } = data;

    console.log(`[Voice] User ${userId} joining room ${roomId}`);

    // Leave current room if any
    const state = this.socketState.get(client.id);
    if (state?.roomId) {
      this.handleLeaveVoiceRoom(client);
    }

    // Join new room
    if (!this.voiceRooms.has(roomId)) {
      this.voiceRooms.set(roomId, new Set());
    }
    
    const participants = this.voiceRooms.get(roomId);
    if (!participants) {
      // Should not happen as we just set it, but for TS safety:
      return { status: 'error', message: 'Failed to create room' };
    }
    
    // Get list of existing users to return to the new joiner
    const existingUsers = Array.from(participants);
    
    participants.add(userId);
    this.socketState.set(client.id, { userId, roomId });
    client.join(`voice_${roomId}`);

    // Notify others in the room
    client.to(`voice_${roomId}`).emit('user-joined', { userId });

    return { status: 'ok', roomId, participants: existingUsers };
  }

  @SubscribeMessage('leaveVoiceRoom')
  handleLeaveVoiceRoom(@ConnectedSocket() client: Socket) {
    const state = this.socketState.get(client.id);
    if (!state || !state.roomId) return { status: 'not_in_room' };

    const { userId, roomId } = state;
    console.log(`[Voice] User ${userId} leaving room ${roomId}`);

    const participants = this.voiceRooms.get(roomId);
    if (participants) {
      participants.delete(userId);
      if (participants.size === 0) {
        this.voiceRooms.delete(roomId);
      }
    }

    client.leave(`voice_${roomId}`);
    this.socketState.set(client.id, { userId }); // Clear roomId

    // Notify others
    this.server.to(`voice_${roomId}`).emit('user-left', { userId });

    return { status: 'left', roomId };
  }

  @SubscribeMessage('voice-offer')
  handleVoiceOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; offer: any },
  ) {
    const from = client.data.userId;
    console.log(`[Voice] Offer from ${from} to ${data.to}`);
    this.server.to(`user_${data.to}`).emit('voice-offer', { from, offer: data.offer });
  }

  @SubscribeMessage('voice-answer')
  handleVoiceAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; answer: any },
  ) {
    const from = client.data.userId;
    console.log(`[Voice] Answer from ${from} to ${data.to}`);
    this.server.to(`user_${data.to}`).emit('voice-answer', { from, answer: data.answer });
  }

  @SubscribeMessage('voice-ice-candidate')
  handleVoiceIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; candidate: any },
  ) {
    const from = client.data.userId;
    this.server.to(`user_${data.to}`).emit('voice-ice-candidate', { from, candidate: data.candidate });
  }

  @SubscribeMessage('getVoiceRoomUsers')
  handleGetVoiceRoomUsers(@MessageBody() data: { roomId: string }) {
    const participants = this.voiceRooms.get(data.roomId);
    return participants ? Array.from(participants) : [];
  }
}

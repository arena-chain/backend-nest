import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { Chat } from './entities/chat.entity';
import { GroupChat } from './entities/group-chat.entity';
import { UsersService } from '../user/user.service';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getModelToken(Chat.name), useValue: {} },
        { provide: getModelToken(GroupChat.name), useValue: {} },
        { provide: UsersService, useValue: {} },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

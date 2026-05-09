# Frontend Implementation Guide: Ranked Tournaments & Invitations

## Overview
This guide details how to implement the "Create Ranked Tournament" feature on the frontend, including game selection from the catalog and friend selection for invitations.

## 1. API Integration

### Catalog Service
Create a service to fetch available games from the catalog.

```typescript
// catalog.service.ts
import axios from 'axios';

const CATALOG_API_URL = 'http://localhost:3000/catalog';

export interface CatalogGame {
  _id: string;
  title: string;
  description?: string;
  genre: string;
  publisher?: string;
  platforms?: string[];
  coverImageUrl?: string;
  isActive: boolean;
}

export const getAllGames = async (): Promise<CatalogGame[]> => {
  const response = await axios.get(CATALOG_API_URL);
  return response.data;
};
```

### Tournament Service
Ensure your `TournamentService` has a method to create a tournament.

```typescript
// tournament.service.ts
import axios from 'axios';

const API_URL = 'http://localhost:3000/tournements';

export const createTournament = async (tournamentData: FormData) => {
  const response = await axios.post(API_URL, tournamentData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
```

### Friendship Service
Service to fetch the user's friends.

```typescript
// friendship.service.ts
import axios from 'axios';

export const getFriends = async (userId: string) => {
  const response = await axios.get(`http://localhost:3000/friendship/friends/${userId}`);
  return response.data;
};

// Helper to extract friend user from friendship object
export const extractFriend = (friendship: any, currentUserId: string) => {
  return friendship.requesterId._id === currentUserId
    ? friendship.recipientId
    : friendship.requesterId;
};
```

## 2. Tournament Creation Form Component

### State Management
You'll need state for:
- `games`: List of all available games from catalog (fetched on mount).
- `selectedGameId`: The ID of the selected game.
- `friends`: List of user's friends (fetched on mount).
- `invitedUserIds`: Array of selected friend IDs.
- `tournamentType`: 'RANKED' or 'OFFICIAL'.
- Other tournament fields (name, startDate, endDate, etc.).

### React Example

```typescript
import React, { useState, useEffect } from 'react';
import { getAllGames, CatalogGame } from './services/catalog.service';
import { getFriends, extractFriend } from './services/friendship.service';
import { createTournament } from './services/tournament.service';

export const CreateTournamentForm = () => {
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [tournamentType, setTournamentType] = useState('RANKED');
  
  const currentUserId = 'YOUR_CURRENT_USER_ID'; // Get from auth context

  useEffect(() => {
    // Fetch games from catalog
    getAllGames().then(setGames);
    
    // Fetch user's friends
    getFriends(currentUserId).then((friendships) => {
      const friendsList = friendships.map(f => extractFriend(f, currentUserId));
      setFriends(friendsList);
    });
  }, []);

  const handleGameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGameId(e.target.value);
  };

  const handleFriendToggle = (friendId: string) => {
    setInvitedUserIds(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', 'Tournament Name');
    formData.append('gameId', selectedGameId);
    formData.append('organizerId', currentUserId);
    formData.append('type', tournamentType);
    formData.append('startDate', '2026-03-01');
    formData.append('endDate', '2026-03-15');
    formData.append('maxTeams', '16');
    formData.append('format', 'SINGLE_ELIMINATION');
    
    // Append invited users
    invitedUserIds.forEach(id => {
      formData.append('invitedUserIds[]', id);
    });

    try {
      await createTournament(formData);
      alert('Tournament created successfully!');
    } catch (error) {
      console.error('Failed to create tournament', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Tournament Type Selection */}
      <div>
        <label>Tournament Type:</label>
        <select value={tournamentType} onChange={(e) => setTournamentType(e.target.value)}>
          <option value="RANKED">Ranked</option>
          <option value="OFFICIAL">Official</option>
        </select>
      </div>

      {/* Game Selection from Catalog */}
      <div>
        <label>Select Game:</label>
        <select value={selectedGameId} onChange={handleGameChange} required>
          <option value="">-- Choose a game --</option>
          {games.map(game => (
            <option key={game._id} value={game._id}>
              {game.title} ({game.genre})
            </option>
          ))}
        </select>
      </div>

      {/* Other tournament fields */}
      <div>
        <label>Tournament Name:</label>
        <input type="text" required />
      </div>

      {/* Friend Invitations (only for RANKED) */}
      {tournamentType === 'RANKED' && (
        <div>
          <label>Invite Friends:</label>
          <div>
            {friends.map(friend => (
              <label key={friend._id}>
                <input
                  type="checkbox"
                  checked={invitedUserIds.includes(friend._id)}
                  onChange={() => handleFriendToggle(friend._id)}
                />
                {friend.nickname} ({friend.email})
              </label>
            ))}
          </div>
        </div>
      )}

      <button type="submit">Create Tournament</button>
    </form>
  );
};
```

## 3. How It Works

### Backend Relationship
- The `Tournament` schema has `gameId` that references the `Catalog` collection.
- When you fetch a tournament, the backend populates the game details automatically.
- When creating a tournament, you only need to send the game's `_id`.

### Frontend Flow
1. **On component mount**: Fetch all games via `GET /catalog`.
2. **Display dropdown**: Show game titles in a `<select>` dropdown.
3. **User selects game**: Store the selected game's `_id` in state.
4. **Form submission**: Send the `gameId` to the tournament creation endpoint.

## 4. Interfaces

```typescript
export enum TournamentType {
  OFFICIAL = 'OFFICIAL',
  RANKED = 'RANKED',
}

export interface CreateTournamentDto {
  name: string;
  gameId: string; // ID from catalog
  type: TournamentType;
  invitedUserIds?: string[]; // Only for RANKED tournaments
  organizerId: string;
  startDate: string;
  endDate: string;
  maxTeams: number;
  format: string;
  // ... other fields
}
```

## 5. Validations
- Ensure `gameId` is selected before submission.
- Ensure `invitedUserIds` contains valid MongoDB ObjectIds.
- For RANKED tournaments, friend invitations are optional but validated against friendship status on the backend.

## 6. Backend Notes
- The backend already populates game information when fetching tournaments.
- The backend validates that invited users are friends of the organizer.
- Notifications are automatically sent to invited users.

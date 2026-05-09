# Complete Frontend Implementation Guide
## Tournaments, Reservations & Tickets System

> **Complete CRUD operations for Admin Dashboard and Player App**

---

## Table of Contents

1. [Backend API Endpoints Summary](#backend-api-endpoints-summary)
2. [Admin Dashboard Implementation](#admin-dashboard-implementation)
3. [Player App Implementation](#player-app-implementation)
4. [Data Models & Types](#data-models--types)
5. [API Service Layer](#api-service-layer)

---

## Backend API Endpoints Summary

### Tournaments

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| POST | `/tournements` | Create tournament | Admin |
| GET | `/tournements` | List all tournaments | All |
| GET | `/tournements/:id` | Get tournament details | All |
| PATCH | `/tournements/:id` | Update tournament | Admin |
| DELETE | `/tournements/:id` | Delete tournament | Admin |
| POST | `/tournements/:id/register-team` | Register team (pro players) | Player |
| DELETE | `/tournements/:id/unregister-team/:teamId` | Unregister team | Player/Admin |
| PATCH | `/tournements/:id/phases/:phaseName` | Update phase status | Admin |
| POST | `/tournements/:id/phases` | Add phase | Admin |

### Reservations

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| POST | `/reservations` | Create reservation (book tickets) | Player |
| POST | `/reservations/:id/confirm` | Confirm payment | Player |
| GET | `/reservations` | List all reservations | Admin |
| GET | `/reservations/:id` | Get reservation details | Player/Admin |
| DELETE | `/reservations/:id` | Cancel reservation | Player/Admin |

### Tickets

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| POST | `/tickets` | Create tickets (direct, bypasses reservation) | Admin |
| GET | `/tickets` | List all tickets | Admin |
| GET | `/tickets/:id` | Get ticket details | Player/Admin |
| GET | `/tickets/search?number={ticketNumber}` | Search by ticket number | All |
| PATCH | `/tickets/:id` | Update ticket | Admin |
| DELETE | `/tickets/:id` | Delete ticket | Admin |

---

## Data Models & Types

### TypeScript Interfaces

```typescript
// Tournament Types
export enum TournamentFormat {
  SINGLE_ELIMINATION = 'SINGLE_ELIMINATION',
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
  SWISS = 'SWISS',
  ROUND_ROBIN = 'ROUND_ROBIN',
}

export enum TournamentStatus {
  DRAFT = 'DRAFT',
  OPEN_REGISTRATION = 'OPEN_REGISTRATION',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Bundle {
  quantity: number;
  price: number;
}

export interface TicketType {
  name: string;           // "VIP", "Standard"
  price: number;
  capacity: number;
  bundles?: Bundle[];
}

export interface Invitation {
  userId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface Tournament {
  _id: string;
  name: string;
  description?: string;
  gameId: string;
  organizerId: string;
  startDate: string;      // ISO date string
  endDate: string;
  registrationStart?: string;
  registrationEnd?: string;
  ticketSalesStart?: string;
  maxTeams: number;
  currentTeams: number;
  prizePool: number;
  firstPlace: number;
  secondPlace: number;
  thirdPlace: number;
  format: TournamentFormat;
  status: TournamentStatus;
  type: 'OFFICIAL';
  ticketTypes: TicketType[];
  invitations: Invitation[];
  bannerImageUrl?: string;
  streamUrl?: string;
  registrationOpen: boolean;
  teams: string[];
  rules: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Reservation Types
export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export interface Reservation {
  _id: string;
  user: string;
  tournament: string | Tournament;
  tickets: string[] | Ticket[];
  status: ReservationStatus;
  totalPrice: number;
  reservedAt: string;
  expiresAt: string;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
}

// Ticket Types
export enum TicketStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  USED = 'USED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface Ticket {
  _id: string;
  ticketNumber: string;
  tournament: string | Tournament;
  user: string;
  status: TicketStatus;
  price: number;
  purchaseDate: string;
  qrCode: string;         // Base64 data URL
  type: string;           // "VIP", "Standard"
  perks?: string;
  usedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## API Service Layer

### `services/api.ts`

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

export default apiRequest;
```

### `services/tournamentService.ts`

```typescript
import apiRequest from './api';
import { Tournament } from '../types';

export const tournamentService = {
  // Create Tournament
  async create(data: FormData): Promise<Tournament> {
    const response = await fetch(`${API_BASE_URL}/tournements`, {
      method: 'POST',
      body: data, // FormData for file upload
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });
    return response.json();
  },

  // Get All Tournaments
  async getAll(): Promise<Tournament[]> {
    return apiRequest<Tournament[]>('/tournements');
  },

  // Get Tournament by ID
  async getById(id: string): Promise<Tournament> {
    return apiRequest<Tournament>(`/tournements/${id}`);
  },

  // Update Tournament
  async update(id: string, data: Partial<Tournament>): Promise<Tournament> {
    return apiRequest<Tournament>(`/tournements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete Tournament
  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/tournements/${id}`, {
      method: 'DELETE',
    });
  },

  // Register Team
  async registerTeam(tournamentId: string, teamId: string): Promise<Tournament> {
    return apiRequest<Tournament>(`/tournements/${tournamentId}/register-team`, {
      method: 'POST',
      body: JSON.stringify({ teamId }),
    });
  },

  // Unregister Team
  async unregisterTeam(tournamentId: string, teamId: string): Promise<Tournament> {
    return apiRequest<Tournament>(
      `/tournements/${tournamentId}/unregister-team/${teamId}`,
      { method: 'DELETE' }
    );
  },
};
```

### `services/reservationService.ts`

```typescript
import apiRequest from './api';
import { Reservation } from '../types';

export const reservationService = {
  // Create Reservation (Book Tickets)
  async create(data: {
    tournament: string;
    user: string;
    ticketType: string;
    quantity: number;
  }): Promise<Reservation> {
    return apiRequest<Reservation>('/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Confirm Reservation (After Payment)
  async confirm(id: string, paymentId: string): Promise<Reservation> {
    return apiRequest<Reservation>(`/reservations/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ paymentId }),
    });
  },

  // Get All Reservations
  async getAll(): Promise<Reservation[]> {
    return apiRequest<Reservation[]>('/reservations');
  },

  // Get Reservation by ID
  async getById(id: string): Promise<Reservation> {
    return apiRequest<Reservation>(`/reservations/${id}`);
  },

  // Cancel Reservation
  async cancel(id: string): Promise<void> {
    return apiRequest<void>(`/reservations/${id}`, {
      method: 'DELETE',
    });
  },
};
```

### `services/ticketService.ts`

```typescript
import apiRequest from './api';
import { Ticket } from '../types';

export const ticketService = {
  // Get All Tickets
  async getAll(): Promise<Ticket[]> {
    return apiRequest<Ticket[]>('/tickets');
  },

  // Get Ticket by ID
  async getById(id: string): Promise<Ticket> {
    return apiRequest<Ticket>(`/tickets/${id}`);
  },

  // Search Ticket by Number
  async searchByNumber(ticketNumber: string): Promise<Ticket> {
    return apiRequest<Ticket>(`/tickets/search?number=${ticketNumber}`);
  },

  // Update Ticket
  async update(id: string, data: Partial<Ticket>): Promise<Ticket> {
    return apiRequest<Ticket>(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete Ticket
  async delete(id: string): Promise<void> {
    return apiRequest<void>(`/tickets/${id}`, {
      method: 'DELETE',
    });
  },
};
```

---

## Admin Dashboard Implementation

See full React component examples in artifact for:
- Create Tournament Form (with dynamic ticket types & bundles)
- Tournament List & Management
- View All Reservations
- Edit/Delete Operations

---

## Player App Implementation

See full React component examples in artifact for:
- Browse Tournaments
- Tournament Detail & Ticket Selection
- Reservation Confirmation (15-min countdown)
- My Tickets (QR codes)

---

## Key Integration Points

### Admin Workflow
1. Create tournament with ticket types
2. Configure bundle discounts
3. Upload banner image
4. Monitor reservations & sales

### Player Workflow
1. Browse official tournaments
2. Select ticket type & quantity
3. Create reservation (15-min hold)
4. Complete payment
5. View tickets with QR codes

For complete component code examples, see the full documentation artifact.

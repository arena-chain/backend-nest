# Frontend Implementation Guide: Ticket Booking System

## Overview
The backend is ready to handle ticket bookings. Tournaments have `ticketTypes` defined in their schema, and the `Tickets` module handles validation and creation.

## Backend Data Structure

### Tournament Object
The `Tournament` object now includes a `ticketTypes` array:
```typescript
interface TicketType {
    name: string; // e.g., "VIP", "Standard"
    price: number;
    capacity: number;
    bundles: { quantity: number; price: number }[];
}

interface Tournament {
    // ... other fields
    ticketTypes: TicketType[];
}
```

### Create Ticket DTO
To book a ticket, send a POST request to `/tickets`:
```typescript
{
    tournament: string; // Tournament ID
    user: string;       // User ID
    type: string;       // Ticket Type Name (must match one in tournament.ticketTypes)
    quantity: number;   // Number of tickets
}
```

## Step-by-Step Implementation

### 1. Update Tournament Model
Update your frontend `Tournament` model to include `ticketTypes`.

**File:** `src/models/tournament.ts`
```typescript
export interface Bundle {
    quantity: number;
    price: number;
}

export interface TicketType {
    name: string;
    price: number;
    capacity: number;
    bundles: Bundle[];
}

export interface Tournament {
    // ... existing fields
    ticketTypes: TicketType[];
}
```

### 2. Create Ticket Service
Create a service to handle ticket API calls.

**File:** `src/services/ticketService.ts`
```typescript
import { api } from './api'; // Assuming you have an axios instance or similar

export const bookTicket = async (tournamentId: string, ticketType: string, quantity: number) => {
    const response = await api.post('/tickets', {
        tournament: tournamentId,
        // user ID is usually handled by backend via token, but if your DTO requires it explicitly:
        user: getCurrentUserId(), 
        type: ticketType,
        quantity
    });
    return response.data;
};

export const getMyTickets = async () => {
    const response = await api.get('/tickets/my-tickets'); // You might need to implement this endpoint or filter on frontend
    return response.data;
};
```

### 3. Implement Booking UI in Tournament Details
Add a "Book Tickets" section to the `TournamentDetails` page (`TournamentDetails.tsx` or `PlayerTournamentDetails.tsx` depending on who is booking).

#### UI Components:
- **Ticket List:** Iterate through `tournament.ticketTypes`.
- **Ticket Card:** Display name, price, and a "Book" button.
- **Quantity Selector:** Allow user to choose quantity.
- **Booking Modal:** Confirm purchase details.

```tsx
// Example Component Snippet
const TicketBookingSection = ({ tournament }) => {
    const handleBook = async (type, quantity) => {
        try {
            await ticketService.bookTicket(tournament._id, type.name, quantity);
            alert('Tickets booked successfully!');
        } catch (error) {
            alert('Booking failed: ' + error.message);
        }
    };

    return (
        <div>
            <h2>Available Tickets</h2>
            <div className="grid gap-4">
                {tournament.ticketTypes.map(type => (
                    <div key={type.name} className="border p-4 rounded">
                        <h3>{type.name}</h3>
                        <p>{formatCurrency(type.price)}</p>
                        <p>{type.capacity} remaining</p>
                        <Button onClick={() => handleBook(type, 1)}>Book Now</Button>
                    </div>
                ))}
            </div>
        </div>
    );
};
```

### 4. Create "My Tickets" Page
Create a page for players to view their booked tickets.

**File:** `src/player/pages/MyTickets.tsx`
- Fetch tickets using `ticketService.getMyTickets()`.
- Display a list of tickets with QR codes (returned by backend).

### 5. Backend Adjustment (Recommendation)
Ensure the backend enables users to fetch *their own* tickets easily, e.g., via `GET /tickets?user=ME` or a dedicated endpoint. currently `findAll` returns all tickets, which might not be secure for players.

**Check:** `TicketsController`
- Ensure there is an endpoint that filters by the logged-in user.

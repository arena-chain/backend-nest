# Player Authentication API Guide

**Arena Chain Backend - Player Registration & Login**  
*API Documentation for Frontend Developers*

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Base URL & Authentication](#base-url--authentication)
3. [Player Registration](#player-registration)
4. [Player Login](#player-login)
5. [JWT Token Handling](#jwt-token-handling)
6. [Error Handling](#error-handling)
7. [Example Implementation](#example-implementation)

---

## Overview

The Arena Chain backend uses a **multi-role authentication system**. Players are one of four user types:
- `player` - Regular and professional players
- `team_manager` - Team organizers
- `referee` - Game referees
- `admin` - Platform administrators

This guide focuses on **Player** authentication.

---

## Base URL & Authentication

### Base URL
```
http://localhost:3000/api
```

> [!NOTE]
> Update this URL based on your deployment environment (staging/production).

### Authentication Method
- **JWT Bearer Tokens** (JSON Web Tokens)
- Access token expires in **15 minutes**
- Refresh token expires in **7 days**

---

## Player Registration

### Endpoint
```http
POST /auth/register/player
```

### Request Headers
```http
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `email` | string | ✅ Yes | Player's email (unique) | `"player@example.com"` |
| `password` | string | ✅ Yes | Password (min 6 characters) | `"SecurePass123!"` |
| `nickname` | string | ✅ Yes | Display name | `"ProGamer99"` |
| `isPro` | boolean | ⬜ No | Professional player status | `false` (default) |
| `isVerified` | boolean | ⬜ No | Verified player status | `false` (default) |

### Example Request

```json
POST /auth/register/player
Content-Type: application/json

{
  "email": "johnsmith@example.com",
  "password": "SecurePassword123!",
  "nickname": "JohnTheGamer",
  "isPro": false,
  "isVerified": false
}
```

### Success Response (201 Created)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NWY3YjM4ZTRhMjFjZDEyMzQ1Njc4OTAiLCJlbWFpbCI6ImpvaG5zbWl0aEBleGFtcGxlLmNvbSIsInJvbGUiOiJwbGF5ZXIiLCJpYXQiOjE3MDk1NjQyMzAsImV4cCI6MTcwOTU2NTEzMH0...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NWY3YjM4ZTRhMjFjZDEyMzQ1Njc4OTAiLCJlbWFpbCI6ImpvaG5zbWl0aEBleGFtcGxlLmNvbSIsInJvbGUiOiJwbGF5ZXIiLCJpYXQiOjE3MDk1NjQyMzAsImV4cCI6MTcxMDE2OTAzMH0..."
}
```

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

#### 409 Conflict - User Already Exists
```json
{
  "statusCode": 409,
  "message": "User already exists",
  "error": "Conflict"
}
```

---

## Player Login

### Endpoint
```http
POST /auth/login
```

### Request Headers
```http
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `email` | string | ✅ Yes | Player's email | `"player@example.com"` |
| `password` | string | ✅ Yes | Player's password | `"SecurePass123!"` |

### Example Request

```json
POST /auth/login
Content-Type: application/json

{
  "email": "johnsmith@example.com",
  "password": "SecurePassword123!"
}
```

### Success Response (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65f7b38e4a21cd1234567890",
    "email": "johnsmith@example.com",
    "nickname": "JohnTheGamer",
    "role": "player",
    "profile": {
      "userId": "65f7b38e4a21cd1234567890",
      "isPro": false,
      "isVerified": false,
      "elo": 1000,
      "rank": "Unranked",
      "stats": {},
      "createdAt": "2024-03-18T10:30:00.000Z",
      "updatedAt": "2024-03-18T10:30:00.000Z"
    }
  }
}
```

### Error Responses

#### 401 Unauthorized - Invalid Credentials
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

#### 401 Unauthorized - No Profile Found
```json
{
  "statusCode": 401,
  "message": "No profile found for user",
  "error": "Unauthorized"
}
```

---

## JWT Token Handling

### Token Structure

When you decode the `accessToken` JWT, you'll find:

```json
{
  "sub": "65f7b38e4a21cd1234567890",  // User ID
  "email": "johnsmith@example.com",
  "role": "player",                    // User role
  "iat": 1709564230,                   // Issued at
  "exp": 1709565130                    // Expires at
}
```

### Using Tokens for Protected Routes

For authenticated requests, include the access token in the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration

- **Access Token**: 15 minutes
- **Refresh Token**: 7 days

> [!IMPORTANT]
> Implement token refresh logic on the frontend to automatically renew expired access tokens using the refresh token.

### Recommended Flow

```mermaid
sequenceDiagram
    participant Frontend
    participant Backend
    
    Frontend->>Backend: Login Request
    Backend-->>Frontend: Access Token (15m) + Refresh Token (7d)
    
    Note over Frontend: Store tokens securely
    
    Frontend->>Backend: API Request with Access Token
    alt Token Valid
        Backend-->>Frontend: Success Response
    else Token Expired
        Backend-->>Frontend: 401 Unauthorized
        Frontend->>Backend: Refresh Token Request
        Backend-->>Frontend: New Access Token
        Frontend->>Backend: Retry API Request
        Backend-->>Frontend: Success Response
    end
```

---

## Error Handling

### HTTP Status Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| `200` | OK | Successful login |
| `201` | Created | Successful registration |
| `400` | Bad Request | Validation errors, missing required fields |
| `401` | Unauthorized | Invalid credentials, expired token |
| `409` | Conflict | Email already registered |
| `500` | Internal Server Error | Server-side error |

### Error Response Format

All errors follow this structure:

```json
{
  "statusCode": 400,
  "message": "Error description or array of validation errors",
  "error": "Error type"
}
```

---

## Example Implementation

### JavaScript/TypeScript (Fetch API)

```typescript
// Registration
async function registerPlayer(email: string, password: string, nickname: string) {
  try {
    const response = await fetch('http://localhost:3000/api/auth/register/player', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        nickname,
        isPro: false,
        isVerified: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    
    // Store tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    
    return data;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

// Login
async function loginPlayer(email: string, password: string) {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    
    // Store tokens and user data
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Making authenticated requests
async function makeAuthenticatedRequest(endpoint: string) {
  const accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch(`http://localhost:3000/api${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (response.status === 401) {
    // Token expired - implement refresh logic here
    console.log('Token expired, refresh needed');
  }
  
  return response.json();
}
```

### React Hook Example

```typescript
import { useState } from 'react';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface User {
  id: string;
  email: string;
  nickname: string;
  role: string;
  profile: any;
}

export function usePlayerAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (email: string, password: string, nickname: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/register/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      const data = await response.json();
      
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return { user, loading, error, register, login, logout };
}
```

---

## Quick Reference

### Registration Checklist

✅ Endpoint: `POST /auth/register/player`  
✅ Required: `email`, `password`, `nickname`  
✅ Optional: `isPro`, `isVerified`  
✅ Returns: `accessToken`, `refreshToken`  

### Login Checklist

✅ Endpoint: `POST /auth/login`  
✅ Required: `email`, `password`  
✅ Returns: `accessToken`, `refreshToken`, `user` object with profile  

### Token Usage

✅ Header: `Authorization: Bearer {accessToken}`  
✅ Access token lifetime: 15 minutes  
✅ Refresh token lifetime: 7 days  

---

## Support

For additional endpoints or questions about other user roles (team manager, referee, admin), contact the backend development team.

**Backend Repository**: Arena Chain Backend  
**API Documentation**: Swagger available at `/api/docs` (if enabled)

# Reels Module - Frontend API Documentation

This document provides all the details required to integrate the Reels feature on the frontend application. 

## Base URL
`/reels`

## Authentication
All endpoints (except the GET endpoints for fetching) require the standard `Authorization: Bearer <TOKEN>` header.

---

## 1. Fetch All Reels (Feed with Infinite Scroll)
**`GET /reels`**

This endpoint returns a paginated list of reels, ordered by newest first. Users inside `creator` and nested `comments.userId` / `likes.userId` are fully populated.

### Query Parameters
- `page` (optional): Default `1`
- `limit` (optional): Default `10`

### Example Response
```json
{
  "data": [
    {
      "_id": "60d5ec49f1b2c4...2390",
      "title": "Epic Gameplay moment!",
      "description": "Watch me clutch this 1v5",
      "videoUrl": "https://example.com/video.mp4",
      "creator": {
        "_id": "user_123",
        "username": "Gamer123",
        "avatar": "https://example.com/avatar.png"
      },
      "likes": [
        {
          "userId": {
            "_id": "user_456",
            "username": "FanGuy"
          },
          "createdAt": "2023-10-01T12:00:00.000Z"
        }
      ],
      "saves": [],
      "comments": [
        {
          "_id": "comment_987",
          "userId": {
            "_id": "user_456",
            "username": "FanGuy"
          },
          "text": "Sick play man!",
          "likes": [],
          "createdAt": "2023-10-01T12:05:00.000Z"
        }
      ],
      "createdAt": "2023-10-01T11:00:00.000Z",
      "updatedAt": "2023-10-01T11:00:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

## 2. Fetch Single Reel
**`GET /reels/:id`**

Fetch a specific reel by its ObjectId. Returns a fully populated reel object layout matching the `data` array above.

---

## 3. Create a New Reel
**`POST /reels`**
*(Requires Bearer Token)*

### Body Payload
```json
{
  "title": "My Awesome Reel",
  "description": "Description goes here", 
  "videoUrl": "https://url.to/myvideo.mp4" 
}
```

---

## 4. Delete a Reel
**`DELETE /reels/:id`**
*(Requires Bearer Token)*

Reels can only be deleted by the user who created them. Returns success code upon completion.

---

## 5. Toggle Like on a Reel
**`POST /reels/:id/like`**
*(Requires Bearer Token)*

This endpoint acts as a toggle.
- If the user hasn't liked the reel, their like is added.
- If the user has already liked the reel, their like is removed.

Returns the updated, fully populated Reel object.

---

## 6. Toggle Save/Bookmark on a Reel
**`POST /reels/:id/save`**
*(Requires Bearer Token)*

This endpoint acts as a toggle. 
- If the user hasn't saved the reel, their save is added.
- If the user has already saved the reel, it is removed.

Returns the updated, fully populated Reel object.

---

## 7. Add Comment to a Reel
**`POST /reels/:id/comments`**
*(Requires Bearer Token)*

### Body Payload
```json
{
  "text": "This is my comment!"
}
```

Returns the updated, fully populated Reel object (allowing the frontend to instantly display the new comment).

---

## 8. Delete a Comment
**`DELETE /reels/:id/comments/:commentId`**
*(Requires Bearer Token)*

Deletes a specific comment. You must be either the author of the comment OR the creator of the reel.

Returns the updated, fully populated Reel object.

---

## 9. Toggle Like on a Specific Comment
**`POST /reels/:id/comments/:commentId/like`**
*(Requires Bearer Token)*

Toggles a like on a specific comment nested within the reel.

Returns the updated, fully populated Reel object.

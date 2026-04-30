# Catalog API Documentation

This document provides complete API documentation for the Catalog endpoints, including image upload functionality.

## Base URL
```
http://localhost:3000/catalog
```

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/catalog` | Create a new catalog item with optional image |
| GET | `/catalog` | Get all catalog items |
| GET | `/catalog/:id` | Get a specific catalog item by ID |
| PATCH | `/catalog/:id` | Update a catalog item with optional new image |
| DELETE | `/catalog/:id` | Delete a catalog item |

---

## 1. Create Catalog Item

### Endpoint
```
POST /catalog
```

### Content-Type
```
multipart/form-data
```

### Request Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `title` | string | ✅ Yes | Game title | "League of Legends" |
| `genre` | string | ✅ Yes | Game genre | "MOBA" |
| `description` | string | ❌ No | Brief description | "A 5v5 team-based strategy game" |
| `publisher` | string | ❌ No | Publisher name | "Riot Games" |
| `platforms` | string | ❌ No | Platform (can send multiple) | "PC" |
| `isActive` | string | ❌ No | Active status | "true" or "false" |
| `releaseDate` | string | ❌ No | Release date (ISO format) | "2009-10-27" |
| `file` | file | ❌ No | Cover image (JPG, JPEG, PNG, GIF) | Binary file |
| `metadata` | string | ❌ No | JSON string of metadata | '{"gameEngine":"Custom"}' |

### Example Request (cURL)
```bash
curl -X POST 'http://localhost:3000/catalog' \
  -H 'Content-Type: multipart/form-data' \
  -F 'title=League of Legends' \
  -F 'genre=MOBA' \
  -F 'description=A 5v5 team-based strategy game' \
  -F 'publisher=Riot Games' \
  -F 'platforms=PC' \
  -F 'isActive=true' \
  -F 'releaseDate=2009-10-27' \
  -F 'file=@/path/to/image.jpg' \
  -F 'metadata={"gameEngine":"Custom","maxPlayers":10}'
```

### Example Request (JavaScript/Fetch)
```javascript
const formData = new FormData();
formData.append('title', 'League of Legends');
formData.append('genre', 'MOBA');
formData.append('description', 'A 5v5 team-based strategy game');
formData.append('publisher', 'Riot Games');
formData.append('platforms', 'PC');
formData.append('platforms', 'PlayStation 5'); // Multiple platforms
formData.append('isActive', 'true');
formData.append('releaseDate', '2009-10-27');
formData.append('file', fileInput.files[0]); // File from input element
formData.append('metadata', JSON.stringify({ gameEngine: 'Custom', maxPlayers: 10 }));

const response = await fetch('http://localhost:3000/catalog', {
  method: 'POST',
  body: formData,
  // Don't set Content-Type header - browser will set it with boundary
});

const data = await response.json();
```

### Example Request (React with Axios)
```javascript
import axios from 'axios';

const handleSubmit = async (formValues, imageFile) => {
  const formData = new FormData();
  
  formData.append('title', formValues.title);
  formData.append('genre', formValues.genre);
  formData.append('description', formValues.description);
  formData.append('publisher', formValues.publisher);
  
  // Handle multiple platforms
  formValues.platforms.forEach(platform => {
    formData.append('platforms', platform);
  });
  
  formData.append('isActive', formValues.isActive.toString());
  formData.append('releaseDate', formValues.releaseDate);
  
  if (imageFile) {
    formData.append('file', imageFile);
  }
  
  if (formValues.metadata) {
    formData.append('metadata', JSON.stringify(formValues.metadata));
  }

  try {
    const response = await axios.post('http://localhost:3000/catalog', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('Created:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data);
  }
};
```

### Success Response (201 Created)
```json
{
  "title": "League of Legends",
  "description": "A 5v5 team-based strategy game",
  "genre": "MOBA",
  "publisher": "Riot Games",
  "platforms": ["PC"],
  "isActive": true,
  "releaseDate": "2009-10-27T00:00:00.000Z",
  "coverImageUrl": "/uploads/league-of-legends-a1b2.jpg",
  "metadata": {
    "gameEngine": "Custom",
    "maxPlayers": 10
  },
  "_id": "69872a7af5c32ecfaf2f30a0",
  "createdAt": "2026-02-07T12:05:14.139Z",
  "updatedAt": "2026-02-07T12:05:14.139Z",
  "__v": 0
}
```

### Error Response (400 Bad Request)
```json
{
  "message": [
    "title should not be empty",
    "genre should not be empty"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## 2. Get All Catalog Items

### Endpoint
```
GET /catalog
```

### Example Request
```bash
curl -X GET 'http://localhost:3000/catalog'
```

### Success Response (200 OK)
```json
[
  {
    "_id": "69872a7af5c32ecfaf2f30a0",
    "title": "League of Legends",
    "description": "A 5v5 team-based strategy game",
    "genre": "MOBA",
    "publisher": "Riot Games",
    "platforms": ["PC"],
    "isActive": true,
    "releaseDate": "2009-10-27T00:00:00.000Z",
    "coverImageUrl": "/uploads/league-of-legends-a1b2.jpg",
    "metadata": {},
    "createdAt": "2026-02-07T12:05:14.139Z",
    "updatedAt": "2026-02-07T12:05:14.139Z",
    "__v": 0
  }
]
```

---

## 3. Get Catalog Item by ID

### Endpoint
```
GET /catalog/:id
```

### Example Request
```bash
curl -X GET 'http://localhost:3000/catalog/69872a7af5c32ecfaf2f30a0'
```

### Success Response (200 OK)
```json
{
  "_id": "69872a7af5c32ecfaf2f30a0",
  "title": "League of Legends",
  "description": "A 5v5 team-based strategy game",
  "genre": "MOBA",
  "publisher": "Riot Games",
  "platforms": ["PC"],
  "isActive": true,
  "releaseDate": "2009-10-27T00:00:00.000Z",
  "coverImageUrl": "/uploads/league-of-legends-a1b2.jpg",
  "metadata": {},
  "createdAt": "2026-02-07T12:05:14.139Z",
  "updatedAt": "2026-02-07T12:05:14.139Z",
  "__v": 0
}
```

### Error Response (404 Not Found)
```json
{
  "statusCode": 404,
  "message": "Not Found"
}
```

---

## 4. Update Catalog Item

### Endpoint
```
PATCH /catalog/:id
```

### Content-Type
```
multipart/form-data
```

### Request Fields
Same as Create endpoint - all fields are optional for updates.

### Example Request
```bash
curl -X PATCH 'http://localhost:3000/catalog/69872a7af5c32ecfaf2f30a0' \
  -H 'Content-Type: multipart/form-data' \
  -F 'title=League of Legends Updated' \
  -F 'file=@/path/to/new-image.jpg'
```

### Success Response (200 OK)
```json
{
  "_id": "69872a7af5c32ecfaf2f30a0",
  "title": "League of Legends Updated",
  "description": "A 5v5 team-based strategy game",
  "genre": "MOBA",
  "publisher": "Riot Games",
  "platforms": ["PC"],
  "isActive": true,
  "releaseDate": "2009-10-27T00:00:00.000Z",
  "coverImageUrl": "/uploads/league-of-legends-c3d4.jpg",
  "metadata": {},
  "createdAt": "2026-02-07T12:05:14.139Z",
  "updatedAt": "2026-02-07T12:10:30.456Z",
  "__v": 0
}
```

---

## 5. Delete Catalog Item

### Endpoint
```
DELETE /catalog/:id
```

### Example Request
```bash
curl -X DELETE 'http://localhost:3000/catalog/69872a7af5c32ecfaf2f30a0'
```

### Success Response (200 OK)
```json
{
  "_id": "69872a7af5c32ecfaf2f30a0",
  "title": "League of Legends",
  ...
}
```

---

## Image Upload Details

### Supported Formats
- JPG / JPEG
- PNG
- GIF

### File Size Limit
No explicit limit set (default Node.js/Express limits apply)

### Image Access
Uploaded images are accessible at:
```
http://localhost:3000/uploads/{filename}
```

Example:
```
http://localhost:3000/uploads/league-of-legends-a1b2.jpg
```

### Image Display in Frontend
```html
<img src="http://localhost:3000/uploads/league-of-legends-a1b2.jpg" alt="Game Cover" />
```

Or using the coverImageUrl from the response:
```javascript
<img src={`http://localhost:3000${catalog.coverImageUrl}`} alt={catalog.title} />
```

---

## Important Notes for Frontend Developers

### 1. **Multipart Form Data**
- Always use `multipart/form-data` when creating or updating with files
- Don't manually set `Content-Type` header in fetch/axios - let the browser handle it

### 2. **Type Conversions**
The backend automatically handles these conversions:
- `platforms`: Single string → Array (or multiple form fields → Array)
- `isActive`: String "true"/"false" → Boolean
- `metadata`: JSON string → Object

### 3. **Multiple Platforms**
To send multiple platforms, append the field multiple times:
```javascript
formData.append('platforms', 'PC');
formData.append('platforms', 'PlayStation 5');
formData.append('platforms', 'Xbox Series X');
```

### 4. **Date Format**
Send dates as ISO 8601 strings: `YYYY-MM-DD`

### 5. **Metadata**
Send metadata as a JSON string:
```javascript
formData.append('metadata', JSON.stringify({ key: 'value' }));
```

### 6. **Genre Options**
Suggested genres (not enforced):
- MOBA
- FPS
- Battle Royale
- Strategy
- Sports
- RPG
- Fighting

---

## Swagger Documentation

Interactive API documentation is available at:
```
http://localhost:3000/api
```

You can test all endpoints directly from the Swagger UI, including file uploads.

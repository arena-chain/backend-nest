# Catalog Form Implementation Guide

This document outlines the requirements for implementing the "Create/Edit Catalog Item" form on the frontend. It is based on the backend `Catalog` entity schema.

## Form Structure

The form allows administrators to manage game catalog entries.

### 1. Title
*   **Label:** Game Title
*   **Internal Key:** `title`
*   **Type:** Text Input
*   **Required:** Yes
*   **Validation:**
    *   Cannot be empty.
    *   Check for duplicates if applicable (optional API check).
*   **Placeholder:** "e.g., League of Legends"

### 2. Genre
*   **Label:** Genre
*   **Internal Key:** `genre`
*   **Type:** Select / Dropdown or Text Input with suggestions
*   **Required:** Yes
*   **Validation:**
    *   Must be selected.
*   **Suggested Options:** MOBA, FPS, Battle Royale, Strategy, Sports, RPG, Fighting.

### 3. Description
*   **Label:** Description
*   **Internal Key:** `description`
*   **Type:** Textarea / Rich Text Editor
*   **Required:** No (Optional)
*   **Validation:** Max length ~500-1000 characters suggested (backend limit depends on database).
*   **Placeholder:** "Brief overview of the game..."

### 4. Publisher
*   **Label:** Publisher
*   **Internal Key:** `publisher`
*   **Type:** Text Input
*   **Required:** No (Optional)
*   **Placeholder:** "e.g., Riot Games, Valve"

### 5. Platforms
*   **Label:** Supported Platforms
*   **Internal Key:** `platforms`
*   **Type:** Checkbox Group or Multi-Select Tag Input
*   **Required:** No (Defaults to empty array `[]`)
*   **Options:**
    *   PC
    *   PlayStation 5 / 4
    *   Xbox Series X / S
    *   Nintendo Switch
    *   Mobile (iOS / Android)

### 6. Release Date
*   **Label:** Release Date
*   **Internal Key:** `releaseDate`
*   **Type:** Date Picker
*   **Required:** No (Optional)
*   **Format:** `YYYY-MM-DD` (ISO 8601 string expected by backend)

### 7. Cover Image
*   **Label:** Cover Image
*   **Internal Key (Form Data):** `file`
*   **Type:** File Upload (Input Type="file")
*   **Required:** No (Optional)
*   **Validation:**
    *   Accepted formats: JPG, JPEG, PNG, GIF.
    *   The backend will save the file and automatically populate the `coverImageUrl` field.

### 8. Is Active
*   **Label:** Active Status
*   **Internal Key:** `isActive`
*   **Type:** Toggle Switch / Checkbox
*   **Required:** No (Defaults to `true`)
*   **Description:** Should this game be visible in the public catalog?

### 9. Metadata (Advanced)
*   **Label:** Extra Metadata
*   **Internal Key:** `metadata`
*   **Type:** Key-Value Pair Editor or JSON Text Area
*   **Required:** No (Defaults to `{}`)
*   **Use Case:** Storing specific game IDs, external links, or custom attributes not covered by standard fields.

---

## API Payload Example

**IMPORTANT:** The request must be `multipart/form-data` to handle the image upload.

### Request Format
*   `Method`: POST / PUT
*   `Content-Type`: `multipart/form-data`

### Form Data Fields
*   `title`: "Valorant"
*   `genre`: "FPS"
*   `description`: "A 5v5 character-based tactical shooter."
*   `file`: [Binary File Data]
*   ... other fields

### JSON Example (Response)
The server will return the created object with the `coverImageUrl` path:

```json
{
  "title": "Valorant",
  "genre": "FPS",
  "description": "A 5v5 character-based tactical shooter.",
  "coverImageUrl": "/uploads/valorant-1234.jpg",
  ...
}
```

## Validation Summary Table

| Field | Type | Required | Default | Notes |
| :--- | :--- | :---: | :---: | :--- |
| `title` | String | ✅ | - | Unique identifier logic may be needed |
| `genre` | String | ✅ | - | |
| `description` | String | ❌ | - | |
| `publisher` | String | ❌ | - | |
| `platforms` | String[] | ❌ | `[]` | Array of strings |
| `releaseDate` | Date | ❌ | - | |
| `file` | File | ❌ | - | Upload path -> `coverImageUrl` |
| `isActive` | Boolean | ❌ | `true` | |
| `metadata` | Object | ❌ | `{}` | Flexible JSON object |

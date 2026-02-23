# User Management & Utility Features

> **Last Updated:** 2026-01-04
> **Feature:** User Profiles, Search, File Uploads
> **Components:** API, Cloud/Local Storage
> **Status:** Implemented

This document details the features related to user account management (profiles, search) and system utilities like file uploads.

## User Management

### Overview

Users can manage their personal profile information and search for other users to connect with.

### API Endpoints

Base Route: `/api/v1/users`

| No | Endpoint | Method | Description | Request | Response | Errors |
|----|----------|--------|-------------|---------|----------|--------|
| 1 | `/profile` | `GET` | Get current user profile | None | `{ success: true, data: user }` | `500` Failure |
| 2 | `/profile` | `PUT` | Update current user profile | `{ username?, email?, currentPassword?, newPassword? }` | `{ success: true, data: user }` | `400` Passwords conflict, `500` Failure |
| 3 | `/search` | `GET` | Search users by username | Query: `username` | `[{ id, username, email, avatar }]` | `400` Missing query, `500` Failure |

### Code Examples

#### Updating Profile

```typescript
// Frontend: Update Profile
const updateProfile = async (data) => {
  const response = await fetch('/api/v1/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
  });
  return response.json();
}
```

---

## File Uploads

### Overview

The system supports uploading files (images, documents) which are then served via a public URL. This is primarily used for message attachments and user avatars.

### API Endpoints

Base Route: `/api/v1/uploads`

| No | Endpoint | Method | Description | Request | Response | Errors |
|----|----------|--------|-------------|---------|----------|--------|
| 1 | `/` | `POST` | Upload a single file | Multipart: `file` | `{ success: true, data: { url, fileName, mimeType, size } }` | `400` Invalid file, `500` Failure |

### Code Examples

#### Uploading a File

```typescript
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/v1/uploads', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  return response.json();
};
```

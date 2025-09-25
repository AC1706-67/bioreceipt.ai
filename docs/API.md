# BioPulse.AI API Documentation

## Overview

BioPulse.AI provides a comprehensive REST API for health tracking, AI-powered insights, and data management. The API is built on Supabase and follows RESTful principles with GraphQL support for complex queries.

## Base URL

```
Production: https://api.biopulse.ai/v1
Staging: https://staging-api.biopulse.ai/v1
Development: http://localhost:3000/v1
```

## Authentication

### JWT Bearer Token
```http
Authorization: Bearer <your_jwt_token>
```

### API Key (for server-to-server)
```http
X-API-Key: <your_api_key>
```

## Rate Limiting

- **Standard Users**: 1000 requests/hour
- **Premium Users**: 5000 requests/hour
- **Enterprise**: Custom limits

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Endpoints

### Authentication

#### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "profile": {...}
  }
}
```

#### POST /auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "profile": {
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1990-01-01"
  }
}
```

#### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### User Profile

#### GET /users/profile
Get current user profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "profile": {
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1990-01-01",
    "preferences": {...},
    "settings": {...}
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### PUT /users/profile
Update user profile.

**Request:**
```json
{
  "profile": {
    "first_name": "Jane",
    "preferences": {
      "notifications": true,
      "theme": "dark"
    }
  }
}
```

### Substance Tracking

#### GET /substances
Get list of available substances.

**Query Parameters:**
- `category` (string): Filter by category
- `search` (string): Search by name
- `limit` (number): Limit results (default: 50)
- `offset` (number): Offset for pagination

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Caffeine",
      "category": "stimulant",
      "unit": "mg",
      "description": "...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

#### POST /substances
Create custom substance.

**Request:**
```json
{
  "name": "Custom Supplement",
  "category": "supplement",
  "unit": "capsules",
  "description": "My custom supplement"
}
```

#### GET /substances/{id}
Get specific substance details.

#### PUT /substances/{id}
Update custom substance (only user-created substances).

#### DELETE /substances/{id}
Delete custom substance (only user-created substances).

### Intake Logging

#### GET /intakes
Get user's intake history.

**Query Parameters:**
- `start_date` (ISO date): Filter from date
- `end_date` (ISO date): Filter to date
- `substance_id` (uuid): Filter by substance
- `limit` (number): Limit results
- `offset` (number): Offset for pagination

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "substance_id": "uuid",
      "substance": {
        "name": "Caffeine",
        "unit": "mg"
      },
      "quantity": 100,
      "timestamp": "2024-01-01T08:00:00Z",
      "notes": "Morning coffee",
      "photos": ["uuid1", "uuid2"],
      "created_at": "2024-01-01T08:00:00Z"
    }
  ],
  "pagination": {...}
}
```

#### POST /intakes
Log new substance intake.

**Request:**
```json
{
  "substance_id": "uuid",
  "quantity": 100,
  "timestamp": "2024-01-01T08:00:00Z",
  "notes": "Morning coffee",
  "photo_ids": ["uuid1", "uuid2"]
}
```

#### GET /intakes/{id}
Get specific intake record.

#### PUT /intakes/{id}
Update intake record.

#### DELETE /intakes/{id}
Delete intake record.

### Photo Management

#### GET /photos
Get user's photos.

**Query Parameters:**
- `intake_id` (uuid): Filter by intake
- `start_date` (ISO date): Filter from date
- `end_date` (ISO date): Filter to date
- `limit` (number): Limit results
- `offset` (number): Offset for pagination

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "filename": "photo_123.jpg",
      "url": "https://storage.biopulse.ai/photos/uuid.jpg",
      "thumbnail_url": "https://storage.biopulse.ai/thumbnails/uuid.jpg",
      "size": 1024000,
      "mime_type": "image/jpeg",
      "metadata": {
        "width": 1920,
        "height": 1080,
        "location": {...}
      },
      "intake_id": "uuid",
      "created_at": "2024-01-01T08:00:00Z"
    }
  ],
  "pagination": {...}
}
```

#### POST /photos
Upload new photo.

**Request:** (multipart/form-data)
```
file: <binary_data>
intake_id: uuid (optional)
description: string (optional)
```

**Response:**
```json
{
  "id": "uuid",
  "filename": "photo_123.jpg",
  "url": "https://storage.biopulse.ai/photos/uuid.jpg",
  "thumbnail_url": "https://storage.biopulse.ai/thumbnails/uuid.jpg",
  "size": 1024000,
  "created_at": "2024-01-01T08:00:00Z"
}
```

#### GET /photos/{id}
Get specific photo details.

#### DELETE /photos/{id}
Delete photo.

### AI Insights

#### POST /ai/insights
Get AI-powered health insights.

**Request:**
```json
{
  "type": "daily_summary",
  "date_range": {
    "start": "2024-01-01",
    "end": "2024-01-07"
  },
  "include_recommendations": true
}
```

**Response:**
```json
{
  "insights": [
    {
      "type": "pattern",
      "title": "Caffeine Consumption Pattern",
      "description": "You tend to consume more caffeine on weekdays...",
      "confidence": 0.85,
      "recommendations": [
        "Consider reducing weekend caffeine intake..."
      ]
    }
  ],
  "summary": {
    "total_intakes": 42,
    "unique_substances": 8,
    "trends": {...}
  },
  "generated_at": "2024-01-01T12:00:00Z"
}
```

#### POST /ai/recommendations
Get personalized recommendations.

**Request:**
```json
{
  "context": "morning_routine",
  "preferences": {
    "focus_areas": ["energy", "focus"],
    "restrictions": ["no_stimulants_after_2pm"]
  }
}
```

#### POST /ai/analyze-photo
Analyze photo for substance identification.

**Request:** (multipart/form-data)
```
file: <binary_data>
context: string (optional)
```

**Response:**
```json
{
  "identified_substances": [
    {
      "name": "Coffee",
      "confidence": 0.92,
      "estimated_quantity": "8 oz",
      "suggestions": [...]
    }
  ],
  "analysis_id": "uuid",
  "processed_at": "2024-01-01T12:00:00Z"
}
```

### Analytics

#### GET /analytics/dashboard
Get dashboard analytics.

**Query Parameters:**
- `period` (string): day, week, month, year
- `start_date` (ISO date): Custom start date
- `end_date` (ISO date): Custom end date

**Response:**
```json
{
  "period": "week",
  "date_range": {
    "start": "2024-01-01",
    "end": "2024-01-07"
  },
  "metrics": {
    "total_intakes": 42,
    "unique_substances": 8,
    "average_daily_intakes": 6,
    "most_common_substance": "Caffeine"
  },
  "trends": [
    {
      "date": "2024-01-01",
      "intake_count": 5,
      "substances": ["Caffeine", "Vitamin D"]
    }
  ],
  "insights": [...]
}
```

#### GET /analytics/trends
Get trend analysis.

#### GET /analytics/patterns
Get pattern analysis.

### Social Features

#### GET /social/feed
Get social feed.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "username": "healthyuser",
        "avatar_url": "..."
      },
      "type": "achievement",
      "content": {
        "title": "7-day streak!",
        "description": "Consistent tracking for a week",
        "achievement_type": "streak"
      },
      "likes_count": 12,
      "comments_count": 3,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {...}
}
```

#### POST /social/share
Share achievement or insight.

**Request:**
```json
{
  "type": "achievement",
  "content": {
    "achievement_type": "streak",
    "days": 7
  },
  "privacy": "public"
}
```

### Health Integration

#### GET /health/wearables
Get connected wearable devices.

#### POST /health/wearables/sync
Sync data from wearable devices.

#### GET /health/biometrics
Get biometric data.

**Response:**
```json
{
  "data": [
    {
      "type": "heart_rate",
      "value": 72,
      "unit": "bpm",
      "timestamp": "2024-01-01T12:00:00Z",
      "source": "apple_health"
    }
  ]
}
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "request_id": "uuid"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or expired token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Invalid input data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## SDKs and Libraries

### JavaScript/TypeScript
```bash
npm install @biopulse/api-client
```

```typescript
import { BioPulseClient } from '@biopulse/api-client';

const client = new BioPulseClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.biopulse.ai/v1'
});

const intakes = await client.intakes.list({
  start_date: '2024-01-01',
  limit: 10
});
```

### Python
```bash
pip install biopulse-api
```

```python
from biopulse import BioPulseClient

client = BioPulseClient(api_key='your-api-key')
intakes = client.intakes.list(start_date='2024-01-01', limit=10)
```

## Webhooks

### Configuration
Configure webhooks in your dashboard to receive real-time notifications.

### Events
- `intake.created`
- `intake.updated`
- `intake.deleted`
- `photo.uploaded`
- `insight.generated`
- `user.updated`

### Webhook Payload
```json
{
  "event": "intake.created",
  "data": {
    "id": "uuid",
    "substance_id": "uuid",
    "quantity": 100,
    "timestamp": "2024-01-01T08:00:00Z"
  },
  "timestamp": "2024-01-01T08:00:00Z",
  "signature": "sha256=..."
}
```

## GraphQL API

### Endpoint
```
POST /graphql
```

### Example Query
```graphql
query GetUserIntakes($startDate: DateTime!, $limit: Int!) {
  intakes(startDate: $startDate, limit: $limit) {
    id
    quantity
    timestamp
    substance {
      name
      unit
      category
    }
    photos {
      id
      url
      thumbnailUrl
    }
  }
}
```

## Testing

### Sandbox Environment
Use the sandbox environment for testing:
```
Base URL: https://sandbox-api.biopulse.ai/v1
```

### Test Data
The sandbox includes sample data for testing all endpoints.

### Postman Collection
Download our Postman collection: [BioPulse API Collection](https://api.biopulse.ai/postman)

## Support

- **Documentation**: [docs.biopulse.ai](https://docs.biopulse.ai)
- **API Status**: [status.biopulse.ai](https://status.biopulse.ai)
- **Support**: api-support@biopulse.ai
- **Discord**: [BioPulse Developer Community](https://discord.gg/biopulse)
# Suggested Competitors API - Frontend Integration Guide

## Overview

This document provides API endpoints and integration details for the frontend to fetch and display suggested competitors for a hotel. The system automatically detects and suggests competitor hotels based on location and rating similarity after user registration.

## Base URL

**Through API Gateway (Recommended):**
```
http://localhost:3000/api/v1
```

**Direct Auth Service (Alternative):**
```
http://localhost:3001/v1
```

> **Note:** The API Gateway runs on port 3000 and routes requests to the Auth Service on port 3001. For production, use your configured API Gateway URL.

---

## API Endpoint

### Get Suggested Competitors

Fetch the list of suggested competitor hotels for the authenticated user's hotel.

**Endpoint:** `GET /hotels/:hotelId/suggested-competitors`

**Authentication:** Required (Bearer Token)

**Request:**
```http
GET /api/v1/hotels/{hotelId}/suggested-competitors
Authorization: Bearer <access_token>
```

**Example:**
```http
GET http://localhost:3000/api/v1/hotels/hotel_abc123/suggested-competitors
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Path Parameters:**
- `hotelId` (required): The hotel ID for which to fetch suggested competitors

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "hotelId": "hotel_abc123",
      "name": "Grand Hotel Downtown",
      "address": "123 Main Street, New York, NY 10001",
      "phone": "+1-212-555-1234",
      "city": "New York",
      "zipCode": "10001",
      "gpsLatitude": 40.7128,
      "gpsLongitude": -74.0060,
      "hotelClass": 4,
      "overallRating": 4.2,
      "reviewsCount": 1250,
      "reviewTags": "Great location, Clean rooms",
      "checkInTime": "3:00 PM",
      "checkOutTime": "11:00 AM",
      "nearbyPlaces": {
        "restaurants": [...],
        "attractions": [...]
      },
      "amenitiesJson": {
        "wifi": true,
        "pool": true,
        "parking": true
      },
      "competitors": [],
      "suggestedCompetitors": ["hotel_xyz789", "hotel_def456"]
    },
    {
      "hotelId": "hotel_xyz789",
      "name": "Luxury Suites Hotel",
      "address": "456 Park Avenue, New York, NY 10002",
      "phone": "+1-212-555-5678",
      "city": "New York",
      "zipCode": "10002",
      "gpsLatitude": 40.7580,
      "gpsLongitude": -73.9855,
      "hotelClass": 4,
      "overallRating": 4.3,
      "reviewsCount": 980,
      "reviewTags": "Excellent service, Modern amenities",
      "checkInTime": "4:00 PM",
      "checkOutTime": "12:00 PM",
      "nearbyPlaces": null,
      "amenitiesJson": null,
      "competitors": [],
      "suggestedCompetitors": []
    }
  ],
  "count": 2
}
```

**Response Fields:**
- `success` (boolean): Indicates if the request was successful
- `data` (array): Array of competitor hotel objects with full details
- `count` (number): Number of competitors returned

**Competitor Hotel Object Fields:**
- `hotelId` (string): Unique hotel identifier
- `name` (string): Hotel name
- `address` (string): Full address
- `phone` (string): Contact phone number
- `city` (string): City name
- `zipCode` (string): ZIP/postal code
- `gpsLatitude` (number): GPS latitude coordinate
- `gpsLongitude` (number): GPS longitude coordinate
- `hotelClass` (number): Star rating (1-5)
- `overallRating` (number): Overall review rating
- `reviewsCount` (number): Number of reviews
- `reviewTags` (string): Review tags/comments
- `checkInTime` (string): Check-in time
- `checkOutTime` (string): Check-out time
- `nearbyPlaces` (object): Nearby places information (JSONB)
- `amenitiesJson` (object): Amenities information (JSONB)
- `competitors` (array): Array of accepted competitor hotel IDs (initially empty)
- `suggestedCompetitors` (array): Array of suggested competitor hotel IDs

**Error Responses:**

**400 Bad Request:**
```json
{
  "error": "Hotel ID is required",
  "code": "MISSING_HOTEL_ID"
}
```

**401 Unauthorized:**
```json
{
  "error": "Access token required"
}
```
or
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**403 Forbidden:**
```json
{
  "error": "Access denied: You can only view suggested competitors for your own hotel",
  "code": "ACCESS_DENIED"
}
```

**404 Not Found:**
```json
{
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```
or
```json
{
  "error": "Hotel not found",
  "code": "HOTEL_NOT_FOUND"
}
```

**503 Service Unavailable:**
```json
{
  "error": "Database not initialized",
  "code": "DB_NOT_INITIALIZED"
}
```
or
```json
{
  "error": "Database connection failed",
  "code": "DB_CONNECTION_ERROR"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "message": "Error details"
}
```

---

## How It Works

### Competitor Detection Flow

1. **User Registration**: When a user registers and selects a hotel, the system automatically triggers competitor detection in the background.

2. **Competitor Search**: The system searches for hotels in the same location (city/state) using SERP API.

3. **Filtering**: Competitors are filtered based on:
   - **Rating Range**: If the hotel has a rating, competitors must be in the same rating range (e.g., 3.8 rating → competitors with 3.0-3.9 rating)
   - **Location**: Same city or state
   - **Exclusion**: The registered hotel itself is excluded

4. **Storage**: Up to 5 competitors are stored in the `suggested_competitors` column (initially empty `competitors` column).

5. **API Access**: Frontend can fetch these suggested competitors using the API endpoint.

### Data Structure

- **suggested_competitors**: Array of competitor hotel IDs (automatically populated after registration)
- **competitors**: Array of accepted competitor hotel IDs (initially empty, populated when user accepts suggestions)

---

## Frontend Integration

### Step-by-Step Implementation

#### 1. Get User's Hotel ID

First, you need to get the user's hotel ID from their profile or registration response:

```javascript
// After login/registration, store hotelId
const user = {
  id: "user-uuid",
  hotelId: "hotel_abc123",
  // ... other user fields
};
```

#### 2. Fetch Suggested Competitors

```javascript
const fetchSuggestedCompetitors = async (hotelId, accessToken) => {
  try {
    const response = await fetch(
      `http://localhost:3000/api/v1/hotels/${hotelId}/suggested-competitors`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch suggested competitors');
    }

    const data = await response.json();
    
    if (data.success) {
      return data.data; // Array of competitor hotel objects
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching suggested competitors:', error);
    throw error;
  }
};
```

#### 3. Display Competitors

```javascript
const displayCompetitors = async () => {
  try {
    const competitors = await fetchSuggestedCompetitors(user.hotelId, accessToken);
    
    if (competitors.length === 0) {
      console.log('No suggested competitors found');
      return;
    }
    
    competitors.forEach(competitor => {
      console.log(`Competitor: ${competitor.name}`);
      console.log(`Rating: ${competitor.overallRating}`);
      console.log(`Address: ${competitor.address}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## Example Frontend Implementation (React)

```jsx
import React, { useState, useEffect } from 'react';

function SuggestedCompetitors({ hotelId, accessToken }) {
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hotelId && accessToken) {
      fetchCompetitors();
    }
  }, [hotelId, accessToken]);

  const fetchCompetitors = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/hotels/${hotelId}/suggested-competitors`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch competitors');
      }

      const data = await response.json();
      
      if (data.success) {
        setCompetitors(data.data);
      } else {
        setCompetitors([]);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching competitors:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading suggested competitors...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (competitors.length === 0) {
    return (
      <div className="no-competitors">
        <p>No suggested competitors found.</p>
        <p className="hint">Competitors are automatically detected after hotel registration.</p>
      </div>
    );
  }

  return (
    <div className="suggested-competitors">
      <h2>Suggested Competitors ({competitors.length})</h2>
      <div className="competitors-list">
        {competitors.map((competitor) => (
          <div key={competitor.hotelId} className="competitor-card">
            <h3>{competitor.name}</h3>
            <div className="competitor-info">
              <p><strong>Rating:</strong> {competitor.overallRating || 'N/A'}</p>
              <p><strong>Class:</strong> {competitor.hotelClass ? '⭐'.repeat(competitor.hotelClass) : 'N/A'}</p>
              <p><strong>Reviews:</strong> {competitor.reviewsCount || 0}</p>
              <p><strong>Address:</strong> {competitor.address || 'N/A'}</p>
              {competitor.phone && (
                <p><strong>Phone:</strong> {competitor.phone}</p>
              )}
              {competitor.city && (
                <p><strong>City:</strong> {competitor.city}</p>
              )}
            </div>
            {competitor.reviewTags && (
              <div className="review-tags">
                <p><strong>Tags:</strong> {competitor.reviewTags}</p>
              </div>
            )}
            {competitor.checkInTime && competitor.checkOutTime && (
              <div className="check-times">
                <p><strong>Check-in:</strong> {competitor.checkInTime}</p>
                <p><strong>Check-out:</strong> {competitor.checkOutTime}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SuggestedCompetitors;
```

### Usage Example

```jsx
import SuggestedCompetitors from './SuggestedCompetitors';

function HotelDashboard({ user, accessToken }) {
  return (
    <div>
      <h1>Hotel Dashboard</h1>
      {user.hotelId && (
        <SuggestedCompetitors 
          hotelId={user.hotelId} 
          accessToken={accessToken} 
        />
      )}
    </div>
  );
}
```

---

## Error Handling

### Common Error Scenarios

1. **No Competitors Found**
   - This is normal if competitors haven't been detected yet
   - Competitors are detected asynchronously after registration
   - Show a friendly message: "No suggested competitors yet. They will appear after competitor detection completes."

2. **Access Denied**
   - User is trying to access competitors for a hotel they don't own
   - Ensure the `hotelId` matches the user's `hotelId` from their profile

3. **Authentication Errors**
   - Token expired: Refresh the access token using the refresh token endpoint
   - Invalid token: Redirect to login

4. **Network Errors**
   - Implement retry logic for transient failures
   - Show user-friendly error messages

### Error Handling Example

```javascript
const handleCompetitorFetch = async () => {
  try {
    const competitors = await fetchSuggestedCompetitors(hotelId, accessToken);
    return competitors;
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expired, refresh it
      await refreshAccessToken();
      // Retry the request
      return await fetchSuggestedCompetitors(hotelId, newAccessToken);
    } else if (error.response?.status === 403) {
      // Access denied - user doesn't own this hotel
      showError('You can only view competitors for your own hotel');
    } else if (error.response?.status === 404) {
      // Hotel not found
      showError('Hotel not found');
    } else {
      // Generic error
      showError('Failed to load competitors. Please try again later.');
    }
    return [];
  }
};
```

---

## Best Practices

1. **Caching**: Consider caching competitor data since it doesn't change frequently
2. **Loading States**: Always show loading indicators while fetching
3. **Empty States**: Provide helpful messages when no competitors are found
4. **Error Recovery**: Implement retry logic for failed requests
5. **Token Management**: Handle token expiration gracefully
6. **Performance**: If displaying many competitors, consider pagination or lazy loading

---

## Notes

1. **Competitor Detection Timing**: Competitors are detected asynchronously after registration. It may take a few seconds to minutes for competitors to appear.

2. **Competitor Limit**: The system stores up to 5 suggested competitors per hotel.

3. **Rating Filtering**: If a hotel has no rating, all hotels from the location search are included (up to the limit).

4. **Location Priority**: The system prefers city over state for location matching.

5. **Future Enhancements**: 
   - Accept/reject competitors (moves from `suggested_competitors` to `competitors`)
   - Manual competitor addition
   - Competitor refresh/update
   - Competitor analytics

---

## Support

For issues or questions, contact the backend team.


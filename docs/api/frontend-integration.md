# Hotel Search API - Frontend Integration Guide

## Overview

This document provides API endpoints and integration details for the frontend to implement hotel search functionality using SerpAPI. The service provides country and state selection, and hotel search with rates.

## Base URL

```
http://localhost:3000/api/v1/hotel-info
```

(Replace with your actual API Gateway URL in production)

---

## API Endpoints

### 1. Get All Countries

Get a list of all available countries.

**Endpoint:** `GET /countries`

**Request:**
```http
GET /api/v1/hotel-info/countries
```

**Response:**
```json
{
  "success": true,
  "count": 210,
  "data": [
    {
      "id": 1,
      "name": "United States",
      "code": "US"
    },
    {
      "id": 2,
      "name": "United Kingdom",
      "code": "GB"
    },
    {
      "id": 3,
      "name": "India",
      "code": "IN"
    }
  ]
}
```

**Response Fields:**
- `id` (number): Unique identifier for the country
- `name` (string): Country name
- `code` (string): Country code (ISO format)

**Error Response:**
```json
{
  "error": "Failed to fetch countries",
  "message": "Error details"
}
```

---

### 2. Get States by Country

Get a list of states/destination groups for a selected country.

**Endpoint:** `GET /states`

**Request:**
```http
GET /api/v1/hotel-info/states?countryCode=US
```

**Query Parameters:**
- `countryCode` (required): Country code selected from step 1

**Response:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id": 101,
      "name": "California",
      "code": "CA"
    },
    {
      "id": 102,
      "name": "New York",
      "code": "NY"
    },
    {
      "id": 103,
      "name": "Texas",
      "code": "TX"
    }
  ]
}
```

**Response Fields:**
- `id` (number): Unique identifier for the state
- `name` (string): State name

**Note:** State code is no longer returned. Only state name is used for hotel search.

**Error Response:**
```json
{
  "error": "Validation failed",
  "details": ["Query parameter \"countryCode\" is required"]
}
```

---

### 3. Search Hotels

Search for hotels using SerpAPI (Google Hotels) based on hotel name, country, and state.

**Endpoint:** `POST /search-hotel`

**Request:**
```http
POST /api/v1/hotel-info/search-hotel
Content-Type: application/json

{
  "hotelName": "ramada by wyndham",
  "countryCode": "US",
  "stateName": "Wisconsin",
  "checkInDate": "2025-12-11",
  "checkOutDate": "2025-12-12",
  "hl": "en",
  "currency": "USD",
  "adults": 2
}
```

**Request Body Parameters:**
- `hotelName` (required): Hotel name to search for
- `countryCode` (required): Country code from step 1 (e.g., "US")
- `stateName` (required): State name from step 2 (e.g., "Wisconsin")
- `checkInDate` (required): Check-in date in YYYY-MM-DD format
- `checkOutDate` (required): Check-out date in YYYY-MM-DD format
- `hl` (optional): Language code (default: "en")
- `currency` (optional): Currency code (default: "USD")
- `adults` (optional): Number of adults (2-5, default: 2)

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "hotel",
    "name": "Ramada by Wyndham Wisconsin Dells",
    "description": "Hotel description...",
    "link": "https://www.google.com/travel/hotels/...",
    "property_token": "ChIJ...",
    "serpapi_property_details_link": "https://serpapi.com/...",
    "address": "123 Main St, Wisconsin Dells, WI 53965",
    "directions": "https://maps.google.com/...",
    "phone": "+1-608-123-4567",
    "phone_link": "tel:+16081234567",
    "gps_coordinates": {
      "latitude": 43.5771053,
      "longitude": -89.7777298
    },
    "check_in_time": "3:00 PM",
    "check_out_time": "11:00 AM",
    "rate_per_night": { "low": 89, "high": 150 },
    "total_rate": { "low": 89, "high": 150 },
    "typical_price_range": "$89-$150",
    "deal": "Special offer",
    "deal_description": "Save 20% on your stay",
    "featured_prices": [...],
    "prices": [...],
    "nearby_places": [...],
    "hotel_class": "3",
    "extracted_hotel_class": 3,
    "images": [...],
    "overall_rating": 4.2,
    "reviews": 1250,
    "ratings": [...],
    "location_rating": 4.5,
    "reviews_breakdown": [...],
    "other_reviews": [...],
    "amenities": [...],
    "excluded_amenities": [...],
    "amenities_detailed": {...},
    "health_and_safety": {...}
  },
  "savedToDatabase": true,
  "databaseId": "507f1f77bcf86cd799439011",
  "query": {
    "hotelName": "ramada by wyndham",
    "countryCode": "US",
    "stateName": "Wisconsin",
    "checkInDate": "2025-12-11",
    "checkOutDate": "2025-12-12",
    "hl": "en",
    "currency": "USD",
    "adults": 2
  }
}
```

**Note:** If multiple properties are found, `data` will be an array of property objects instead of a single object.

**Error Response:**
```json
{
  "error": "Validation failed",
  "details": ["Query parameter \"countryCodes\" is required"]
}
```

---

### 4. User Registration (with Hotel Selection)

Register a new user account and optionally link it to a hotel from the search results.

**Endpoint:** `POST /register`

**Request:**
```http
POST /api/v1/register
Content-Type: application/json

{
  "name": "John Doe",
  "businessEmail": "john@hotel.com",
  "country": "United States",
  "hotelName": "Ramada by Wyndham Wisconsin Dells",
  "phoneNumber": "+1-608-123-4567",
  "currentPMS": "Opera PMS",
  "businessType": "Independent Hotel",
  "numberOfRooms": 150,
  "password": "securepassword123",
  "selectedHotel": {
    "type": "hotel",
    "name": "Ramada by Wyndham Wisconsin Dells",
    "description": "Hotel description...",
    "property_token": "ChIJ...",
    "address": "123 Main St, Wisconsin Dells, WI 53965",
    "phone": "+1-608-123-4567",
    "gps_coordinates": {
      "latitude": 43.5771053,
      "longitude": -89.7777298
    },
    "hotel_class": "3",
    "overall_rating": 4.2,
    "reviews": 1250,
    "check_in_time": "3:00 PM",
    "check_out_time": "11:00 AM",
    "amenities": [...],
    "images": [...]
  }
}
```

**Request Body Parameters:**
- `name` (required): User's full name
- `businessEmail` (required): Business email address (must be unique)
- `country` (required): Country name
- `hotelName` (required): Hotel name
- `phoneNumber` (required): Contact phone number
- `currentPMS` (required): Current Property Management System
- `businessType` (required): One of: "Independent Hotel", "Chain Hotel", "Hotel Management Company", "OTA's"
- `numberOfRooms` (required): Number of rooms (minimum: 1)
- `password` (required): Password (minimum: 6 characters)
- `selectedHotel` (optional): Complete hotel object from search results. If provided:
  - `gps_coordinates` (required): Must include `latitude` and `longitude` as numbers
  - All other fields are optional but recommended for complete hotel registration

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "businessEmail": "john@hotel.com",
    "country": "United States",
    "hotelName": "Ramada by Wyndham Wisconsin Dells",
    "hotelId": 5,
    "phoneNumber": "+1-608-123-4567",
    "currentPMS": "Opera PMS",
    "businessType": "Independent Hotel",
    "numberOfRooms": 150,
    "createdAt": "2025-01-15T10:30:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Important Notes:**
- If `selectedHotel` is provided, the hotel will be registered in the database (or linked if it already exists)
- The `gps_coordinates.latitude` and `gps_coordinates.longitude` must be valid numbers
- All fields from the hotel search response can be included in `selectedHotel` - they will be stored if provided
- If hotel registration fails, user registration will still proceed (without `hotelId`)

---

## Integration Flow

### Step-by-Step Implementation

1. **Load Countries on Page Load**
   ```javascript
   // Fetch countries when component mounts
   const fetchCountries = async () => {
     const response = await fetch('http://localhost:3000/api/v1/hotel-info/countries');
     const data = await response.json();
     setCountries(data.data); // Array of {id, name, code}
   };
   ```

2. **Handle Country Selection**
   ```javascript
   // When user selects a country
   const handleCountryChange = async (countryCode) => {
     setSelectedCountry(countryCode);
     
     // Fetch states for selected country
     const response = await fetch(
       `http://localhost:3000/api/v1/hotel-info/states?countryCode=${countryCode}`
     );
     const data = await response.json();
     setStates(data.data); // Array of {id, name}
   };
   ```

3. **Handle State Selection**
   ```javascript
   // When user selects a state
   const handleStateChange = async (stateName) => {
     setSelectedState(stateName);
     // State name is stored for hotel search
   };
   ```

4. **Search Hotels**
   ```javascript
   // Search hotels using SerpAPI
   const searchHotels = async (hotelName, countryCode, stateName, checkInDate, checkOutDate) => {
     const response = await fetch(
       'http://localhost:3000/api/v1/hotel-info/search-hotel',
       {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           hotelName,
           countryCode,
           stateName,
           checkInDate,
           checkOutDate,
           hl: 'en',
           currency: 'USD',
           adults: 2
         })
       }
     );
     const data = await response.json();
     if (data.success) {
       // data.data can be a single object or an array of hotel objects
       const hotels = Array.isArray(data.data) ? data.data : [data.data];
       setHotels(hotels);
     }
   };
   ```

5. **Register User with Selected Hotel**
   ```javascript
   // Register user and link to selected hotel
   const registerUser = async (userData, selectedHotel) => {
     const response = await fetch(
       'http://localhost:3000/api/v1/register',
       {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           ...userData,
           selectedHotel: selectedHotel // Include complete hotel object from search
         })
       }
     );
     const data = await response.json();
     if (data.user) {
       // Store tokens
       localStorage.setItem('accessToken', data.tokens.accessToken);
       localStorage.setItem('refreshToken', data.tokens.refreshToken);
       return data;
     }
   };
   ```

---

## Example Frontend Implementation (React)

```jsx
import React, { useState, useEffect } from 'react';

function HotelSearch() {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch countries on mount
  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/v1/hotel-info/countries');
      const data = await response.json();
      if (data.success) {
        setCountries(data.data);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const handleCountryChange = async (e) => {
    const countryCode = e.target.value;
    setSelectedCountry(countryCode);
    setSelectedState('');
    setStates([]);
    setHotels([]);

    if (countryCode) {
      try {
        const response = await fetch(
          `http://localhost:3000/api/v1/hotel-info/states?countryCode=${countryCode}`
        );
        const data = await response.json();
        if (data.success) {
          setStates(data.data);
        }
      } catch (error) {
        console.error('Error fetching states:', error);
      }
    }
  };

  const handleStateChange = async (e) => {
    const stateCode = e.target.value;
    setSelectedState(stateCode);
    setSelectedCity('');
    setCities([]);
    setHotels([]);

    if (stateCode && selectedCountry) {
      try {
        const response = await fetch(
          `http://localhost:3000/api/v1/hotel-info/cities?countryCodes=${selectedCountry}&destinationGroupCodes=${stateCode}`
        );
        const data = await response.json();
        if (data.success) {
          setCities(data.data);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
    }
  };

  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
    setHotels([]);
  };

  const handleSearch = async () => {
    if (!selectedCountry || !selectedState || !hotelName.trim()) {
      alert('Please select country, state, and enter hotel name');
      return;
    }

    if (!checkInDate || !checkOutDate) {
      alert('Please select check-in and check-out dates');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        'http://localhost:3000/api/v1/hotel-info/search-hotel',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hotelName: hotelName.trim(),
            countryCode: selectedCountry,
            stateName: selectedState,
            checkInDate,
            checkOutDate,
            hl: 'en',
            currency: 'USD',
            adults: 2
          })
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setHotels(data.data);
      }
    } catch (error) {
      console.error('Error searching hotels:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hotel-search">
      <h1>Hotel Search</h1>
      
      {/* Country Selection */}
      <div>
        <label>Select Country:</label>
        <select value={selectedCountry} onChange={handleCountryChange}>
          <option value="">-- Select Country --</option>
          {countries.map((country) => (
            <option key={country.id} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {/* State Selection */}
      {states.length > 0 && (
        <div>
          <label>Select State:</label>
          <select value={selectedState} onChange={handleStateChange}>
            <option value="">-- Select State --</option>
            {states.map((state) => (
              <option key={state.id} value={state.name}>
                {state.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Hotel Name */}
      <div>
        <label>Hotel Name:</label>
        <input
          type="text"
          value={hotelName}
          onChange={(e) => setHotelName(e.target.value)}
          placeholder="Enter hotel name"
        />
      </div>

      {/* Check-in Date */}
      <div>
        <label>Check-in Date:</label>
        <input
          type="date"
          value={checkInDate}
          onChange={(e) => setCheckInDate(e.target.value)}
        />
      </div>

      {/* Check-out Date */}
      <div>
        <label>Check-out Date:</label>
        <input
          type="date"
          value={checkOutDate}
          onChange={(e) => setCheckOutDate(e.target.value)}
        />
      </div>

      {/* Hotel Name Search (Optional) */}
      {selectedState && (
        <div>
          <label>Hotel Name (Optional):</label>
          <input
            type="text"
            value={hotelName}
            onChange={(e) => setHotelName(e.target.value)}
            placeholder="Enter hotel name..."
          />
        </div>
      )}

      {/* Search Button */}
      {selectedCountry && selectedState && (
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search Hotels'}
        </button>
      )}

      {/* Hotels Results */}
      {hotels.length > 0 && (
        <div className="hotels-results">
          <h2>Search Results ({hotels.length} hotels found)</h2>
          {hotels.map((hotel) => (
            <div key={hotel.code} className="hotel-card">
              <h3>{hotel.name}</h3>
              <p>Code: {hotel.code}</p>
              {hotel.address && <p>Address: {hotel.address}</p>}
              {hotel.category && <p>Category: {hotel.category.name}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HotelSearch;
```

---

## Error Handling

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": ["Error message"]
}
```

**500 Internal Server Error:**
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Best Practices:**
- Always check `success` field in response
- Handle network errors with try-catch
- Show user-friendly error messages
- Implement loading states for better UX

---

## Notes

1. **Country Code**: Use the `code` field (not `id`) when making subsequent API calls
2. **State Code**: Use the `code` field (not `id`) when searching for hotels or cities
3. **City Code**: Use the `code` field (not `id`) when searching for hotels
4. **Hotel Search**: 
   - `destinationGroupCodes` parameter uses the state `code`, not `id`
   - `cityCodes` parameter uses the city `code`, not `id`
5. **Optional Parameters**: 
   - City selection is optional - you can search hotels without selecting a city
   - Hotel name is optional - you can search without it
6. **Caching**: Consider caching countries, states, and cities data as they don't change frequently

---

## Support

For issues or questions, contact the backend team.


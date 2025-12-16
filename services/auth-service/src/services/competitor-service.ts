import { searchHotelsByLocation } from '../../../serpapi-service/src/collectors/serpapi-collector';
import { HotelRepository } from '../repositories/hotel-repository';
import { mapSerpApiToHotel, generateHotelId } from '../../../serpapi-service/src/utils/hotel-mapper';
import { formatDate } from '../../../serpapi-service/src/utils/formatters';

const hotelRepository = new HotelRepository();

/**
 * Extract numeric rating from SERP API property
 */
function extractRating(property: any): number | null {
  if (property.overall_rating !== undefined && property.overall_rating !== null) {
    const rating = typeof property.overall_rating === 'number' 
      ? property.overall_rating 
      : property.overall_rating?.float || property.overall_rating?.int || null;
    return rating;
  }
  return null;
}

/**
 * Find competitors for a hotel
 * Searches for hotels in the same location and filters by rating range
 */
export async function findCompetitors(
  hotelId: string,
  hotelRating: number | null,
  city?: string,
  state?: string,
  countryCode?: string
): Promise<string[]> {
  // Determine location (prefer city, fallback to state)
  const location = city || state;
  
  if (!location || !countryCode) {
    console.log('Cannot find competitors: missing location or country code');
    return [];
  }

  // Use default dates (today + 7 days)
  const checkInDate = new Date();
  checkInDate.setDate(checkInDate.getDate() + 1);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + 7);

  const formattedCheckIn = formatDate(checkInDate.toISOString().split('T')[0]);
  const formattedCheckOut = formatDate(checkOutDate.toISOString().split('T')[0]);

  try {
    // Search for hotels in the location
    const searchResults = await searchHotelsByLocation({
      location,
      countryCode,
      checkInDate: formattedCheckIn,
      checkOutDate: formattedCheckOut,
      hl: 'en',
      currency: 'USD',
      adults: 2,
    });

    // Extract properties array from response
    const properties = (searchResults as any)?.properties;
    if (!properties || !Array.isArray(properties) || properties.length === 0) {
      console.log(`No hotels found in ${location}`);
      return [];
    }

    // Filter competitors based on rating range if hotel has rating
    let filteredProperties = properties;
    
    if (hotelRating !== null && hotelRating !== undefined) {
      const minRating = Math.floor(hotelRating);
      const maxRating = Math.ceil(hotelRating);
      
      filteredProperties = properties.filter((property: any) => {
        const competitorRating = extractRating(property);
        if (competitorRating === null) {
          return false; // Exclude hotels without ratings when filtering by rating
        }
        return competitorRating >= minRating && competitorRating < maxRating;
      });
    }

    // Exclude the registered hotel itself
    const registeredHotel = await hotelRepository.findByHotelId(hotelId);
    if (registeredHotel) {
      filteredProperties = filteredProperties.filter((property: any) => {
        // Generate hotel_id for this property
        const propertyHotelId = generateHotelId(
          property.name,
          property.gps_coordinates?.latitude,
          property.gps_coordinates?.longitude
        );
        return propertyHotelId !== hotelId;
      });
    }

    // Limit to top 5 competitors
    const limitedProperties = filteredProperties.slice(0, 5);

    // Process each competitor: create/update hotel and collect hotel_ids
    const competitorIds: string[] = [];

    for (const property of limitedProperties) {
      try {
        // Generate hotel_id
        const competitorHotelId = generateHotelId(
          property.name,
          property.gps_coordinates?.latitude,
          property.gps_coordinates?.longitude
        );

        // Check if hotel already exists
        const existingHotel = await hotelRepository.findByHotelId(competitorHotelId);
        
        if (existingHotel) {
          // Use existing hotel_id
          competitorIds.push(competitorHotelId);
        } else {
          // Create new hotel from SERP API data
          const hotelInsertData = mapSerpApiToHotel(property);
          
          await hotelRepository.create({
            name: hotelInsertData.hotel_name || property.name || '',
            serpApiData: property,
            existingHotelId: competitorHotelId,
          });
          
          competitorIds.push(competitorHotelId);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`Failed to process competitor hotel: ${errorMessage}`);
        // Continue with next competitor
      }
    }

    return competitorIds;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`Failed to find competitors: ${errorMessage}`);
    return [];
  }
}

/**
 * Store suggested competitors for a hotel
 * Competitors are stored in suggested_competitors initially
 */
export async function storeCompetitors(hotelId: string, competitorIds: string[]): Promise<void> {
  try {
    await hotelRepository.updateSuggestedCompetitors(hotelId, competitorIds);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to store suggested competitors: ${errorMessage}`);
  }
}


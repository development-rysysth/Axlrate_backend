import { fetchHotels } from './serpapi-client';
import { CityRepository } from '../repositories/city-repository';
import { HotelRepository } from '../repositories/hotel-repository';
import { generateHotelKey } from '../utils/hotel-key-generator';
import { mapSerpApiToHotel } from '../utils/field-mapper';

export class HotelIngestionService {
  private cityRepository: CityRepository;
  private hotelRepository: HotelRepository;

  constructor() {
    this.cityRepository = new CityRepository();
    this.hotelRepository = new HotelRepository();
  }

  /**
   * Ingest hotels for a specific city
   * Fetches hotels from SerpAPI with pagination and stores them in database
   * 
   * @param cityName - Name of the city to ingest hotels for
   */
  async ingestHotelsForCity(cityName: string): Promise<void> {
    try {
      // Step 1: Fetch city data from database
      const cityData = await this.cityRepository.getCityByName(cityName);

      if (!cityData) {
        throw new Error(`City "${cityName}" not found in database`);
      }

      // Step 2: Initialize pagination
      let nextToken: string | null = null;
      let nextUrl: string | null = null;
      const seenTokens = new Set<string>();
      const seenUrls = new Set<string>();
      let totalHotelsStored = 0;
      let pageNumber = 1;

      // Step 3: Loop until no next page
      do {
        try {
          console.log(`[hotel-ingestion-service] Fetching page ${pageNumber}...`);

          // Fetch hotels from SerpAPI - prefer nextUrl if available
          const { hotels, nextToken: newToken, nextUrl: newUrl } = await fetchHotels(
            cityData.city,
            cityData.state,
            nextToken,
            nextUrl
          );

          console.log(`[hotel-ingestion-service] Page ${pageNumber}: Received ${hotels.length} hotels`);

          // Process each hotel
          let hotelsStoredThisPage = 0;
          for (const hotel of hotels) {
            try {
              // Generate hotel_key
              const lat = hotel.gps_coordinates?.latitude ?? null;
              const lng = hotel.gps_coordinates?.longitude ?? null;
              const hotelKey = generateHotelKey(hotel.name, lat, lng);

              // Map fields
              const hotelData = mapSerpApiToHotel(
                hotel,
                cityData.country,
                cityData.state,
                cityData.city,
                hotelKey
              );

              // Upsert to database
              await this.hotelRepository.upsertHotel(hotelData);
              hotelsStoredThisPage++;
              totalHotelsStored++;
            } catch (error) {
              // Continue with next hotel even if one fails
            }
          }

          console.log(`[hotel-ingestion-service] Page ${pageNumber}: Stored ${hotelsStoredThisPage} hotels in DB`);

          // Check for next page - prefer nextUrl, fallback to nextToken
          // Even if we got 0 hotels, if there's a next page indicator, continue fetching
          if (newUrl) {
            // Use next URL if available (preferred method)
            if (seenUrls.has(newUrl)) {
              console.log(`[hotel-ingestion-service] Duplicate URL detected - stopping pagination`);
              break;
            }
            seenUrls.add(newUrl);
            nextUrl = newUrl;
            nextToken = null; // Clear token when using URL
            pageNumber++;
          } else if (newToken) {
            // Fallback to next_page_token if URL not available
            if (seenTokens.has(newToken)) {
              console.log(`[hotel-ingestion-service] Duplicate token detected - stopping pagination`);
              break;
            }
            seenTokens.add(newToken);
            nextToken = newToken;
            nextUrl = null; // Clear URL when using token
            pageNumber++;
          } else {
            // No next page indicator - pagination complete
            console.log(`[hotel-ingestion-service] No next page - pagination complete`);
            break;
          }

          // Wait 3s for rate limiting before fetching next page
          await new Promise((resolve) => setTimeout(resolve, 3000));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isNoResultsError = errorMessage.toLowerCase().includes('hasn\'t returned any results') ||
                                   errorMessage.toLowerCase().includes('no results') ||
                                   errorMessage.toLowerCase().includes('no hotels found');
          
          // If it's a "no results" error, treat it as end of pagination
          if (isNoResultsError) {
            break;
          }
          
          // Retry logic (max 3 attempts) - only for non-"no results" errors
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount < maxRetries) {
            retryCount++;
            
            try {
              await new Promise((resolve) => setTimeout(resolve, 2000 * retryCount)); // Exponential backoff
              
              const { hotels, nextToken: newToken, nextUrl: newUrl } = await fetchHotels(
                cityData.city,
                cityData.state,
                nextToken,
                nextUrl
              );

              console.log(`[hotel-ingestion-service] Page ${pageNumber}: Received ${hotels.length} hotels (retry)`);
              
              // Process hotels from retry
              let hotelsStoredThisPage = 0;
              for (const hotel of hotels) {
                try {
                  const lat = hotel.gps_coordinates?.latitude ?? null;
                  const lng = hotel.gps_coordinates?.longitude ?? null;
                  const hotelKey = generateHotelKey(hotel.name, lat, lng);
                  const hotelData = mapSerpApiToHotel(
                    hotel,
                    cityData.country,
                    cityData.state,
                    cityData.city,
                    hotelKey
                  );
                  await this.hotelRepository.upsertHotel(hotelData);
                  hotelsStoredThisPage++;
                  totalHotelsStored++;
                } catch (hotelError) {
                  // Continue with next hotel
                }
              }

              console.log(`[hotel-ingestion-service] Page ${pageNumber}: Stored ${hotelsStoredThisPage} hotels in DB (retry)`);

              // Check for next page - prefer nextUrl, fallback to nextToken
              if (newUrl) {
                if (seenUrls.has(newUrl)) {
                  nextUrl = null;
                  nextToken = null;
                  break;
                }
                seenUrls.add(newUrl);
                nextUrl = newUrl;
                nextToken = null;
                pageNumber++;
              } else if (newToken) {
                if (seenTokens.has(newToken)) {
                  nextToken = null;
                  nextUrl = null;
                  break;
                }
                seenTokens.add(newToken);
                nextToken = newToken;
                nextUrl = null;
                pageNumber++;
              } else {
                nextToken = null;
                nextUrl = null;
                break;
              }
              break; // Success, exit retry loop
            } catch (retryError) {
              const retryErrorMessage = retryError instanceof Error ? retryError.message : String(retryError);
              const isRetryNoResults = retryErrorMessage.toLowerCase().includes('hasn\'t returned any results') ||
                                      retryErrorMessage.toLowerCase().includes('no results') ||
                                      retryErrorMessage.toLowerCase().includes('no hotels found');
              
              // If retry also returns "no results", end pagination gracefully
              if (isRetryNoResults) {
                nextToken = null;
                nextUrl = null;
                break;
              }
              
              if (retryCount >= maxRetries) {
                throw retryError;
              }
            }
          }
        }
      } while (nextToken || nextUrl);

      // Step 4: Log completion summary
      console.log(`[hotel-ingestion-service] Completed: ${totalHotelsStored} hotels stored from ${pageNumber - 1} pages`);
    } catch (error) {
      console.error(`[hotel-ingestion-service] Fatal error:`, error);
      throw error;
    }
  }
}


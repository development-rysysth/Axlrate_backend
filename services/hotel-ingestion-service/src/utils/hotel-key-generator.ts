import crypto from 'crypto';

/**
 * Generate a deterministic hotel_key from hotel name and coordinates
 * Uses SHA1 hash of normalized name + coordinates (3 decimal places)
 * Returns 16-character uppercase hex string
 * 
 * @param name - Hotel name
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns 16-character uppercase hex string
 */
export function generateHotelKey(
  name: string | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined
): string {
  const safeName = (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const latKey = lat != null ? lat.toFixed(3) : '0';
  const lngKey = lng != null ? lng.toFixed(3) : '0';

  const raw = `${safeName}|${latKey}|${lngKey}`;

  return crypto
    .createHash('sha1')
    .update(raw)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
}


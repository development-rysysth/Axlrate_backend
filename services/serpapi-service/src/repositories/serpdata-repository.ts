import SerpData from '../../models/SerpData';
import { ISerpData } from '../../models/SerpData';

export class SerpDataRepository {
  async findOne(query: any) {
    return SerpData.findOne(query);
  }

  async create(data: Partial<ISerpData>) {
    return SerpData.create(data);
  }

  async findAndUpdate(query: any, updateData: Partial<ISerpData>) {
    const existing = await SerpData.findOne(query);
    if (existing) {
      Object.assign(existing, updateData);
      return existing.save();
    }
    return null;
  }

  async findAllSummaries() {
    const serpDatas = await SerpData.find({})
      .sort({ 'search_metadata.created_at': -1 })
      .lean();

    if (!serpDatas || serpDatas.length === 0) return [];

    const WHITELIST_OTAS = ["Booking.com", "Expedia.com", "Hotels.com", "Agoda"];
    const results = [];

    for (const doc of serpDatas as any) {
      const checkInDate =
        doc.checkInDate ??
        doc.check_in_date ??
        doc.search_parameters?.check_in_date ??
        null;

      const checkOutDate =
        doc.checkOutDate ??
        doc.check_out_date ??
        doc.search_parameters?.check_out_date ??
        null;

      const hotelName =
        doc.hotelName ?? doc.hotel_name ?? doc.name ?? null;

      if (!hotelName) continue; // Skip if no hotel name

      const currency =
        doc.currency ?? doc.search_parameters?.currency ?? null;

      const adults =
        doc.search_parameters?.adults ?? null;

      // Only featured_prices
      const featuredPrices = doc.featured_prices || [];

      // Only add OTAs that are in the whitelist
      for (const requiredOta of WHITELIST_OTAS) {
        // Try to find it in featuredPrices (case-insensitive)
        const match = featuredPrices.find(
          (p: any) => p.source?.toLowerCase() === requiredOta.toLowerCase()
        );

        if (match) {
          results.push({
            _id: doc._id,
            OTA: requiredOta,
            rate: {
              lowest: match.rate_per_night?.extracted_lowest ?? null,
              extracted_lowest: match.rate_per_night?.extracted_lowest ?? null,
              before_tax_fees: match.rate_per_night?.extracted_before_taxes_fees ?? null,
              extracted_before_tax_fees: match.rate_per_night?.extracted_before_taxes_fees ?? null,
            },
            check_in_date: checkInDate,
            check_out_date: checkOutDate,
            hotel_name: hotelName,
            currency,
            adults,
          });
        }
      }
    }

    return results;
  }
}


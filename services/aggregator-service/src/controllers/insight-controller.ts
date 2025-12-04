import { Request, Response } from 'express';
import { InsightRepository } from '../repositories/insight-repository';

export class InsightController {
  /**
   * Get all available filter options
   * GET /v1/insights/filters
   */
  async getFilterOptions(req: Request, res: Response) {
    try {
      const insightRepository = new InsightRepository();
      const filterOptions = await insightRepository.getAllFilterOptions();
      
      return res.json({
        success: true,
        data: filterOptions,
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch filter options',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}


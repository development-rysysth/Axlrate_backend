import { Request, Response } from 'express';
import { CalendarRepository, CalendarDataRequest } from '../repositories/calendar-repository';

export class CalendarController {
  /**
   * Get calendar data with filters
   * POST /v1/calendar-data
   */
  async getCalendarData(req: Request, res: Response) {
    try {
      const filters: CalendarDataRequest = req.body;
      
      const calendarRepository = new CalendarRepository();
      const result = await calendarRepository.getCalendarData(filters);
      
      return res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch calendar data',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get aggregated calendar data (min/max/avg prices by date)
   * POST /v1/calendar-data/aggregated
   */
  async getAggregatedCalendarData(req: Request, res: Response) {
    try {
      const filters: CalendarDataRequest = req.body;
      
      const calendarRepository = new CalendarRepository();
      const result = await calendarRepository.getAggregatedCalendarData(filters);
      
      return res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch aggregated calendar data',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}


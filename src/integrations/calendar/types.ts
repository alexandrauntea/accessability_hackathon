import type { CalendarEvent } from '@/src/shared/types';
export interface CalendarProvider {
  name: 'mock' | 'google';
  getEvents(date: string): Promise<CalendarEvent[]>;
  /** Stretch: write back a focus block / moved meeting. */
  createEvent?(e: Omit<CalendarEvent, 'id' | 'source'>): Promise<void>;
}

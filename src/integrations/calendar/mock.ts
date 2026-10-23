// Owner: Alexandra. Demo calendars. Primary: Ioana Popescu.
import type { CalendarEvent } from '@/src/shared/types';
import { getIoanaCalendarEvents } from '@/src/mocks/demoUser';
import type { CalendarProvider } from './types';

export const mockCalendar: CalendarProvider = {
  name: 'mock',
  async getEvents(date) {
    return getIoanaCalendarEvents(date);
  },
};

export const setMockPersona = (_p?: any) => {};

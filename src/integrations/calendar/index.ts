import { config } from '@/src/shared/config';
import { mockCalendar } from './mock';
import { googleCalendar, hasGoogleToken } from './google';
import type { CalendarProvider } from './types';

/** Mock unless the flag is off AND the user connected Google. Demo never breaks. */
export const getCalendar = (): CalendarProvider => (!config.mockCalendar && hasGoogleToken() ? googleCalendar : mockCalendar);
export { setGoogleToken, hasGoogleToken } from './google';
export { setMockPersona } from './mock';

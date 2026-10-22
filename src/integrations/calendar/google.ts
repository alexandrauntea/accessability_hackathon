// Owner: Alexandra. Real Google Calendar (read). Token comes from useGoogleCalendarAuth() in the Day slice.
// Scope: https://www.googleapis.com/auth/calendar.readonly (add calendar.events for focus blocks).
import type { CalendarProvider } from './types';

let accessToken: string | null = null;
export const setGoogleToken = (t: string | null) => { accessToken = t; };
export const hasGoogleToken = () => !!accessToken;

export const googleCalendar: CalendarProvider = {
  name: 'google',
  async getEvents(date) {
    if (!accessToken) throw new Error('Google Calendar not connected');
    const timeMin = new Date(`${date}T00:00:00`).toISOString();
    const timeMax = new Date(`${date}T23:59:59`).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Calendar API ${res.status}`);
    const json = await res.json();
    return (json.items ?? []).filter((e: any) => e.start?.dateTime).map((e: any) => ({
      id: e.id, title: e.summary ?? '(no title)', start: e.start.dateTime, end: e.end.dateTime,
      attendees: (e.attendees ?? []).map((a: any) => a.displayName ?? a.email), movable: !e.organizer?.self ? false : true, source: 'google' as const,
    }));
  },
};

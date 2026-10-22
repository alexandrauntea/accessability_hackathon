// Owner: Alexandra. Real Google Calendar (read). Token comes from useGoogleCalendarAuth() in the Day slice.
// Scope: https://www.googleapis.com/auth/calendar.readonly
import type { CalendarProvider } from './types';
import type { CalendarEvent } from '@/src/shared/types';
import { mockCalendar } from './mock';

const STORAGE_KEY = 'vibecheck_google_cal_token';

let accessToken: string | null = null;

// Initialize token from sessionStorage on web
if (typeof window !== 'undefined' && window.sessionStorage) {
  try {
    accessToken = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {}
}

export const setGoogleToken = (t: string | null) => {
  accessToken = t;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      if (t) {
        window.sessionStorage.setItem(STORAGE_KEY, t);
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }
};

export const hasGoogleToken = () => !!accessToken;

export const googleCalendar: CalendarProvider = {
  name: 'google',
  async getEvents(date: string): Promise<CalendarEvent[]> {
    if (!accessToken) {
      return mockCalendar.getEvents(date);
    }
    const timeMin = new Date(`${date}T00:00:00`).toISOString();
    const timeMax = new Date(`${date}T23:59:59`).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;

    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.status === 401) {
        // Token expired or invalid -> clear token and fall back safely
        setGoogleToken(null);
        return mockCalendar.getEvents(date);
      }
      if (!res.ok) {
        throw new Error(`Calendar API ${res.status}`);
      }
      const json = await res.json();
      return (json.items ?? []).filter((e: any) => e.start?.dateTime).map((e: any): CalendarEvent => {
        const attendeesList = (e.attendees ?? []).map((a: any) => a.displayName ?? a.email ?? '');
        const myAttendee = (e.attendees ?? []).find((a: any) => a.self);
        const responseStatus = myAttendee?.responseStatus; // 'accepted' | 'declined' | 'tentative' | 'needsAction'
        const isOrganizer = !!e.organizer?.self;

        // Heuristics for movable and optional
        const optional = responseStatus === 'tentative' || responseStatus === 'needsAction';
        const hasNoConference = !e.conferenceData && !e.hangoutLink;
        const largeMeeting = attendeesList.length >= 5;
        const canBeAsync = hasNoConference || largeMeeting;
        const movable = isOrganizer || optional || canBeAsync;

        return {
          id: e.id,
          title: e.summary || '(no title)',
          start: e.start.dateTime,
          end: e.end.dateTime,
          attendees: attendeesList,
          movable,
          source: 'google',
        };
      });
    } catch (err) {
      console.warn('Google Calendar fetch failed, falling back to mock calendar:', err);
      return mockCalendar.getEvents(date);
    }
  },
};

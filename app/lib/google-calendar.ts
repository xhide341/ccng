import { getSupabaseServerClient } from './supabase/server';
import type { CalendarEvent } from './calendar-types';

export async function getValidGoogleAccessToken(userId: string): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const { data: tokenRecord, error } = await supabase
    .from('user_google_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !tokenRecord) {
    return null;
  }

  // Check if current access token is valid (with 2-minute safety margin)
  if (tokenRecord.access_token && tokenRecord.expires_at) {
    const expiresMs = new Date(tokenRecord.expires_at).getTime();
    if (expiresMs - Date.now() > 2 * 60 * 1000) {
      return tokenRecord.access_token;
    }
  }

  // Attempt refresh if refresh_token is present
  if (!tokenRecord.refresh_token) {
    return tokenRecord.access_token ?? null;
  }

  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    // If client secret is not configured in environment, fall back to current access token
    return tokenRecord.access_token ?? null;
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenRecord.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      console.error('Failed to refresh Google token:', await res.text());
      return tokenRecord.access_token ?? null;
    }

    const data = await res.json();
    const newAccessToken = data.access_token as string;
    const expiresIn = (data.expires_in as number) || 3600;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await supabase
      .from('user_google_tokens')
      .update({
        access_token: newAccessToken,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return newAccessToken;
  } catch (err) {
    console.error('Error refreshing Google token:', err);
    return tokenRecord.access_token ?? null;
  }
}

export type CreateEventInput = {
  title: string;
  description?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD or ISO string
  endDate?: string; // YYYY-MM-DD or ISO string
  allDay: boolean;
  partnerEmail?: string;
};

export async function createGoogleCalendarEvent(
  accessToken: string,
  input: CreateEventInput
): Promise<CalendarEvent | null> {
  try {
    const startObj = input.allDay
      ? { date: input.startDate.split('T')[0] }
      : { dateTime: new Date(input.startDate).toISOString() };

    const endRaw = input.endDate || input.startDate;
    const endObj = input.allDay
      ? { date: endRaw.split('T')[0] }
      : { dateTime: new Date(endRaw).toISOString() };

    const body: Record<string, unknown> = {
      summary: input.title,
      description: input.description,
      location: input.location,
      start: startObj,
      end: endObj,
    };

    if (input.partnerEmail) {
      body.attendees = [{ email: input.partnerEmail }];
    }

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Calendar API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const startIso = data.start?.dateTime || data.start?.date || input.startDate;
    const endIso = data.end?.dateTime || data.end?.date || endRaw;

    return {
      id: data.id,
      title: data.summary || input.title,
      description: data.description,
      location: data.location,
      startDate: startIso,
      endDate: endIso,
      allDay: input.allDay,
    };
  } catch (err) {
    console.error('Failed to create Google Calendar event:', err);
    throw err;
  }
}

export type UpdateEventInput = {
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
};

export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  input: UpdateEventInput
): Promise<CalendarEvent | null> {
  try {
    const startObj = input.allDay
      ? { date: input.startDate.split('T')[0] }
      : { dateTime: new Date(input.startDate).toISOString() };

    const endRaw = input.endDate || input.startDate;
    const endObj = input.allDay
      ? { date: endRaw.split('T')[0] }
      : { dateTime: new Date(endRaw).toISOString() };

    const body: Record<string, unknown> = {
      summary: input.title,
      description: input.description,
      location: input.location,
      start: startObj,
      end: endObj,
    };

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
        eventId
      )}?sendUpdates=all`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Calendar API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const startIso = data.start?.dateTime || data.start?.date || input.startDate;
    const endIso = data.end?.dateTime || data.end?.date || endRaw;

    return {
      id: data.id,
      title: data.summary || input.title,
      description: data.description,
      location: data.location,
      startDate: startIso,
      endDate: endIso,
      allDay: input.allDay,
    };
  } catch (err) {
    console.error('Failed to update Google Calendar event:', err);
    throw err;
  }
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
        eventId
      )}?sendUpdates=all`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return res.ok || res.status === 404;
  } catch (err) {
    console.error('Failed to delete Google Calendar event:', err);
    return false;
  }
}

export async function listGoogleCalendarEvents(
  accessToken: string,
  timeMin?: string
): Promise<CalendarEvent[]> {
  try {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '100');
    if (timeMin) {
      url.searchParams.set('timeMin', timeMin);
    } else {
      // Default to 1 month ago
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      url.searchParams.set('timeMin', oneMonthAgo.toISOString());
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const items = (data.items || []) as Array<{
      id: string;
      summary?: string;
      description?: string;
      location?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;

    return items.map((item) => {
      const isAllDay = !item.start?.dateTime && !!item.start?.date;
      const startIso = item.start?.dateTime || item.start?.date || new Date().toISOString();
      const endIso = item.end?.dateTime || item.end?.date || startIso;

      return {
        id: item.id,
        title: item.summary || '(No title)',
        description: item.description,
        location: item.location,
        startDate: startIso,
        endDate: endIso,
        allDay: isAllDay,
      };
    });
  } catch (err) {
    console.error('Failed to list Google Calendar events:', err);
    return [];
  }
}

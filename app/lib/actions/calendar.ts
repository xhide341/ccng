'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '../supabase/server';
import {
  CalendarEvent,
  getDemoCalendarEvents,
} from '../calendar-types';
import { logActivityAction } from './activity';

export async function getCalendarEventsAction(
  isDemo: boolean = false
): Promise<CalendarEvent[]> {
  if (isDemo) {
    return getDemoCalendarEvents();
  }

  // 1. Fetch from Google Calendar REST API
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { getValidGoogleAccessToken, listGoogleCalendarEvents } = await import(
        '../google-calendar'
      );
      const accessToken = await getValidGoogleAccessToken(user.id);
      if (accessToken) {
        return await listGoogleCalendarEvents(accessToken);
      }
    }
  } catch (err) {
    console.error('Failed to fetch from Google Calendar API:', err);
  }

  // Fall back to sample demo events when not linked or unauthorized
  return getDemoCalendarEvents();
}

export async function createCalendarEventAction(
  spaceId: string,
  input: {
    title: string;
    description?: string;
    location?: string;
    startDate: string;
    endDate?: string;
    allDay: boolean;
  }
): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User must be authenticated to create events.' };
    }

    const { getValidGoogleAccessToken, createGoogleCalendarEvent } = await import(
      '../google-calendar'
    );

    const accessToken = await getValidGoogleAccessToken(user.id);
    if (!accessToken) {
      return {
        success: false,
        error:
          'Google Calendar is not connected or authorization expired. Please re-authenticate with Google.',
      };
    }

    // Attempt to locate partner email to add as an attendee
    let partnerEmail: string | undefined;
    try {
      const { data: partnerData } = await supabase.rpc('get_space_partner', {
        p_space_id: spaceId,
      });
      if (partnerData && typeof partnerData === 'object') {
        const p = partnerData as { email?: unknown };
        if (typeof p.email === 'string') {
          partnerEmail = p.email;
        }
      }
    } catch {
      partnerEmail = undefined;
    }

    const createdEvent = await createGoogleCalendarEvent(accessToken, {
      ...input,
      partnerEmail,
    });

    if (!createdEvent) {
      return { success: false, error: 'Google Calendar rejected event creation.' };
    }

    if (spaceId) {
      void logActivityAction({
        spaceId,
        kind: 'calendar_created',
        payload: {
          title: input.title,
          startDate: input.startDate,
          endDate: input.endDate,
          allDay: input.allDay,
          location: input.location,
        },
        actorId: user.id,
      });
    }

    revalidatePath('/space');
    return { success: true, event: createdEvent };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create calendar event';
    return { success: false, error: message };
  }
}

export async function updateCalendarEventAction(
  eventId: string,
  input: {
    title: string;
    description?: string;
    location?: string;
    startDate: string;
    endDate?: string;
    allDay: boolean;
  },
  spaceId?: string
): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User must be authenticated.' };
    }

    const { getValidGoogleAccessToken, updateGoogleCalendarEvent } = await import(
      '../google-calendar'
    );

    const accessToken = await getValidGoogleAccessToken(user.id);
    if (!accessToken) {
      return { success: false, error: 'Google Calendar not connected.' };
    }

    const updatedEvent = await updateGoogleCalendarEvent(
      accessToken,
      eventId,
      input
    );
    if (!updatedEvent) {
      return {
        success: false,
        error: 'Failed to update event in Google Calendar.',
      };
    }

    let effectiveSpaceId = spaceId;
    if (!effectiveSpaceId) {
      const { data: space } = await supabase
        .from('spaces')
        .select('id')
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .maybeSingle();
      effectiveSpaceId = space?.id;
    }

    if (effectiveSpaceId) {
      void logActivityAction({
        spaceId: effectiveSpaceId,
        kind: 'calendar_updated',
        payload: {
          title: input.title,
          startDate: input.startDate,
          endDate: input.endDate,
          allDay: input.allDay,
          location: input.location,
        },
        actorId: user.id,
      });
    }

    revalidatePath('/space');
    return { success: true, event: updatedEvent };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to update calendar event';
    return { success: false, error: message };
  }
}

export async function deleteCalendarEventAction(
  eventId: string,
  spaceId?: string,
  eventTitle?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User must be authenticated.' };
    }

    const { getValidGoogleAccessToken, deleteGoogleCalendarEvent } = await import(
      '../google-calendar'
    );

    const accessToken = await getValidGoogleAccessToken(user.id);
    if (!accessToken) {
      return { success: false, error: 'Google Calendar not connected.' };
    }

    const deleted = await deleteGoogleCalendarEvent(accessToken, eventId);
    if (!deleted) {
      return { success: false, error: 'Failed to delete event from Google Calendar.' };
    }

    let effectiveSpaceId = spaceId;
    if (!effectiveSpaceId) {
      const { data: space } = await supabase
        .from('spaces')
        .select('id')
        .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
        .maybeSingle();
      effectiveSpaceId = space?.id;
    }

    if (effectiveSpaceId) {
      void logActivityAction({
        spaceId: effectiveSpaceId,
        kind: 'calendar_deleted',
        payload: {
          title: eventTitle || 'Plan',
        },
        actorId: user.id,
      });
    }

    revalidatePath('/space');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete event';
    return { success: false, error: message };
  }
}

export async function unlinkGoogleCalendarAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User must be authenticated.' };
    }

    const { error } = await supabase
      .from('user_google_tokens')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to unlink Google Calendar:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/space');
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to unlink Google Calendar';
    return { success: false, error: message };
  }
}

'use server';

import { getSupabaseServerClient } from '../supabase/server';
import { ActivityKind, ActivityPayload } from '../activity-types';
import { sendDiscordActivityNotification } from './discord';

export async function logActivityAction({
  spaceId,
  kind,
  payload,
  actorId,
}: {
  spaceId: string;
  kind: ActivityKind;
  payload: ActivityPayload;
  actorId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseServerClient();
    let effectiveActorId = actorId;

    if (!effectiveActorId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        effectiveActorId = user.id;
      }
    }

    if (!effectiveActorId) {
      return { success: false, error: 'User is not authenticated' };
    }

    const { error } = await supabase.from('activities').insert({
      space_id: spaceId,
      actor_id: effectiveActorId,
      kind,
      payload,
    });

    if (error) {
      console.error('Failed to log activity:', error);
      return { success: false, error: error.message };
    }

    // Trigger Discord notification asynchronously (non-blocking)
    void sendDiscordActivityNotification({
      spaceId,
      kind,
      payload,
      actorId: effectiveActorId,
    });

    return { success: true };
  } catch (err) {
    console.error('Error logging activity:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

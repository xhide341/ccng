import { getSupabaseBrowserClient } from './supabase/client';
import { ActivityKind, ActivityPayload } from './activity-types';

export async function logBrowserActivity({
  spaceId,
  kind,
  payload,
}: {
  spaceId: string;
  kind: ActivityKind;
  payload: ActivityPayload;
}) {
  try {
    const client = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return;

    await client.from('activities').insert({
      space_id: spaceId,
      actor_id: user.id,
      kind,
      payload,
    });
  } catch (err) {
    console.warn('Failed to log browser activity:', err);
  }
}

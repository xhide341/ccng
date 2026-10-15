'use server';

import { getSupabaseServerClient } from '../supabase/server';
import { ActivityKind, ActivityPayload } from '../activity-types';

const DISCORD_WEBHOOK_REGEX =
  /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;

const SAGE_DARK_COLOR = 4810066; // #496552

export async function saveDiscordWebhookAction(
  spaceId: string,
  webhookUrl: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const trimmed = webhookUrl?.trim() || null;

    if (trimmed && !DISCORD_WEBHOOK_REGEX.test(trimmed)) {
      return {
        success: false,
        error:
          'Invalid Discord webhook URL. It should look like https://discord.com/api/webhooks/...',
      };
    }

    const { error } = await supabase
      .from('spaces')
      .update({ discord_webhook_url: trimmed })
      .eq('id', spaceId)
      .or(`user_1.eq.${user.id},user_2.eq.${user.id}`);

    if (error) {
      console.error('Failed to save Discord webhook:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error saving Discord webhook:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function testDiscordWebhookAction(
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmed = webhookUrl.trim();
    if (!DISCORD_WEBHOOK_REGEX.test(trimmed)) {
      return {
        success: false,
        error:
          'Invalid Discord webhook URL format. Please paste a valid webhook URL.',
      };
    }

    const res = await fetch(trimmed, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ccng',
        embeds: [
          {
            author: {
              name: 'ccng Space',
            },
            description:
              '🌿 Discord notifications are successfully connected for your Space!',
            color: SAGE_DARK_COLOR,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        success: false,
        error: `Discord responded with ${res.status}: ${text || res.statusText}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Failed to reach Discord webhook.',
    };
  }
}

export async function sendDiscordActivityNotification({
  spaceId,
  kind,
  payload,
  actorId,
}: {
  spaceId: string;
  kind: ActivityKind;
  payload: ActivityPayload;
  actorId?: string;
}): Promise<void> {
  // Only high-value milestones
  const trackedKinds: ActivityKind[] = [
    'todo_completed',
    'note_updated',
    'calendar_created',
    'pairing_redeemed',
  ];

  if (!trackedKinds.includes(kind)) {
    return;
  }

  try {
    const supabase = await getSupabaseServerClient();

    // 1. Fetch space webhook URL
    const { data: space } = await supabase
      .from('spaces')
      .select('discord_webhook_url')
      .eq('id', spaceId)
      .maybeSingle();

    if (!space?.discord_webhook_url) {
      return;
    }

    // 2. Fetch actor metadata for name and avatar
    let actorName = 'Partner';
    let actorAvatarUrl: string | undefined = undefined;

    if (actorId) {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser && currentUser.id === actorId) {
        actorName =
          currentUser.user_metadata?.full_name ||
          currentUser.user_metadata?.name ||
          currentUser.email?.split('@')[0] ||
          'You';
        actorAvatarUrl =
          currentUser.user_metadata?.avatar_url ||
          currentUser.user_metadata?.picture;
      }
    }

    // 3. Form minimal embed description
    let description = '';
    switch (kind) {
      case 'todo_completed':
        description = `✅ Completed todo: **${payload.title || 'Untitled todo'}**`;
        break;
      case 'note_updated':
        description = `📝 Left a note: *"${payload.notePreview || 'Updated note'}"*`;
        break;
      case 'calendar_created':
        description = `📅 Scheduled plan: **${payload.title || 'New event'}**`;
        break;
      case 'pairing_redeemed':
        description = `💞 Joined the Space together!`;
        break;
      default:
        return;
    }

    // 4. Dispatch minimal Discord embed asynchronously
    await fetch(space.discord_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ccng',
        embeds: [
          {
            author: {
              name: actorName,
              icon_url: actorAvatarUrl,
            },
            description,
            color: SAGE_DARK_COLOR,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (err) {
    // Non-blocking: log error and never interrupt user flow
    console.warn('Failed to send Discord activity notification:', err);
  }
}

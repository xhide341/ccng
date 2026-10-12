import { getSupabaseBrowserClient } from './supabase/client';

export const DEMO_COOKIE_NAME = 'ccng_demo_user';

export async function signInWithGoogle(
  next: string = '/space',
  options?: { prompt?: string }
) {
  const supabase = getSupabaseBrowserClient();
  const origin = window.location.origin;
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      scopes: 'https://www.googleapis.com/auth/calendar.events',
      queryParams: {
        access_type: 'offline',
        prompt: options?.prompt || 'consent',
      },
    },
  });
  if (error) throw error;
  return data;
}

export function signInAsDemo() {
  if (typeof document !== 'undefined') {
    document.cookie = `${DEMO_COOKIE_NAME}=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/space';
  }
}

export async function signOutUser() {
  if (typeof document !== 'undefined') {
    document.cookie = `${DEMO_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  }

  try {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Sign out error:', err);
  }

  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/';
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '../../lib/supabase/server';
import { DEMO_COOKIE_NAME } from '../../lib/auth';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? '/space';
  if (!next.startsWith('/')) {
    // if "next" is not a relative URL, use the default
    next = '/space';
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data?.session?.user) {
        const session = data.session;
        if (session.provider_token || session.provider_refresh_token) {
          try {
            const expiresAtIso = session.expires_at
              ? new Date(session.expires_at * 1000).toISOString()
              : null;

            let refreshTokenToSave = session.provider_refresh_token;
            if (!refreshTokenToSave) {
              const { data: existing } = await supabase
                .from('user_google_tokens')
                .select('refresh_token')
                .eq('user_id', session.user.id)
                .maybeSingle();
              if (existing?.refresh_token) {
                refreshTokenToSave = existing.refresh_token;
              }
            }

            if (refreshTokenToSave) {
              await supabase.from('user_google_tokens').upsert({
                user_id: session.user.id,
                access_token: session.provider_token ?? null,
                refresh_token: refreshTokenToSave,
                expires_at: expiresAtIso,
                scope: 'https://www.googleapis.com/auth/calendar.events',
                updated_at: new Date().toISOString(),
              });
            }
          } catch (tokenErr) {
            console.error('Failed to save Google tokens:', tokenErr);
          }
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      const redirectUrl =
        isLocalEnv || !forwardedHost
          ? `${origin}${next}`
          : `https://${forwardedHost}${next}`;

      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete(DEMO_COOKIE_NAME);
      return response;
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

'use client';

import Script from 'next/script';
import { createClient } from '../lib/supabase/client';

interface CredentialResponse {
  credential: string;
  select_by?: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: CredentialResponse) => void | Promise<void>;
  nonce?: string;
  use_fedcm_for_prompt?: boolean;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void;
  prompt: (notification?: (notification: unknown) => void) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

// Generate nonce for Google ID token sign-in
async function generateNonce(): Promise<[string, string]> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const nonce = btoa(String.fromCharCode(...randomBytes));

  const encoder = new TextEncoder();
  const encodedNonce = encoder.encode(nonce);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedNonce = hashArray
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return [nonce, hashedNonce];
}

export function GoogleOneTap() {
  const supabase = createClient();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  async function initializeGoogleOneTap() {
    if (!clientId || typeof window === 'undefined' || !window.google?.accounts?.id) {
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        return;
      }

      const [nonce, hashedNonce] = await generateNonce();

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: CredentialResponse) => {
          try {
            const { error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: response.credential,
              nonce,
            });

            if (error) {
              console.error('One Tap sign-in error:', error);
              return;
            }

            // Hard redirect to space so server and middleware pick up session
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = '/space';
          } catch (err) {
            console.error('Error handling Google One Tap response:', err);
          }
        },
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
      });

    } catch (err) {
      console.error('Error initializing Google One Tap:', err);
    }
  }

  if (!clientId) {
    return null;
  }

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      onReady={() => {
        void initializeGoogleOneTap();
      }}
    />
  );
}

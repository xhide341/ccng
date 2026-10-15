'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient } from '../supabase/server';

function generatePairingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = 6;
  const randomValues = new Uint32Array(length);

  crypto.getRandomValues(randomValues);

  return Array.from(randomValues, (value) =>
    chars.charAt(value % chars.length)
  ).join('');
}

export async function createSpaceAction(): Promise<{
  success: boolean;
  code?: string;
  error?: string;
}> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: code, error: spaceError } = await supabase.rpc('create_space');
    if (spaceError) {
      return { success: false, error: spaceError.message };
    }

    revalidatePath('/space');
    return { success: true, code: (code as string) || undefined };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create Space';
    return { success: false, error: message };
  }
}

export async function createPairingCodeAction(
  code?: string,
  expiresAt?: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    const pairingCode = code || generatePairingCode();
    const supabase = await getSupabaseServerClient();

    const { error } = await supabase.rpc('create_pairing_code', {
      p_code: pairingCode,
      p_expires_at: expiresAt,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/space');
    return { success: true, code: pairingCode };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate code';
    return { success: false, error: message };
  }
}

export async function redeemPairingCodeAction(
  code: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCode = code.trim().toUpperCase();
  if (cleanCode.length < 6) {
    return { success: false, error: 'Pairing code must be at least 6 characters' };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.rpc('redeem_pairing_code', {
      p_code: cleanCode,
    });

    if (error) {
      const message = error.message.includes('User already belongs')
        ? 'You already belong to a Space.'
        : 'This pairing code is invalid or has expired. Please verify with your partner.';
      return { success: false, error: message };
    }

    revalidatePath('/space');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to redeem pairing code';
    return { success: false, error: message };
  }
}

export async function leaveSpaceAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User is not authenticated' };
    }

    const { error } = await supabase.rpc('leave_space');
    if (error) {
      console.error('Failed to leave space:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/space');
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to leave space';
    return { success: false, error: message };
  }
}

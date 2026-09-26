// Shared helpers for the back-end functions. Runs on Netlify, never in the browser.
import { createClient } from '@supabase/supabase-js';

export const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

export const FLEET = [5, 4, 3, 3, 2];
export const SIZE = 10;

export function reply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function refuse(message, status = 400) {
  return reply({ error: message }, status);
}

// Who is calling? Look up the secret player token.
export async function playerFor(token) {
  if (!token) return null;
  const { data } = await db.from('players').select('game_id, seat').eq('token', token).maybeSingle();
  return data;
}

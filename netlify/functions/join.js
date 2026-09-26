// Create a game (no code) or join one (with a code).
// Gives back your seat (A or B) and a secret player token.
import { randomUUID } from 'node:crypto';
import { db, reply, refuse } from '../lib/shared.js';

function newCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}

export default async (req) => {
  const { code } = await req.json().catch(() => ({}));
  const token = randomUUID();

  if (!code) {
    const { data: game, error } = await db.from('games').insert({ code: newCode() }).select().single();
    if (error) return refuse(error.message, 500);
    await db.from('players').insert({ game_id: game.id, seat: 'A', token });
    return reply({ gameId: game.id, code: game.code, seat: 'A', token });
  }

  const { data: game } = await db.from('games').select().eq('code', code.toUpperCase()).maybeSingle();
  if (!game) return refuse('No game with that code');

  const { error } = await db.from('players').insert({ game_id: game.id, seat: 'B', token });
  if (error) return refuse('That game is full');

  await db.from('games').update({ status: 'placing' }).eq('id', game.id);
  return reply({ gameId: game.id, code: game.code, seat: 'B', token });
};

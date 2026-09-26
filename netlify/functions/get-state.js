// Everything this player's screen needs to draw the game.
import { db, reply, refuse, playerFor } from '../lib/shared.js';

export default async (req) => {
  const { token } = await req.json();
  const me = await playerFor(token);
  if (!me) return refuse('Unknown player', 401);

  const [{ data: game }, { data: players }, { data: ships }, { data: shots }] = await Promise.all([
    db.from('games').select().eq('id', me.game_id).single(),
    db.from('players').select().eq('game_id', me.game_id).order('seat'),
    db.from('ships').select().eq('game_id', me.game_id),
    db.from('shots').select().eq('game_id', me.game_id).order('id'),
  ]);

  return reply({ seat: me.seat, game, players, ships, shots });
};

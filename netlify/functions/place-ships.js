// Check a player's fleet, save it, and start the game once both fleets are in.
import { db, reply, refuse, playerFor, FLEET, SIZE } from '../lib/shared.js';

function fleetProblem(ships) {
  if (!Array.isArray(ships) || ships.length !== FLEET.length) return 'Wrong number of ships';

  const sizes = ships.map((s) => s.length).sort((a, b) => b - a);
  if (sizes.join() !== FLEET.join()) return 'Wrong ship sizes';

  const taken = new Set();
  for (const cells of ships) {
    const rows = cells.map(([r]) => r);
    const cols = cells.map(([, c]) => c);
    const flat = new Set(rows).size === 1 || new Set(cols).size === 1;
    if (!flat) return 'Ships must be in a straight line';

    const line = new Set(rows).size === 1 ? cols : rows;
    const sorted = [...line].sort((a, b) => a - b);
    if (sorted.some((v, i) => i > 0 && v !== sorted[i - 1] + 1)) return 'Ships must not have gaps';

    for (const [r, c] of cells) {
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return 'Ship off the board';
      if (taken.has(`${r},${c}`)) return 'Ships overlap';
      taken.add(`${r},${c}`);
    }
  }
  return null;
}

export default async (req) => {
  const { token, ships } = await req.json();
  const me = await playerFor(token);
  if (!me) return refuse('Unknown player', 401);

  const { data: game } = await db.from('games').select().eq('id', me.game_id).single();
  if (game.status !== 'placing') return refuse('Not the time to place ships');

  const { count } = await db.from('ships').select('id', { count: 'exact', head: true })
    .eq('game_id', me.game_id).eq('seat', me.seat);
  if (count > 0) return refuse('Your fleet is already placed');

  const problem = fleetProblem(ships);
  if (problem) return refuse(problem);

  await db.from('ships').insert(ships.map((cells) => ({ game_id: me.game_id, seat: me.seat, cells })));

  const { count: total } = await db.from('ships').select('id', { count: 'exact', head: true })
    .eq('game_id', me.game_id);
  if (total === FLEET.length * 2) {
    await db.from('games').update({ status: 'playing', turn: 'A' }).eq('id', me.game_id);
  }
  return reply({ ok: true });
};

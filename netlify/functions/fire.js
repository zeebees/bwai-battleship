// Fire a shot. Decides hit / miss / sunk, switches the turn, and sets the winner.
import { db, reply, refuse, playerFor, SIZE } from '../lib/shared.js';

export default async (req) => {
  const { token, row, col } = await req.json();
  const me = await playerFor(token);
  if (!me) return refuse('Unknown player', 401);

  const { data: game } = await db.from('games').select().eq('id', me.game_id).single();
  if (game.status !== 'playing') return refuse('The game is not on');
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= SIZE || col < 0 || col >= SIZE) {
    return refuse('That square is off the board');
  }

  const enemy = me.seat === 'A' ? 'B' : 'A';
  const { data: enemyShips } = await db.from('ships').select().eq('game_id', game.id).eq('seat', enemy);
  const target = enemyShips.find((s) => s.cells.some(([r, c]) => r === row && c === col));

  const { error } = await db.from('shots')
    .insert({ game_id: game.id, seat: me.seat, row, col, hit: !!target });
  if (error) return refuse('You already fired there');

  let sunk = false;
  if (target) {
    const { data: myShots } = await db.from('shots').select('row, col')
      .eq('game_id', game.id).eq('seat', me.seat);
    const hitSet = new Set(myShots.map((s) => `${s.row},${s.col}`));
    sunk = target.cells.every(([r, c]) => hitSet.has(`${r},${c}`));
    if (sunk) {
      await db.from('ships').update({ sunk: true }).eq('id', target.id);
      await db.from('shots').update({ sunk: true })
        .eq('game_id', game.id).eq('seat', me.seat).eq('row', row).eq('col', col);
    }
  }

  const allSunk = enemyShips.every((s) => s.id === target?.id ? sunk : s.sunk);
  await db.from('games')
    .update(allSunk ? { status: 'over', winner: me.seat } : { turn: enemy })
    .eq('id', game.id);

  return reply({ hit: !!target, sunk });
};

// Front end: draws the boards and asks the back end to do things.
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const SIZE = 10;
const FLEET = [5, 4, 3, 3, 2];
const $ = (id) => document.getElementById(id);

// Each browser tab is its own player, so keep the seat in sessionStorage.
let me = JSON.parse(sessionStorage.getItem('battleship') || 'null');
let state = null;
let draft = null;   // fleet being placed, before Ready

async function call(name, body) {
  const res = await fetch(`/.netlify/functions/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) alert(data.error);
  return data;
}

// ---------- lobby ----------
async function join(code) {
  const data = await call('join', code ? { code } : {});
  if (data.error) return;
  me = data;
  sessionStorage.setItem('battleship', JSON.stringify(me));
  start();
}
$('create').onclick = () => join();
$('join-form').onsubmit = (e) => { e.preventDefault(); join($('code').value.trim()); };

// ---------- placing ships ----------
function randomFleet() {
  const taken = new Set();
  return FLEET.map((len) => {
    for (;;) {
      const across = Math.random() < 0.5;
      const r = Math.floor(Math.random() * (across ? SIZE : SIZE - len + 1));
      const c = Math.floor(Math.random() * (across ? SIZE - len + 1 : SIZE));
      const cells = Array.from({ length: len }, (_, i) => (across ? [r, c + i] : [r + i, c]));
      if (cells.every(([y, x]) => !taken.has(`${y},${x}`))) {
        cells.forEach(([y, x]) => taken.add(`${y},${x}`));
        return cells;
      }
    }
  });
}
$('shuffle').onclick = () => { draft = randomFleet(); draw(); };
$('ready').onclick = async () => {
  const data = await call('place-ships', { token: me.token, ships: draft });
  if (!data.error) { draft = null; refresh(); }
};

// ---------- firing ----------
async function fire(row, col) {
  await call('fire', { token: me.token, row, col });
  refresh();
}

// ---------- drawing ----------
function makeBoard(el, onClick) {
  el.innerHTML = '';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('button');
      cell.className = 'cell';
      cell.dataset.key = `${r},${c}`;
      if (onClick) cell.onclick = () => onClick(r, c);
      el.appendChild(cell);
    }
  }
}

function paint(el, key, cls) {
  el.querySelector(`[data-key="${key}"]`)?.classList.add(cls);
}

function draw() {
  const enemy = me.seat === 'A' ? 'B' : 'A';
  const myTurn = state?.game.status === 'playing' && state.game.turn === me.seat;

  makeBoard($('mine'));
  makeBoard($('theirs'), myTurn ? fire : null);
  $('theirs').classList.toggle('locked', !myTurn);

  if (!state) return;

  // My ships (or the fleet I'm still placing).
  const myShips = draft
    ? draft.map((cells) => ({ cells, sunk: false }))
    : state.ships.filter((s) => s.seat === me.seat);
  myShips.forEach((s) => s.cells.forEach(([r, c]) => paint($('mine'), `${r},${c}`, 'ship')));

  // Enemy ships: only draw the sunk ones — or all of them once the game is over.
  state.ships
    .filter((s) => s.seat === enemy && (s.sunk || state.game.status === 'over'))
    .forEach((s) => s.cells.forEach(([r, c]) => paint($('theirs'), `${r},${c}`, s.sunk ? 'sunk' : 'ship')));

  // Shots: mine land on their board, theirs land on mine.
  state.shots.forEach((s) => {
    const board = s.seat === me.seat ? $('theirs') : $('mine');
    paint(board, `${s.row},${s.col}`, s.hit ? 'hit' : 'miss');
  });

  $('status').textContent = statusText(myTurn);
  $('players').textContent = state.players.map((p) => p.seat).join(' · ');
  const placedMine = state.ships.some((s) => s.seat === me.seat);
  $('place-controls').hidden = state.game.status !== 'placing' || placedMine;
}

function statusText(myTurn) {
  const g = state.game;
  if (g.status === 'waiting') return `Waiting for a friend… give them the code ${g.code}`;
  if (g.status === 'placing') {
    return state.ships.some((s) => s.seat === me.seat)
      ? 'Waiting for the other player to place their fleet…'
      : 'Shuffle your fleet, then press Ready.';
  }
  if (g.status === 'over') return g.winner === me.seat ? '🏆 You won!' : '💀 You lost.';
  return myTurn ? '🎯 Your turn — fire at enemy waters!' : '⏳ Their turn…';
}

// ---------- keeping in sync ----------
async function refresh() {
  const data = await call('get-state', { token: me.token });
  if (data.error) return;
  state = data;
  if (state.game.status === 'placing' && !state.ships.some((s) => s.seat === me.seat) && !draft) {
    draft = randomFleet();
  }
  draw();
}

function start() {
  $('lobby').hidden = true;
  $('game').hidden = false;
  $('game-code').textContent = me.code;
  $('seat').textContent = me.seat;

  // When anything changes in this game, ask the back end for the new picture.
  db.channel(`game-${me.gameId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${me.gameId}` }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shots', filter: `game_id=eq.${me.gameId}` }, refresh)
    .subscribe((status) => { if (status === 'SUBSCRIBED') refresh(); });  // catch anything we missed while connecting

  refresh();
}

if (me) start();

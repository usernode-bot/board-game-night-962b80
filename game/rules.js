// Board Game Night's rules: a simplified Risk the whole project plays
// together. The map is 20 lands in 5 regions, dealt out at random at the
// start. Each turn has two steps: PLACE, where you spread new flags over
// your own lands, and CHALLENGE, where you pick one of your lands with two
// or more flags and challenge a land next door (or across a dotted sea
// lane). Both sides roll dice, highest die wins each pair, a tie goes to
// the holder, and the loser of each pair removes one flag. When a land runs
// out of flags you take it, and the flags you rolled with move in. The last
// player holding land wins. Somebody who is not here has their turn played
// for them, so a game never waits on an empty seat.
//
// Plain functions of the game's state, kept to the game room's contract
// (game/room.js): the room calls them, saves the state and sends each
// player the result. To make it a different game, change these and the
// screen (public/app.js).

'use strict';

const AWAY_MS = 2500;
// Nobody's turn waits forever: after this, the room plays their turn too.
const TURN_MS = 90000;
const LOG_MAX = 8;

// The map: 20 lands in 5 regions, on a hand-drawn parchment. Each land's
// `path` is its outline on the 358x330 map, `cx`/`cy` its flag token, and
// `next` the lands a challenge can reach: the lands it borders on the map,
// plus the ones the dotted sea lanes connect. Lands are numbered '1' to
// '20'; the map is drawn from these, so no other drawing code exists.
const REGIONS = [
  { id: 'northwood', name: 'Northwood', bonus: 2 },
  { id: 'highpeaks', name: 'Highpeaks', bonus: 2 },
  { id: 'midlands', name: 'Midlands', bonus: 2 },
  { id: 'marsh', name: 'Marsh Coast', bonus: 2 },
  { id: 'sunreach', name: 'Sunreach', bonus: 2 },
];

const MAP = [
  // Northwood, the green woods in the north west.
  { id: '1', name: 'Alder', region: 'northwood', cx: 40, cy: 40, path: 'M14 26 L44 16 L70 18 L72 64 L48 66 L16 62Z', next: ['2', '3', '5'] },
  { id: '2', name: 'Birchvale', region: 'northwood', cx: 100, cy: 40, path: 'M70 18 L98 14 L128 24 L124 64 L98 62 L72 64Z', next: ['1', '4'] },
  { id: '3', name: 'Northgate', region: 'northwood', cx: 42, cy: 92, path: 'M16 62 L48 66 L72 64 L74 120 L44 118 L20 118Z', next: ['1', '4', '13'] },
  { id: '4', name: 'Pinecrest', region: 'northwood', cx: 100, cy: 92, path: 'M72 64 L98 62 L124 64 L126 116 L100 118 L74 120Z', next: ['2', '3', '9'] },
  // Highpeaks, the mountains along the north and east.
  { id: '5', name: 'Highhollow', region: 'highpeaks', cx: 196, cy: 36, path: 'M152 22 L196 14 L244 14 L246 62 L198 62 L150 60Z', next: ['1', '6', '8'] },
  { id: '6', name: 'Stormcap', region: 'highpeaks', cx: 294, cy: 38, path: 'M244 14 L292 16 L342 26 L340 62 L294 64 L246 62Z', next: ['5', '7', '8'] },
  { id: '7', name: 'Ridge', region: 'highpeaks', cx: 294, cy: 86, path: 'M246 62 L294 64 L340 62 L338 104 L294 108 L248 110Z', next: ['6', '8', '19'] },
  { id: '8', name: 'Cragford', region: 'highpeaks', cx: 200, cy: 86, path: 'M150 60 L198 62 L246 62 L248 110 L200 112 L160 104Z', next: ['5', '6', '7', '10'] },
  // Midlands, the farms in the middle of the map.
  { id: '9', name: 'Oldmill', region: 'midlands', cx: 146, cy: 156, path: 'M116 142 L148 134 L182 140 L182 176 L146 178 L114 172Z', next: ['10', '12', '4'] },
  { id: '10', name: 'Granary', region: 'midlands', cx: 214, cy: 156, path: 'M182 140 L214 134 L248 142 L246 174 L214 178 L182 176Z', next: ['9', '11', '8', '17'] },
  { id: '11', name: 'Fernvale', region: 'midlands', cx: 214, cy: 196, path: 'M182 176 L214 178 L246 174 L248 208 L216 216 L182 210Z', next: ['10', '12', '17'] },
  { id: '12', name: 'Millbrook', region: 'midlands', cx: 146, cy: 196, path: 'M114 172 L146 178 L182 176 L182 210 L148 218 L116 210Z', next: ['9', '11', '14'] },
  // Marsh Coast, the fens along the south west shore.
  { id: '13', name: 'Reeds', region: 'marsh', cx: 48, cy: 250, path: 'M18 240 L48 230 L82 236 L82 272 L50 274 L18 266Z', next: ['14', '15', '3'] },
  { id: '14', name: 'Marshside', region: 'marsh', cx: 116, cy: 250, path: 'M82 236 L118 230 L150 240 L148 270 L116 274 L82 272Z', next: ['13', '16', '12'] },
  { id: '15', name: 'Lowfen', region: 'marsh', cx: 48, cy: 292, path: 'M18 266 L50 274 L82 272 L82 306 L50 316 L20 306Z', next: ['13', '16', '18'] },
  { id: '16', name: 'Creekmouth', region: 'marsh', cx: 116, cy: 292, path: 'M82 272 L116 274 L148 270 L150 302 L116 314 L84 306Z', next: ['14', '15'] },
  // Sunreach, the dunes and harbours of the south east.
  { id: '17', name: 'Sundock', region: 'sunreach', cx: 232, cy: 250, path: 'M200 236 L232 228 L268 234 L268 270 L234 272 L198 264Z', next: ['18', '19', '11', '10'] },
  { id: '18', name: 'Dune', region: 'sunreach', cx: 232, cy: 292, path: 'M198 264 L234 272 L268 270 L268 302 L234 314 L200 304Z', next: ['17', '20', '15'] },
  { id: '19', name: 'Shorehead', region: 'sunreach', cx: 306, cy: 250, path: 'M268 234 L302 226 L340 236 L338 268 L304 272 L268 270Z', next: ['17', '20', '7'] },
  { id: '20', name: 'Sunport', region: 'sunreach', cx: 306, cy: 292, path: 'M268 270 L304 272 L338 268 L340 300 L304 314 L270 306Z', next: ['18', '19'] },
];

const BY_ID = Object.fromEntries(MAP.map((l) => [l.id, l]));

// The dotted sea lanes: [from, to, line on the map]. The same pairs are
// already in `next`; this is only how they are drawn.
const LANES = [
  ['4', '9', 'M100 119 L126 140'],
  ['1', '5', 'M126 40 L148 40'],
  ['3', '13', 'M36 120 L40 232'],
  ['8', '10', 'M210 112 L222 136'],
  ['12', '14', 'M140 217 L124 232'],
  ['10', '17', 'M247 172 Q256 202 240 231'],
  ['11', '17', 'M214 216 L230 229'],
  ['15', '18', 'M52 317 Q120 327 197 301'],
  ['7', '19', 'M330 105 Q352 170 320 230'],
];

function clone(game) {
  return JSON.parse(JSON.stringify(game));
}

function currentId(game) {
  return game.order[game.turn % game.order.length];
}

function usernameOf(game, id) {
  return (game.seats[id] && game.seats[id].username) || 'someone';
}

function nameOf(game, id) {
  return usernameOf(game, id);
}

function landsHeld(game, id) {
  return MAP.filter((l) => game.lands[l.id].owner === id).length;
}

// New flags at the start of a turn: one for every three lands you hold,
// at least three, plus two for each whole region you hold.
function reserveFor(game, id) {
  const mine = MAP.filter((l) => game.lands[l.id].owner === id);
  let n = Math.max(3, Math.floor(mine.length / 3));
  for (const r of REGIONS) {
    const all = MAP.filter((l) => l.region === r.id);
    if (all.every((l) => game.lands[l.id].owner === id)) n += r.bonus;
  }
  return n;
}

function log(game, id, text, dice) {
  game.log = [{ id, text, dice: dice || null }].concat(game.log).slice(0, LOG_MAX);
}

// The map is dealt round-robin; with 20 lands and 3 or 6 players the extra
// lands go to the earliest seats. Every land starts with one flag, and each
// player then spreads two more per dealt land at random, so the first turn
// starts straight away.
function setup({ players, random, now }) {
  const game = {
    order: players.map((p) => p.id),
    seats: {},
    lands: {},
    turn: 0,
    round: 1,
    step: 'place',
    reserve: 0,
    turnAt: now,
    log: [],
    lastRoll: null,
    winner: null,
    out: [],
  };
  players.forEach((p, seat) => { game.seats[p.id] = { username: p.username, seat }; });
  MAP.forEach((l, i) => {
    const p = players[i % players.length];
    game.lands[l.id] = { owner: p.id, flags: 1 };
  });
  for (const p of players) {
    const mine = MAP.filter((l) => game.lands[l.id].owner === p.id).map((l) => l.id);
    for (let n = 0; n < mine.length * 2; n++) {
      const id = mine[Math.floor(random() * mine.length)];
      game.lands[id].flags += 1;
    }
  }
  game.reserve = reserveFor(game, game.order[0]);
  return game;
}

// A player who has lost their last land is out; the last one holding land
// wins.
function checkOut(game, id) {
  if (!game.seats[id] || landsHeld(game, id) > 0) return;
  const idx = game.order.indexOf(id);
  if (idx === -1) return;
  const current = currentId(game);
  game.order.splice(idx, 1);
  game.out.push(id);
  log(game, id, `${nameOf(game, id)} is out of the game.`, null);
  // Anybody still in but sitting earlier keeps their place: the turn index
  // points at the same player it did.
  const ci = game.order.indexOf(current);
  if (ci !== -1) game.turn = ci;
  if (game.order.length === 1) {
    game.winner = game.order[0];
    log(game, game.winner, `${nameOf(game, game.winner)} holds the whole map and wins!`, null);
  }
}

// Flags are placed one at a time; the log keeps it to one line per land,
// counting up ("placed 4 flags on Pinecrest", "+4").
function place(game, player, landId) {
  const land = game.lands[landId];
  land.flags += 1;
  game.reserve -= 1;
  const landName = BY_ID[landId].name;
  const last = game.log[0];
  if (last && last.place === landId && last.id === player.id) {
    last.n += 1;
    last.dice = '+' + last.n;
    last.text = `${nameOf(game, player.id)} placed ${last.n} ${last.n === 1 ? 'flag' : 'flags'} on ${landName}.`;
  } else {
    game.log = [{ id: player.id, text: `${nameOf(game, player.id)} placed 1 flag on ${landName}.`, dice: '+1', place: landId, n: 1 }]
      .concat(game.log).slice(0, LOG_MAX);
  }
  if (game.reserve <= 0) game.step = 'challenge';
}

// Risk dice: the attacker rolls up to three (one fewer than their flags
// there), the holder up to two. Highest dice are compared in pairs; the
// higher die wins each pair and a tie goes to the holder. The loser of each
// pair removes one flag. When the land runs out of flags it is taken, and
// the flags the attacker rolled with move in.
function challenge(game, player, fromId, toId, forThem) {
  const from = game.lands[fromId];
  const to = game.lands[toId];
  const defenderId = to.owner;
  const attackDice = Math.min(3, from.flags - 1);
  const holdDice = Math.min(2, to.flags);
  const rolled = (n) => {
    const dice = [];
    for (let i = 0; i < n; i++) dice.push(1 + Math.floor(Math.random() * 6));
    return dice.sort((a, b) => b - a);
  };
  const aDice = rolled(attackDice);
  const dDice = rolled(holdDice);
  let aLost = 0;
  let dLost = 0;
  for (let i = 0; i < Math.min(aDice.length, dDice.length); i++) {
    if (aDice[i] > dDice[i]) dLost += 1; else aLost += 1;
  }
  from.flags -= aLost;
  to.flags -= dLost;
  game.lastRoll = { from: fromId, to: toId, aDice, dDice };
  const dice = aDice.join(' ') + ' vs ' + dDice.join(' ');
  const taken = to.flags <= 0;
  const forNote = forThem ? ' (played for them)' : '';
  if (taken) {
    to.owner = player.id;
    to.flags = attackDice;
    from.flags -= attackDice;
    log(game, player.id, `${nameOf(game, player.id)} took ${BY_ID[toId].name} from ${nameOf(game, defenderId)}.${forNote}`, dice);
    checkOut(game, defenderId);
  } else if (dLost > 0) {
    log(game, defenderId, `${nameOf(game, defenderId)} held ${BY_ID[toId].name} against ${nameOf(game, player.id)}.${forNote}`, dice);
  } else {
    log(game, player.id, `${nameOf(game, player.id)} lost ${aLost === 1 ? '1 flag' : aLost + ' flags'} at ${BY_ID[toId].name}.${forNote}`, dice);
  }
}

function endTurn(game, player, forThem) {
  game.turn += 1;
  if (game.turn >= game.order.length) {
    game.turn = 0;
    game.round += 1;
  }
  game.step = 'place';
  game.reserve = reserveFor(game, game.order[game.turn]);
  game.turnAt = Date.now();
  return game;
}

function act(game, action, ctx) {
  if (game.winner != null) return { error: 'This game is over.' };
  if (currentId(game) !== ctx.player.id) return { error: 'It is not your turn yet.' };
  const me = ctx.player;
  if (!game.seats[me.id]) return { error: 'You are not in this game.' };

  if (action.type === 'place') {
    if (game.step !== 'place') return { error: 'You have placed your flags. Challenge or end your turn.' };
    if (game.reserve <= 0) return { error: 'You have no flags left to place.' };
    const landId = String(action.land || '');
    const land = game.lands[landId];
    if (!land || land.owner !== me.id) return { error: 'Choose one of your own lands.' };
    const g = clone(game);
    place(g, me, landId);
    return { game: g };
  }

  if (action.type === 'challenge') {
    if (game.step !== 'challenge') return { error: 'Place all your flags first.' };
    const fromId = String(action.from || '');
    const toId = String(action.to || '');
    const from = game.lands[fromId];
    const to = game.lands[toId];
    if (!from || from.owner !== me.id) return { error: 'Challenge from one of your own lands.' };
    if (from.flags < 2) return { error: 'A land needs at least 2 flags to challenge.' };
    if (!to) return { error: 'That is not a land on the map.' };
    if (to.owner === me.id) return { error: 'That land is already yours.' };
    if (BY_ID[fromId].next.indexOf(toId) === -1) return { error: 'That land is not next door, or across a sea lane.' };
    const g = clone(game);
    challenge(g, me, fromId, toId, false);
    return { game: g };
  }

  if (action.type === 'end') {
    if (game.step === 'place' && game.reserve > 0) return { error: 'Place all your flags first.' };
    const g = clone(game);
    endTurn(g, me, false);
    return { game: g };
  }

  return { error: 'That is not a move in this game.' };
}

// Somebody who is not here has their turn played for them: the whole
// reserve goes onto their own land with the most foreign neighbours, and
// their turn ends without a challenge.
function playFor(game, id, ctx) {
  const g = clone(game);
  const player = { id, username: usernameOf(g, id) };
  let placed = 0;
  if (g.step === 'place' && g.reserve > 0) {
    let best = null;
    let bestForeign = -1;
    for (const l of MAP) {
      if (g.lands[l.id].owner !== id) continue;
      const foreign = l.next.filter((n) => g.lands[n].owner !== id).length;
      if (foreign > bestForeign) { bestForeign = foreign; best = l.id; }
    }
    if (best) {
      while (g.reserve > 0) { g.lands[best].flags += 1; g.reserve -= 1; placed += 1; }
      g.step = 'challenge';
      log(g, id, `${nameOf(g, id)} placed ${placed === 1 ? '1 flag' : placed + ' flags'} on ${BY_ID[best].name}, played for them.`, null);
    }
  }
  endTurn(g, player, true);
  return g;
}

// Every second: play the turn of somebody whose turn it is and who is not
// here, or who has let their turn run out.
function update(game, ctx) {
  if (game.winner != null || !game.order.length) return null;
  const id = currentId(game);
  const waited = ctx.now - game.turnAt;
  if ((!ctx.isOnline(id) && waited >= AWAY_MS) || waited >= TURN_MS) return playFor(game, id, ctx);
  return null;
}

// Somebody left mid-game: their lands go to the next seat still in the
// game, and if it was their turn the next player's begins.
function removePlayer(game, id, ctx) {
  if (!game.seats[id]) return game;
  const g = clone(game);
  const seat = g.seats[id].seat;
  const current = currentId(g);
  const idx = g.order.indexOf(id);
  if (idx !== -1) g.order.splice(idx, 1);
  delete g.seats[id];
  if (!g.order.length) return g;
  const nextId = g.order[seat % g.order.length];
  for (const key of Object.keys(g.lands)) {
    if (g.lands[key].owner === id) g.lands[key].owner = nextId;
  }
  if (current === id) {
    g.turn = seat % g.order.length;
    g.turnAt = ctx.now;
    g.step = 'place';
    g.reserve = reserveFor(g, g.order[g.turn]);
  } else {
    const ci = g.order.indexOf(current);
    if (ci !== -1) g.turn = ci;
  }
  if (g.order.length === 1) {
    g.winner = g.order[0];
    log(g, g.winner, `${nameOf(g, g.winner)} holds the whole map and wins!`, null);
  }
  return g;
}

// Over when one player holds every land: the winner first, then everyone
// else by lands held (score = lands held).
function result(game) {
  if (game.winner == null) return null;
  const ids = game.order.concat(game.out.slice().reverse());
  const ranked = ids
    .map((id) => ({ id, username: usernameOf(game, id), score: landsHeld(game, id) }))
    .sort((a, b) => (a.id === game.winner ? -1 : b.id === game.winner ? 1 : b.score - a.score));
  return ranked.map((r, i) => ({ ...r, place: i + 1 }));
}

// Everything the map needs is public in this game, so a viewer sees the
// whole state, with the map attached for the screen to draw.
function view(game) {
  return { ...game, map: MAP, regions: REGIONS, lanes: LANES };
}

// A fixed mid-game state for the staging demo (?demo=1): the viewer at
// their Challenge step in round 7, against three made-up players who are
// never online, so `update` plays their turns.
function demoGame(viewer) {
  const seats = [
    { id: viewer.id, username: viewer.username },
    { id: 900011, username: 'Maya' },
    { id: 900012, username: 'Dev' },
    { id: 900013, username: 'Lena' },
  ];
  // A log that could have led here, oldest last: the viewer placed at
  // Pinecrest, challenged twice and was held once, and everyone placed at
  // the start of the round. The screen shows it oldest-last.
  const history = [
    { id: 900011, text: 'Maya placed 3 flags on Oldmill.', dice: '+3' },
    { id: 900013, text: 'Lena placed 3 flags on Ridge.', dice: '+3' },
    { id: viewer.id, text: `${viewer.username} placed 4 flags on Pinecrest.`, dice: '+4' },
    { id: 900013, text: 'Lena lost 2 flags at Ridge.', dice: '4 vs 5 5' },
    { id: viewer.id, text: `${viewer.username} held Northgate against Lena.`, dice: '6 2 vs 6 1' },
    { id: 900012, text: 'Dev placed 3 flags on Millbrook.', dice: '+3' },
    { id: 900013, text: 'Lena took Marshside from Dev.', dice: '6 5 vs 4 2' },
    { id: viewer.id, text: `${viewer.username} held Pinecrest against Maya.`, dice: '6 5 vs 4 3' },
  ];
  const game = {
    order: seats.map((s) => s.id),
    seats: {},
    lands: {},
    turn: 0,
    round: 7,
    step: 'challenge',
    reserve: 0,
    turnAt: Date.now(),
    log: history.reverse().slice(0, LOG_MAX),
    lastRoll: null,
    winner: null,
    out: [],
    demo: true,
    // The challenge the demo opens with: Pinecrest picked, Oldmill the
    // target, so the pick outline and arrow are on the map at once.
    pick: { from: '4', to: '9' },
  };
  seats.forEach((s, seat) => { game.seats[s.id] = { username: s.username, seat }; });
  const held = {
    [viewer.id]: { '1': 2, '2': 3, '3': 1, '4': 8 },
    900011: { '9': 3, '10': 2, '11': 1, '17': 3, '18': 2 },
    900012: { '12': 4, '13': 2, '14': 3, '15': 1, '16': 2 },
    900013: { '5': 4, '6': 2, '7': 3, '8': 5, '19': 2, '20': 4 },
  };
  // The demo's flag counts, mid-game (matching `held`): the viewer's
  // Pinecrest is the land to challenge Oldmill from.
  const demoFlags = {
    '1': 2, '2': 3, '3': 1, '4': 8,
    '5': 4, '6': 2, '7': 3, '8': 5,
    '9': 3, '10': 2, '11': 1, '12': 4,
    '13': 2, '14': 3, '15': 1, '16': 2,
    '17': 3, '18': 2, '19': 2, '20': 4,
  };
  for (const l of MAP) {
    let owner = null;
    for (const s of seats) {
      if (held[s.id] && held[s.id][l.id] != null) owner = s.id;
    }
    game.lands[l.id] = { owner, flags: demoFlags[l.id] };
  }
  return game;
}

module.exports = {
  minPlayers: 2,
  maxPlayers: 6,
  leaderboard: 'wins',
  setup,
  act,
  update,
  removePlayer,
  result,
  view,
  demoGame,
  MAP,
  REGIONS,
  LANES,
};

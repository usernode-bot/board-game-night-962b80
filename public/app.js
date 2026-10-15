// Board Game Night's screen. The game room (public/game/room.js) keeps it
// up to date over a live connection; this draws the room's view on two
// screens:
//
// - the title screen: the game's name, the map, and the lobby (who is at
//   the table, join, start) with the leaderboard;
// - the game, filling the screen: the map with every land's flag token,
//   everyone's lands in the strip under it, and the turn's buttons and the
//   turn log. The results show over the map when somebody wins.
//
// Every move goes to the server, whose rules (game/rules.js) decide what
// happens; this page only shows it. The map is one SVG drawn from the MAP
// the view carries, so there is no other drawing code.
//
// Rendering builds elements and sets textContent, never innerHTML with
// people's words in it. Class names are whole literals so the Tailwind
// build can see them.

(function () {
  function $(id) { return document.getElementById(id); }
  var el = {
    title: $('title'),
    titleMap: $('title-map'),
    loading: $('loading'),
    error: $('error'),
    retry: $('retry'),
    lobbyBody: $('lobby-body'),
    lobbyNote: $('lobby-note'),
    players: $('players'),
    empty: $('empty'),
    join: $('join'),
    start: $('start'),
    watch: $('watch'),
    resume: $('resume'),
    newGame: $('new-game'),
    leave: $('leave'),
    leadersSection: $('leaders-section'),
    leaders: $('leaders'),
    stage: $('stage'),
    toTitle: $('to-title'),
    stageNote: $('stage-note'),
    pillDot: $('turn-pill-dot'),
    pillText: $('turn-pill-text'),
    map: $('map'),
    strip: $('game-players'),
    pick: $('pick'),
    challenge: $('challenge'),
    endTurn: $('end-turn'),
    log: $('log'),
    over: $('over'),
    overLine: $('over-line'),
    standings: $('standings'),
    again: $('again'),
    overTitle: $('over-title'),
    demoNote: $('demo-note'),
    connection: $('connection'),
    toast: $('toast'),
    toastText: $('toast-text'),
  };

  var view = null;
  var screen = 'title'; // or 'stage'
  var leftGameNo = null; // a game you stepped out of to the title screen
  var watching = false; // on the stage without playing
  // Your picks during the Challenge step, kept here between renders.
  var pickedFrom = null;
  var pickedTo = null;

  function h(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  var toastTimer = null;
  function toast(message) {
    el.toastText.textContent = message;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.hidden = true; }, 3200);
  }

  function isMe(id) {
    return !!(view && view.you && view.you.id === id);
  }
  // The server writes the log in the third person; your own name reads
  // better in the first person, and nobody's name carries an @ on screen.
  function youify(text) {
    var name = view && view.you ? view.you.username : null;
    if (name) {
      var escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp('\\b' + escaped + '(?![A-Za-z0-9_])', 'gi'), 'you');
      if (text.slice(0, 3) === 'you') text = 'Y' + text.slice(1);
    }
    return text;
  }
  function seatOf(game, id) {
    return game && game.seats[id] ? game.seats[id].seat : 0;
  }
  function seatClass(seat) {
    return 'seat-' + (seat % 6);
  }

  // ── The map, as one SVG ───────────────────────────────────────────────

  var NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function mapData() {
    if (!view) return null;
    return (view.game && view.game.map) || (view.rules && view.rules.map) || null;
  }
  function lanesData() {
    if (!view) return [];
    return (view.game && view.game.lanes) || (view.rules && view.rules.lanes) || [];
  }

  function arrowBetween(a, b) {
    var dx = b.cx - a.cx;
    var dy = b.cy - a.cy;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len;
    var uy = dy / len;
    var px = -uy;
    var py = ux;
    var sx = a.cx + ux * 15;
    var sy = a.cy + uy * 15;
    var ex = b.cx - ux * 15;
    var ey = b.cy - uy * 15;
    var mx = (sx + ex) / 2 - uy * 18;
    var my = (sy + ey) / 2 + ux * 18;
    return {
      curve: 'M' + sx + ' ' + sy + ' Q' + mx + ' ' + my + ' ' + ex + ' ' + ey,
      head: 'M' + (ex - ux * 10 + px * 6) + ' ' + (ey - uy * 10 + py * 6) +
        ' L' + ex + ' ' + ey +
        ' L' + (ex - ux * 10 - px * 6) + ' ' + (ey - uy * 10 - py * 6),
    };
  }

  // g: the game's state as this viewer sees it, or null for the unclaimed
  // map on the title screen. taps: whether the lands answer taps.
  function drawMap(svg, g, taps) {
    var map = mapData();
    if (!map) return;
    var lanes = lanesData();
    var lands = g ? g.lands : null;
    var seats = g ? g.seats : null;
    var phase = view ? view.phase : null;

    svg.setAttribute('viewBox', '0 0 358 330');
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var grid = s('g', {}, svg);
    for (var i = 0; i < lanes.length; i++) {
      s('path', { d: lanes[i][2], class: 'lane' }, grid);
    }

    var shapes = s('g', {}, svg);
    for (var n = 0; n < map.length; n++) {
      var land = map[n];
      var state = lands ? lands[land.id] : null;
      var cls = 'land' + (state ? ' ' + seatClass(seatOf(g, state.owner)) : ' land-free');
      var node = s('path', { d: land.path, class: cls, 'data-territory': land.id }, shapes);
      if (taps && phase === 'playing' && !g.winner && isMe(currentId(g))) node.classList.add('land-tap');
      // The picked land gets a thick outline, the target a dashed one.
      if (state && land.id === pickedFrom) s('path', { d: land.path, class: 'land land-from' }, shapes);
      if (state && land.id === pickedTo) s('path', { d: land.path, class: 'land land-to' }, shapes);
    }

    // A curved arrow from the picked land to the one it challenges.
    if (g && pickedFrom && pickedTo) {
      var from = null;
      var to = null;
      for (var m = 0; m < map.length; m++) {
        if (map[m].id === pickedFrom) from = map[m];
        if (map[m].id === pickedTo) to = map[m];
      }
      if (from && to) {
        var arrow = arrowBetween(from, to);
        s('path', { d: arrow.curve, class: 'arrow' }, shapes);
        s('path', { d: arrow.head, class: 'arrow' }, shapes);
      }
    }

    var tokens = s('g', {}, svg);
    for (var t = 0; t < map.length; t++) {
      var ld = map[t];
      var st = lands ? lands[ld.id] : null;
      var token = s('circle', { cx: ld.cx, cy: ld.cy, r: 12, class: 'token-circle', 'data-territory': ld.id }, tokens);
      if (taps && st && phase === 'playing' && !g.winner && isMe(currentId(g))) token.classList.add('land-tap');
      var num = s('text', { x: ld.cx, y: ld.cy + 4, class: 'token-num' }, tokens);
      num.textContent = st ? String(st.flags) : '';
      var title = s('title', {}, token);
      title.textContent = ld.name + (st ? ', ' + st.flags + ' flags' : '');
    }
  }

  function currentId(g) {
    return g.order[g.turn % g.order.length];
  }

  // ── The game screen ───────────────────────────────────────────────────

  function drawStage() {
    var g = view.game;
    var playing = view.phase === 'playing';
    var over = view.phase === 'over';
    var current = playing ? currentId(g) : null;
    var mine = playing && isMe(current);
    var step = g.step;

    el.stageNote.textContent = playing
      ? 'Round ' + g.round + ', ' + (step === 'place' ? 'place flags' : 'challenges')
      : 'Game over';
    if (current != null) {
      el.pillDot.className = 'seat-dot ' + seatClass(seatOf(g, current));
      el.pillText.textContent = mine ? 'Your turn' : (g.seats[current] ? g.seats[current].username : '?') + '\'s turn';
    } else {
      el.pillDot.className = 'seat-dot';
      el.pillText.textContent = 'Nobody\'s turn';
    }

    drawMap(el.map, g, true);

    // Everyone's lands.
    el.strip.textContent = '';
    for (var i = 0; i < view.players.length; i++) {
      var p = view.players[i];
      var seat = seatOf(g, p.id);
      var held = 0;
      for (var key in g.lands) if (g.lands[key].owner === p.id) held += 1;
      var card = h('div', 'pl' + (p.id === current ? ' on' : ''));
      var name = h('div', 'pl-name');
      var dot = h('span', 'seat-dot ' + seatClass(seat));
      name.appendChild(dot);
      name.appendChild(h('span', '', isMe(p.id) ? 'You' : p.username));
      card.appendChild(name);
      card.appendChild(h('div', 'pl-lands', held + (held === 1 ? ' land' : ' lands')));
      el.strip.appendChild(card);
    }

    drawControls(g, playing, mine, step, current);
    drawLog(g);
    drawOver(g, over);
  }

  function drawControls(g, playing, mine, step, current) {
    var dice = 0;
    if (mine && step === 'challenge' && pickedFrom) {
      var from = g.lands[pickedFrom];
      if (from && from.owner === view.you.id) dice = Math.min(3, from.flags - 1);
      else { pickedFrom = null; pickedTo = null; }
    }
    var neighbour = mine && step === 'challenge' && pickedFrom && pickedTo &&
      g.lands[pickedTo] && g.map.find(function (l) { return l.id === pickedFrom; }).next.indexOf(pickedTo) !== -1;

    var showChallenge = false;
    el.pick.textContent = '';
    if (mine && step === 'place') {
      el.pick.appendChild(h('span', '', 'Tap your lands to place '));
      el.pick.appendChild(h('strong', '', String(g.reserve) + (g.reserve === 1 ? ' flag' : ' flags')));
    } else if (mine && step === 'challenge') {
      showChallenge = true;
      if (pickedFrom && pickedTo) {
        el.pick.appendChild(h('span', '', 'From '));
        el.pick.appendChild(h('strong', '', landLabel(g, pickedFrom)));
        el.pick.appendChild(h('span', '', ' to '));
        el.pick.appendChild(h('strong', '', landLabel(g, pickedTo)));
      } else if (pickedFrom) {
        el.pick.appendChild(h('span', '', 'From '));
        el.pick.appendChild(h('strong', '', landLabel(g, pickedFrom)));
        el.pick.appendChild(h('span', '', '. Tap a land next door to challenge.'));
      } else {
        el.pick.textContent = 'Tap one of your lands with 2 or more flags.';
      }
    } else if (playing) {
      var who = g.seats[current];
      el.pick.textContent = (isMe(current) ? 'You are' : (who ? who.username + ' is' : 'Someone is')) +
        ' playing' + (who && !playerHere(current) ? ', played for them' : '');
    } else {
      el.pick.textContent = 'The game is over.';
    }

    el.challenge.hidden = !showChallenge;
    if (showChallenge) {
      el.challenge.textContent = pickedFrom ? 'Challenge with ' + dice + ' dice' : 'Challenge';
      el.challenge.disabled = !(pickedFrom && pickedTo && neighbour);
    }
    el.endTurn.disabled = !mine || (step === 'place' && g.reserve > 0);
  }

  function landLabel(g, id) {
    var land = g.map.find(function (l) { return l.id === id; });
    var st = g.lands[id];
    return (land ? land.name : '?') + ' (' + (st ? st.flags : 0) + ')';
  }
  function playerHere(id) {
    for (var i = 0; i < view.players.length; i++) if (view.players[i].id === id) return view.players[i].here;
    return true;
  }

  function drawLog(g) {
    el.log.textContent = '';
    for (var i = 0; i < g.log.length; i++) {
      var entry = g.log[i];
      var li = h('li', 'list-row');
      li.appendChild(h('span', 'seat-dot ' + seatClass(seatOf(g, entry.id))));
      li.appendChild(h('span', 'log-what', youify(entry.text)));
      if (entry.dice) li.appendChild(h('span', 'log-dice', entry.dice));
      el.log.appendChild(li);
    }
  }

  function drawOver(g, over) {
    var done = over && view.results;
    el.over.hidden = !done;
    if (!done) return;
    var winner = view.results[0];
    el.overLine.textContent = isMe(winner.id) ? 'You won!' : winner.username + ' won!';
    el.standings.textContent = '';
    for (var i = 0; i < view.results.length; i++) {
      var r = view.results[i];
      var li = h('li', 'list-row');
      li.appendChild(h('span', 'text-small text-muted', String(r.place)));
      var name = h('span', 'log-what font-semibold', isMe(r.id) ? 'You' : r.username);
      li.appendChild(h('span', 'seat-dot ' + seatClass(seatOf(g, r.id))));
      li.appendChild(name);
      li.appendChild(h('span', 'log-dice', r.score + (r.score === 1 ? ' land' : ' lands')));
      el.standings.appendChild(li);
    }
  }

  // ── The title screen ──────────────────────────────────────────────────

  function drawTitle() {
    var you = view.you;
    var joined = !!(you && you.joined);
    var phase = view.phase;

    drawMap(el.titleMap, view.game, false);

    el.players.textContent = '';
    for (var i = 0; i < view.players.length; i++) {
      var p = view.players[i];
      var li = h('li', 'list-row');
      li.setAttribute('data-player', String(p.id));
      var name = h('span', 'log-what font-semibold');
      name.appendChild(h('span', 'seat-dot ' + seatClass(i)));
      name.appendChild(document.createTextNode(isMe(p.id) ? 'You' : p.username));
      li.appendChild(name);
      li.appendChild(h('span', 'log-dice', !p.here ? 'away' : phase === 'lobby' ? 'ready' : 'playing'));
      el.players.appendChild(li);
    }
    if (phase === 'lobby' && view.players.length) {
      for (var n = view.players.length; n < view.rules.maxPlayers; n++) {
        var open = h('li', 'list-row');
        name = h('span', 'log-what text-muted');
        name.appendChild(h('span', 'seat-dot'));
        name.appendChild(document.createTextNode('Open seat'));
        open.appendChild(name);
        el.players.appendChild(open);
      }
    }
    el.empty.hidden = !!view.players.length;
    el.players.hidden = !view.players.length;

    var lobby = phase === 'lobby';
    var on = phase === 'playing';
    var over = phase === 'over';
    el.join.hidden = !lobby || joined;
    el.start.hidden = !lobby || !joined;
    el.start.disabled = view.players.length < view.rules.minPlayers;
    el.leave.hidden = !joined || over;
    el.watch.hidden = !on || joined;
    el.resume.hidden = !on || !joined;
    el.newGame.hidden = !over;
    el.leave.textContent = on ? 'Leave the game' : 'Leave';

    var note = '';
    if (!you) note = 'Make an account to play. You can watch any game.';
    else if (lobby) note = joined ? 'Anyone at the table can start. Away players have their turns played for them.' : 'Take a seat to play in the next game.';
    else if (on) note = joined ? 'You are playing.' : 'You can watch it, and join the next one.';
    else if (view.results) note = (isMe(view.results[0].id) ? 'You' : view.results[0].username) + ' won it.';
    el.lobbyNote.textContent = note;
    el.lobbyNote.hidden = !note;
  }

  function drawLeaders() {
    el.leadersSection.hidden = !view.leaders.length;
    el.leaders.textContent = '';
    for (var i = 0; i < view.leaders.length; i++) {
      var l = view.leaders[i];
      var li = h('li', 'list-row');
      li.setAttribute('data-leader', '');
      li.appendChild(h('span', 'text-small text-muted', String(i + 1)));
      li.appendChild(h('span', 'log-what font-semibold', l.username));
      li.appendChild(h('span', 'log-dice', l.wins + (l.wins === 1 ? ' win' : ' wins') + ' of ' + l.played));
      el.leaders.appendChild(li);
    }
  }

  // ── Which screen ──────────────────────────────────────────────────────

  function show(next) {
    screen = next;
    el.title.hidden = screen !== 'title';
    el.stage.hidden = screen !== 'stage';
  }

  // A player goes to the table when their game starts (unless they stepped
  // out of it), and the lobby brings everyone back to the title screen.
  function chooseScreen() {
    var joined = !!(view.you && view.you.joined);
    if (view.phase === 'lobby') {
      watching = false;
      show('title');
    } else if (view.phase === 'playing' && joined && leftGameNo !== view.gameNo) {
      watching = false;
      show('stage');
    }
  }

  function render(next) {
    view = next;
    el.loading.hidden = true;
    el.error.hidden = true;
    el.lobbyBody.hidden = false;
    // Your picks are yours only while it is your Challenge step.
    if (!(view.phase === 'playing' && view.game && !view.game.winner &&
          view.game.order[view.game.turn % view.game.order.length] === view.you.id &&
          view.game.step === 'challenge')) {
      pickedFrom = null;
      pickedTo = null;
    }
    // The staging demo's line.
    var demo = !!(view.game && view.game.demo);
    el.demoNote.hidden = !demo;
    document.body.classList.toggle('demo-on', demo);

    chooseScreen();
    drawTitle();
    drawLeaders();
    if (screen === 'stage') drawStage();
  }

  // ── Taps on the map ───────────────────────────────────────────────────

  function onLandTap(id) {
    var g = view && view.game;
    if (!g || view.phase !== 'playing' || g.winner != null) return;
    if (!isMe(currentId(g))) return;
    var st = g.lands[id];
    if (!st) return;
    if (g.step === 'place') {
      if (st.owner !== view.you.id) { toast('Choose one of your own lands.'); return; }
      room.act({ type: 'place', land: id });
    } else if (g.step === 'challenge') {
      if (st.owner === view.you.id) {
        if (st.flags < 2) { toast('A land needs at least 2 flags to challenge.'); return; }
        pickedFrom = id;
        pickedTo = null;
      } else if (pickedFrom) {
        var land = g.map.find(function (l) { return l.id === pickedFrom; });
        if (land && land.next.indexOf(id) !== -1) pickedTo = id;
        else { toast('That land is not next door, or across a sea lane.'); return; }
      } else {
        toast('Tap one of your lands first.');
        return;
      }
      drawStage();
    }
  }

  // ── Wiring ────────────────────────────────────────────────────────────

  var room = window.GameRoom.connect({
    onView: render,
    onError: toast,
    onStatus: function (status) {
      el.connection.hidden = status !== 'offline';
      el.connection.textContent = 'Reconnecting…';
    },
    onFailed: function () {
      if (view) return;
      el.loading.hidden = true;
      el.error.hidden = false;
    },
  });

  el.map.addEventListener('click', function (e) {
    var target = e.target.closest ? e.target.closest('[data-territory]') : null;
    if (target) onLandTap(target.getAttribute('data-territory'));
  });
  el.challenge.addEventListener('click', function () {
    if (!pickedFrom || !pickedTo) return;
    el.challenge.disabled = true;
    room.act({ type: 'challenge', from: pickedFrom, to: pickedTo });
  });
  el.endTurn.addEventListener('click', function () {
    el.endTurn.disabled = true;
    room.act({ type: 'end' });
  });
  el.join.addEventListener('click', function () { room.join(); });
  el.start.addEventListener('click', function () { leftGameNo = null; room.start(); });
  el.leave.addEventListener('click', function () { room.leave(); show('title'); });
  el.watch.addEventListener('click', function () { watching = true; show('stage'); render(view); });
  el.resume.addEventListener('click', function () { leftGameNo = null; show('stage'); render(view); });
  el.newGame.addEventListener('click', function () { room.again(); });
  el.toTitle.addEventListener('click', function () {
    if (view && view.phase === 'playing') leftGameNo = view.gameNo;
    show('title');
  });
  el.again.addEventListener('click', function () { leftGameNo = null; room.again(); });
  el.overTitle.addEventListener('click', function () { show('title'); });
  el.retry.addEventListener('click', function () { window.location.reload(); });
})();

# Board Game Night — notes for Claude Code

This app runs on **Homeroom**. The platform conventions are the single
source of truth for platform-wide behavior (auth model, `USERNODE_ENV`,
public/private tables, "don't `git push`", etc.):

**Platform conventions (authoritative, always current):**
https://app.onhomeroom.com/claude.md

**Inside Homeroom** (its dev chat, and Homeroom bot's builds), do not
fetch that URL: what applies to your change is already in your
instructions, and the `homeroom` MCP server's
`get_platform_conventions` reads any one section of the conventions
when you need it. The two sections below are for working outside
Homeroom; skip them there.

**Anywhere else** (Claude Code run against this repo locally, or another
harness), fetch it at the start of each session. The hosted copy is
updated in place when platform rules change, so fetching it gives you
today's rules, not a stale snapshot.

## Connector permission prompts (outside Homeroom)

This repo ships `.claude/settings.json`, which allows the **read-only**
Homeroom connector calls (`mcp__homeroom__get_*`,
`…__list_*`, `…__whoami`) once you accept the workspace trust dialog.
See `.claude/README.md` for the whole story, including what to do if you
are still being prompted.

## Check that this checkout is current

You may be working in a fork of this app whose `main` is behind the app's
canonical repository, and nothing in the checkout says so: `git fetch origin`
compares the fork with itself. This matters before you **read** code to answer
a question about how the app behaves now, not only before you edit it.

The canonical repository is named in `.claude/homeroom-canonical-repo`. Check against
it, not against `origin`:

```sh
git fetch "$(cat .claude/homeroom-canonical-repo)" main
git merge-base --is-ancestor FETCH_HEAD HEAD && echo current || echo behind
```

`behind` means this checkout does not contain the canonical `main`. To answer
a question, read the canonical code instead (`git show FETCH_HEAD:<path>`,
`git grep <pattern> FETCH_HEAD`). To change code, start from the exact base
commit your Homeroom work order gives, and never merge or rebase onto the
canonical `main` yourself: which commit a change is diffed against decides
what the group votes on. With the Homeroom connector, `get_checkout_status`
answers the same question.

A session-start hook (`.claude/hooks/homeroom-freshness.sh`, see `.claude/README.md`) runs
this check for you and tells you when you are behind. It is silent offline, so
its silence is not proof the checkout is current. Inside Homeroom (its dev
chat, and Homeroom bot's builds) the platform fixes the base commit, and none
of this applies.

## Starter template: Board game starter

This app was created from Homeroom's **Board game starter**: A dice race for the whole project: everyone rolls in turn, a ladder takes you up, a slide takes you back, and the first to the finish wins.
It is a working game, and its first version is the game its creator
described, built ON it: keep what fits, change what does not, and replace
the example game's rules and screen freely. Never delete the game room
layer to start over; it is what makes the game multiplayer.

Where things are:

- `game/room.js` and `game/live.js`: the game room. Who is playing, the
  lobby, starting a game, turns, timers or a live tick, each player's view,
  saved results and the leaderboard, kept in Postgres (tables
  `game_rooms` and `game_results`) and sent to every player over one
  WebSocket (`/api/live`), with `GET /api/room` and `POST /api/room/*`
  as the same thing over plain requests. It knows nothing about the game.
  Its header comment is the contract a game's rules keep.
- `game/rules.js`: this game's rules, as plain functions of the game's
  state: set up a game, apply a move, what each player may see, when it is
  over and who won. Most changes to how the game plays happen here.
- `api.js`: wires the rules into the room.
  `server.js` mounts it after the sign-in check, runs `migrate()` on
  boot (which also seeds a few obviously fake rows in a staging preview)
  and hands it the server for the live connection (`attach`).
- `public/game/room.js`: the page's side of the room: the live
  connection, falling back to asking every couple of seconds, and
  `join()`, `start()`, `act(move)`, `input(controls)`.
- `public/index.html` and `public/app.js`: the screens (a title screen with
  the lobby, then the game filling the screen), and `public/scene.css`: the
  game's own look.
- The board (its squares, ladders and slides) is set at the top of `game/rules.js`; the screen draws whatever the game's state says, as one SVG.
- The scene's look (the table, the board, the pieces, the die) is `public/scene.css`, the same in both looks.
- `dapp.json` `tests`: the checks every proposal runs. Keep them passing,
  and change them when you change what they look for.

Rules the room keeps for you, and a new game should too:

- The server decides. A move is checked by `rules.act` on the server; the
  page only shows the result. A guest (no account) can watch, never play.
- Time on the server is `Date.now()` inside the room: games run on real
  time, not a preview's chosen `req.now`.
- Content rules: no weapons, combat or attacking characters, and no
  gambling or wagering. Shooting games are out; breaking rocks, racing,
  building and quizzes are fine.

Update `README.md` when what the game does changes.

Keep the `usernode-dev-console@1` forwarder `<script>` and the bridge
`<script>` when rewriting the HTML: both are platform infrastructure.
The page around the game is built from the design kit, which is not
placeholder either; a game drawn as its own scene may keep one look of its
own, and should say so under "## Design".

The screen has a light and a dark look and follows the viewer's Homeroom
theme, switching live when they change it: the theme `<script>` right after
the bridge tag sets a `dark` class on `<html>`. Keep that script, and give
everything you build both looks (the design kit's colour tokens carry both), unless one
fixed look is the point of this app, like a game's own scene; then say so
under "## Design" below. Unless a request asks for one, add
no theme picker: the viewer's Homeroom setting is the control. "The
platform's light/dark theme inside the app frame" in the platform
conventions has the details.

If a rule below this line conflicts with the hosted conventions, the
hosted conventions win. This file is **app-specific** — write down
things about *this* app that belong in the repo: product intent,
data-model quirks, style preferences, opt-in policies (e.g. which
tables you've marked private), etc.

---

## About Board Game Night

A simplified game of taking land for the whole project, from the spec of
its first version (Homeroom issue #1): 20 lands in 5 regions dealt out at
random, two-step turns (place flags, then challenge a neighbour with dice),
the last player holding land wins. The wording is deliberately about flags
and challenges — never troops, attacks or weapons — and there is no
gambling anywhere in it. Players' colours are fixed per seat (the same
player keeps their colour in both looks) and are drawn at half strength
over the land fills.

## Design

This app's look. The first real version fills in the blanks; every later
change follows it, and updates it when a request changes the look on purpose.

- **Palette:** parchment. Light: warm parchment neutrals (ground 244 240
  232, surface 255 255 255, raised 236 231 221, fg 32 28 24, muted 93 86
  78, line 221 214 201), sea 206 222 222, land fill 250 246 238, accent
  rust red 176 58 30 with white on-accent. Dark: a night map (ground 28 25
  22, surface 40 36 32, raised 52 47 42, fg 242 237 228, muted 176 168
  156, line 72 66 58, sea 30 48 52, accent 232 120 90 with on-accent 40 14
  6). Player colours are the same in both looks: blue 29 106 150, green 58
  120 66, purple 138 82 148, gold 176 120 20, teal 20 120 130, rose 170 60 90.
- **Signature element:** the hand-drawn parchment map — irregular land
  outlines, dotted sea lanes, a round flag-count token on every land, the
  picked land in a thick accent outline with the target dashed and a
  curved arrow between them.
- **Type scale:** `text-title`, `text-heading`, `text-body`, `text-small`
  on a rounded face (`ui-rounded` is the app's sans in
  `tailwind.config.js`).
- **One fixed look:** the game itself is drawn as its own scene (the map
  fills the screen and owns its look), but the scene's colours are all
  tokens, so the whole thing still follows the viewer's Homeroom theme —
  parchment in the light, a night map in the dark. No theme picker of its
  own.

The kit is in `styles/tailwind-input.css`: colour tokens with a light and
a dark value (named in `tailwind.config.js`), and a few components
(`page-column`, `btn-primary`, `btn-secondary`, `field`, `list`, `list-row`,
`card`, `section-label`, `skeleton`, `state-empty`, `state-error`).
Re-theme by changing the token values there, keeping every text pair at
4.5:1 or more in both looks.

- Colour comes only from the tokens (`bg-ground`, `bg-surface`,
  `text-fg`, `text-muted`, `border-line`, `bg-accent` with
  `text-on-accent`, ...): never a raw hex value or a stock palette class.
- Tap targets are at least 44 px; the buttons and fields already are.
- A field's label says what it is; its placeholder, if any, is an example
  that says so ("e.g. 5.0"), never a bare value that could pass for one
  already entered.
- Each screen sits in `page-column`, one centred column on a wide window.
- Every screen that loads data has honest loading, empty and error states.
  Never show the empty state while loading or after a failure; an error says
  what failed, what still works, and offers Retry. Loading has the content's
  own shape (its rows, with `skeleton` bars for their text).
- Seed obviously fake staging demo data so the populated screen can be seen
  ("Staging mock data" in the platform conventions).
- No cards in cards, no uppercase eyebrows, no emoji as icons.
- A header that shows the app's own mark shows the project's icon there
  (the emoji in `dapp.json`'s `icon` block) or no mark at all: never an
  empty tile, and never `brand/icon.png`, which the app does not serve.

## App-specific conventions

_(optional — e.g. "all currency values stored as integer cents, not
floats"; "the `posts` table is append-only"; "avoid adding new
dependencies"; etc.)_

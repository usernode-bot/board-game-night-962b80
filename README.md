# Board Game Night

> **Game starter.** This repo was scaffolded by Homeroom from its
> **Board game starter**, a game that already works and is multiplayer.
> Homeroom bot builds the game its creator described on top of it.

A simplified board game of taking land, for the whole project: the map is
20 lands in 5 regions, dealt out evenly at random at the start. Each turn
has two steps — **place** new flags on your own lands (one per three lands
held, at least three, plus 2 for each whole region you hold), then
**challenge** a land next door: highest dice win in pairs, a tie goes to
the holder, the loser of each pair removes one flag, and when a land runs
out of flags you take it and the dice you rolled with move in. Challenge as
often as you like, then end your turn. The last player holding land wins,
and away players have their turns played for them, so the game never waits
on an empty seat.

## How it plays

- **The title screen**: the map as a picture, the lobby (who is at the
  table, join, start) with the leaderboard of past wins.
- **The game fills the screen**: the hand-drawn parchment map with every
  land's round flag-count token, everyone's lands in a strip under it, the
  turn log with the dice, and the results over the map at the end.
- **Two-step turns**: tap your own lands one at a time to place flags, then
  tap one of your lands with 2+ flags and a land next door (or across a
  dotted sea lane) to challenge with up to 3 dice. The holder rolls up to 2.
- **2 to 6 players**, 2 lands and 6 players deal evenly; uneven deals give
  the extra lands to the earliest seats. A guest can watch, never play.

## What's here

- **Live for everyone**: every move shows on every screen at once, over
  one connection per player, with a fallback that asks every couple of
  seconds.
- **Sign-in**: the server verifies the platform-issued user token on every
  request and live connection, so the game knows who is playing.
- **Database**: the app has its own Postgres database; the room state and
  saved results live in the `game_rooms` and `game_results` tables.
- **Styling**: Tailwind CSS, precompiled by `npm run build` during image
  creation, following the platform's light or dark theme (the map follows
  it too: parchment by day, a night map in the dark look).

## Changing it

To change this game, ask Homeroom bot: open the app on Homeroom, tap the
Homeroom icon in the header, then **Suggest an improvement**, and describe
what you want in plain English. You can also run Claude Code against this
repo directly; start with `CLAUDE.md`, which says where the game's rules
live and points at the platform rules.

# Board Game Night

> **Game starter.** This repo was scaffolded by Homeroom from its
> **Board game starter**, a game that already works and is multiplayer.
> Homeroom bot builds the game its creator described on top of it.

A dice race for the whole project: everyone rolls in turn, a ladder takes you up, a slide takes you back, and the first to the finish wins.

What the starter already does:

- **A title screen with the lobby**: the board lying on the table, the seats around it, and anyone in the project joins; anyone who joined starts the game.
- **The game fills the screen**: the board stretches to fit, everyone's piece hops square by square, and the dice tray shows whose turn it is. A six rolls again, and a player who is away has their roll made for them, so a game never waits on an empty seat.
- **A board of 30 squares** with ladders and slides, drawn from the game's state, the results over the table at the end, and a leaderboard of wins.
- **Live for everyone**: every roll shows on every screen at once, over one connection per player.

And what every Homeroom app gets:

- **Sign-in**: the server verifies the platform-issued user token (an
  RS256 JWT) on every request and every live connection, so the game
  already knows who is playing.
- **Database**: the app has its own Postgres database. Its tables are
  created on boot by `api.js` and `game/room.js`.
- **Styling**: Tailwind CSS, precompiled by `npm run build` during image
  creation, following the platform's light or dark theme.

## Changing it

To change this game, ask Homeroom bot: open the app on Homeroom, tap the
Homeroom icon in the header, then **Suggest an improvement**, and describe
what you want in plain English. You can also run Claude Code against this
repo directly; start with `CLAUDE.md`, which says where the game's rules
live and points at the platform rules.

# Our Little Arcade 💕

A private game website for two. It's a static site (no server of its own) — 8 files that must stay together:

```
index.html  config.js  extras.js  garden.js  lovegarden.js  sync.js  videocall.js  extras.css
```
(`serve.js` is only for testing on your own computer: `node serve.js` → http://localhost:5190)

## 1) Put it online with GitHub Pages
1. On github.com create a **new** repository, e.g. `our-little-arcade` (Public is fine — Pages on free accounts needs public; nothing private is in the code).
2. Push this folder to it (from `E:\love-games`):
   ```
   git remote add origin https://github.com/<your-username>/our-little-arcade.git
   git push -u origin main
   ```
3. On GitHub: repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
4. After ~1 minute your link is `https://<your-username>.github.io/our-little-arcade/` — send it to her. (It's `https`, which video calls need.)

## 2) Your own relay (matchmaking + video that works on every network)
The site connects you two directly (peer to peer). A tiny separate service — **`love-arcade-relay`** (its own folder/repo, its own Render service, nothing shared with any other app) — makes that reliable:
- it introduces your two browsers, so you no longer depend on the free public server, and
- it hands out **TURN** credentials so **video calls work on strict Wi-Fi, mobile networks and VPNs**.

Set it up once — see `E:\love-arcade-relay\README.md`. When it's live, open `config.js` here, set

```js
relay: 'love-arcade-relay.onrender.com',   // your relay's address, no https://
```
commit and push again. Until then (or if the relay is asleep/offline) the site automatically falls back to the free public server — it never breaks.

## 🔒 Room lock
Room codes are 6 characters (about 887 million combinations). Once the two of you are connected the room is **locked**: anyone else who tries to join is turned away and can never kick your partner out. Connections that don't complete the hello handshake within 6 seconds are dropped. If your connection genuinely drops (Wi-Fi switch), the room re-opens so your partner can walk straight back in.

## Video calls 📹
Tap **📹** at the top while connected. Your love taps **Answer**. The call bar is docked at the top and pushes the page down, so it never covers your games. ↕️ changes size, ▴ shrinks it, 🎤/📷 mute, 📵 hangs up. Camera/microphone need the `https://` link.

## One shared save
Progress lives on **both** devices and merges every time you connect, so it doesn't matter who creates the room on a given day.

## What's inside
- **Today:** daily quests + 🔥 streak, today's question, "send a little love", mood + their local time, countdown, days together
- **Talk:** Deep Talk (72 questions + your own "Just Us"), Guess My Pick, quiz, would you rather, never have I ever, two truths & a lie, truth or dare, love jar, scratch card, fortune cookie
- **Play:** Love Garden (12 levels + endless, 12 plants), Flappy Cupid, 2048, Snake, Quick Draw, Reversi, Couple Trivia, Draw & Guess, Tic-Tac-Toe, Connect 4, Memory, Battleship, Rock Paper Scissors, Hangman, Heart Catcher
- **Together:** shared lists, memory wall, love letters, together timer, Mochi the pet, drawing, heartbeat sync, date spinner, trophy room

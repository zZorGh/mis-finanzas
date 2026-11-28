---
name: run-misoles
description: Run, launch, drive, test or screenshot the MiS²oles personal-finance web app (this repo) with example data. Use when asked to run or start the app, take screenshots, try a user flow (register an expense, open Settings, mobile or dark mode), or check a change in the real UI rather than only in tests.
---

MiS²oles is a single-page app with no framework. `index.html` is generated from `src/`. Drive it with
`.claude/skills/run-misoles/driver.cjs`: it starts the local server if needed, opens the app in headless Chromium with
the example account (`dev/demo.json`), blocks the internet, and runs one command per line from stdin.

Paths are relative to the repo root. Verified on Windows 11 with Git Bash and Node 26.

## Setup (once)

```bash
cd dev && npm install && npx playwright install chromium
```

## Build (after editing `src/`)

```bash
node dev/armar.js
```

Never edit `index.html` by hand.

## Run (agent path)

```bash
node .claude/skills/run-misoles/driver.cjs <<'EOF'
open #noviembre
ss 1-mes
click .caplink
fill #sa :: 18
fill #sd :: Taxi de prueba
click #ssrc [data-src="liq:0"]
click #sheet .sact button.p
data
ss 2-guardado
errors
EOF
```

Screenshots go to `$SHOTS` (default: `misoles-shots` in the system temp folder); `ss` prints the full path. **Open the
image and look at it.** Exit code is 1 if any command failed or the app threw.

| Command | What it does |
|---|---|
| `set w N` / `set h N` | Viewport. Width under 500 emulates a phone |
| `set theme dark` · `set skin cuadre\|escalon\|original` · `set lang en` | Appearance (before `open`) |
| `set date 2026-12-10T12:00:00-05:00` | Frozen clock (default 22 Nov 2026, Lima) |
| `set data empty` | Start with no data (welcome screen). Default `demo` |
| `open [#hash]` | Fresh browser context and load. `set` only applies on the next `open` |
| `go ajustes` | Change route inside the same session (keeps what you saved) |
| `click` / `hover` / `count` / `text` SELECTOR | First match |
| `fill SELECTOR :: TEXT` | The separator is ` :: ` |
| `press KEY` · `wait MS` · `eval JS` | Keyboard (`n` opens registration on desktop), sleep, page script |
| `data` | Last expenses and account balances of November 2026 |
| `ss NAME [full]` · `errors` · `quit` | Screenshot, JavaScript errors, stop |

Useful routes: `#resumen`, `#enero`…`#diciembre`, `#ajustes`, `#capturar`. Registration: `.caplink` (desktop) or `#fab`
(phone); the quick form has `#sa` amount, `#sd` concept, `#stype`, `#ssub`, `#ssrc`, `#sqk [data-sgrp]` (group).
Wizard: `[data-mode="manual"]`; sentence mode: `[data-mode="auto"]` then `#smsg`.

## Test

```bash
cd dev && node paralelo.js t90
```

```bash
cd dev && npm run lint
```

`cd dev && npm run verificar` runs everything (about 4 minutes) and writes the seal that the pre-push hook requires. Do
not edit the app while it runs.

## Run (human path)

`cd dev && npm run serve`, then build the wrapper with `npm run wrap` and open http://127.0.0.1:8765/wrap-repo.html in a
browser. Ctrl+C stops it.

## Gotchas

- The driver loads `dev/wrap-repo.html` (the real `index.html` inside a test shell, CSP removed), **demo mode with no
  login**. Sign-in, sync and the CSP need the tests with a simulated Supabase (`t73`, `t87`, `t118`).
- The shell opens the month view on the «Todo» tab. For the real phone behaviour use `open ?tabs=on#noviembre`; the
  `?tabs=on` goes **before** the hash. An unknown hash such as `#noviembre?x` silently shows the yearly summary.
- Single tests go through `node paralelo.js tNN`, never `node tNN.js`: the runner freezes the date.
- The test server on port 8765 may be stopped after `npm run verificar`. The driver starts it again; your own scripts
  must do it.
- In the step wizard nothing is pre-selected until tapped; in the quick form the marked chips are what gets saved.
- Editing a movement that has no account blocks saving until you pick one (or «No descontar»).
- Past data keeps old category words in `r.k`; never print `r.k` for an expense (see `kNom`).
- Charts are created lazily: scroll before a full-page screenshot.
- When seeding `dev/demo.json` in your own script, do **not** set `cfg.ahoV`: its savings are in the old balance format
  and need the app's migration. With `ahoV: 3` the savings total is wildly inflated (54,650 instead of 6,020).

## Troubleshooting

- `page.goto: net::ERR_CONNECTION_REFUSED` in a hand-written script: the server is not running (`cd dev && node srv.js`).
- Lint error `index.html no coincide`: run `node dev/armar.js`.

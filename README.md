# sh1ft

an office that never closes. hold $SH1FT through a whole 8-hour shift and the coin's creator fees pay you in SOL, split by bag. sell during it and you're fired.

- `/` the office: a live 3D floor where every lit desk is a holder on shift and every box is someone who sold. rooms: office, payroll, desks, me, ledger, rules, terminal (keys 1–7, `/`).
- `/home` the story, with a wage calculator.
- `/docs` the manual, SH1FT(7).
- `/api/shift?action=config|state|desks|me|ledger|pay|cron`

## how it works

- shifts: 00:00, 08:00, 16:00 utc (graveyard, day, swing).
- on shift: held at least `SHIFT_MIN_USD` (default $50) when the shift started, among the top 100 holders, and never sold or sent during it. read from each holder's token history on chain, no database.
- payroll: the payroll wallet (derived from `SHIFT_SEED`) pays the last closed shift once, split by clock-in bag, minus 0.002 SOL rent. each payout carries the note `sh1ft:1:pay:<shift>`. anyone can run it (`POST /api/shift?action=pay`), and Vercel cron runs it daily.

## settings (Vercel → project → settings → environment variables)

| name | what |
|---|---|
| `SHIFT_SEED` | a long random secret. the payroll wallet's key is derived from it. never share it. |
| `SHIFT_MINT` | the $SH1FT contract address, once launched |
| `RPC_URL` | a Solana RPC url (a paid one is best; default is publicnode) |
| `SHIFT_MIN_USD` | optional, default 50 |
| `SHIFT_SKIP` | optional, comma-separated wallets that never get a desk (e.g. the dev) |

after setting `SHIFT_SEED`, the site shows the payroll wallet address. point $SH1FT's pump.fun creator fees at it.

## tests

`node test/sol.test.js && node test/api.test.js && PAID=1 node test/api.test.js && node test/site.js && node test/dark.js`

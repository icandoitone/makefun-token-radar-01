# Token Radar

The best token launch radar: every pre-token protocol in the sealed snapshot,
ranked by what its token would be worth if it launched today — plus a farm plan
for each one, so a reader knows what to do about it.

## The value model — `early-value-1`

The implied value follows only from the snapshot's own figures. No protocol
name is ever special-cased; the same function scores every row.

```
implied = TVL × 0.30 × growth × maturity × breadth
growth   = 1 + clamp(7-day change, −50%, +150%) / 100 × 0.75
maturity = 0.65 + 0.35 × sqrt(min(age in days, 1825) / 1825)
breadth  = 1 + 0.04 × min(chains − 1, 5)
```

- **Base (TVL × 0.30):** a token, if issued, is priced off the capital the
  protocol already holds.
- **Growth:** a protocol gaining TVL fast is worth more than one bleeding it;
  the clamp keeps one wild week from dominating.
- **Maturity:** age since DefiLlama first tracked it. The square root rewards
  survival early and flattens after five years. Unknown age counts as 180 days.
- **Breadth:** each extra chain the protocol runs on adds 4%, capped at +20% —
  wider reach, wider future holder base.

## Coverage

- The board holds all 40 watchlist protocols (TVL at or above the $50M floor).
- Plus the 160 highest-TVL pre-token protocols below the floor — the early
  finds the radar exists to surface. 200 rows in total.
- A protocol is **pre-token** when its snapshot record carries no market cap,
  no CoinGecko id and no symbol. Protocols whose token already trades are set
  aside in the dashboard's **Already trading** tab at the market's own value —
  never ranked against launches that have not happened.
- "Records no token" is the snapshot's record, not proof a protocol has none.

## Farm plans

Every row carries a seven-step plan generated from that protocol's own record —
category, chains, TVL and age. The capital, the hold time and the weekly rhythm
all scale with the record. It is a farming guide, not a promise: a token may
never be issued.

## The dashboard

`dashboard/` is a static page with no network and no framework:

- **Ranked board** — sortable by every column, filterable by search text,
  category, chain and scope (all / watchlist / early).
- **Detail view** — click any row (or open `?view=detail&slug=…`) for the
  protocol's figures, the four model factors, and its seven-step farm plan.
- **Already trading** — the protocols whose token already trades, at market cap.
- **How the model works** — the formula, the separation rule and the coverage.

## How to run it

Node 22, standard library only — no install, no build.

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input kit/input/snapshot.json
```

Reads the snapshot, writes `out/board.json`, `out/data.js`, copies
`dashboard/` and `screenshots/` into `out/`, and writes `out/dossier.json`
with the vendored make.fun library. The run is deterministic: the same
snapshot bytes always produce the same outputs, byte for byte.

## Files

- `main.ts` — the program: snapshot in, board + dashboard + dossier out.
- `lib/model.ts` — the value model, the board builder and the farm plans.
- `vendor/makefun-board.ts` — make.fun's dossier library, copied as-is.
- `dashboard/` — `index.html`, `app.css`, `app.js` (the page).
- `screenshots/` — 1-board, 2-detail, 3-filtered: real renders of the page.

# L1 headless realtime baseline — 2026-07-14

Status: passed.

## Command

```sh
npm run typecheck
npm run test:realtime
npm run acceptance:realtime
```

## Observed trace

The acceptance scenario is `headless-bot-arena` (`seed: headless-bots`), a 10×3 empty grid with `alpha-1` and `bravo-1` facing one another.

| Measure | Observed value |
| --- | ---: |
| Ticks | 16 |
| Canonical commands | 8 |
| `projectile-fired` events | 8 |
| `tank-damaged` events | 6 |
| Live state hash | `badf946a` |
| Replay state hash | `badf946a` |
| Replay equality | true |

Both tanks ended at their spawn positions with 25 HP and `alive: true`. The test suite contained eight passing checks: connectivity, command ordering, blocked movement, terminal destruction, live/replay equality, runtime/testing facade separation, protocol rejection, and repeatable two-bot acceptance.

## Limits of this evidence

This proves only the deterministic headless L1 core. It does not yet prove an authoritative server tick loop, RPC/Socket.IO delivery, reconnect recovery, a browser consumer, timing under load or a security boundary.

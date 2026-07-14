# Task 01 — add Bybit

In `project/src/exchanges.mjs`, add `adapters.bybit`. It must accept the same
quote shape as Binance and return a normalized quote with `source: 'bybit'`.
Keep the public API small and make `npm run check:bybit` pass after the genetic
cycle has been resolved.

This first repeated adapter edit is expected to produce a discovery action. The
response should capture only a concrete reusable rule supported by the code.

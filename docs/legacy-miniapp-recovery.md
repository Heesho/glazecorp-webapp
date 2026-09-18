# Legacy Base / Farcaster recovery — 2026-09-18

Production project: `xyk-labs/glazecorp-webapp`, root `packages/app`.
Legacy app: https://glazecorp.vercel.app/mine

## Fixed

- Manual wallet connection on Mine, Vote, Auction, and System now uses the host-aware Farcaster hook. A failed automatic connection can be retried using the same native wallet.
- Saved Farcaster connectors are gated by SDK host detection before Wagmi reconnect can call the unsupported provider in Base/browser contexts. Connector ID stays `farcaster` to preserve existing sessions.
- The old sessionStorage auto-connect flag no longer suppresses recovery after reopening the app.
- Miniapp and legacy frame embeds use the signed `glazecorp.vercel.app` domain and open `/mine`. The landing CTA opens Mine directly.
- Wallet connection errors are visible and rejection does not silently select another wallet.

## Indexer restoration

The configured `donut-miner/1.0.0` Goldsky endpoint returned 404 because the subgraph had been deleted. Restored the unchanged original source from https://github.com/Heesho/donut-miner-subgraph to the same endpoint. Source indexes Base Miner `0xF69614F4Ee8D4D3879dd53d5A039eB3114C794F6` from block `37882270`, matching the app. This rebuilds historical activity; account balances and transactions still use live contract reads.

Endpoint: https://api.goldsky.com/api/public/project_cmgscxhw81j5601xmhgd42rej/subgraphs/donut-miner/1.0.0/gn

Check backfill with `goldsky subgraph list` or query `_meta { block { number } hasIndexingErrors }`. Restoration initially returned healthy indexed data while catching up from November 2025. Do not treat partially rebuilt totals as complete until indexing catches up.

## Validation

- `npm test`: wallet selection, saved-session host guard, rejection, unavailable-provider fallback, and missing-native-connector checks.
- App TypeScript and production build.
- Browser desktop landing-to-Mine navigation.
- Local mobile Farcaster bridge fixture (`node tests/miniapp-harness.cjs`, app on port 3108): automatic connection deliberately rejected, manual retry connected through native SDK, balances and Mine UI unlocked. Fixture cannot sign or submit transactions.
- Actual Base/Farcaster mobile wallet approvals and live transactions require testing in those clients; the fixture does not certify physical-device behavior.

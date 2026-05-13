import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { fallback, http, createStorage, cookieStorage } from "wagmi";
import { base } from "wagmi/chains";
import { createConfig } from "wagmi";
import { baseAccount, injected } from "wagmi/connectors";

// Backup RPC endpoints for Base mainnet with automatic fallback.
// Public RPCs that consistently 403 from Vercel egress (llamarpc, ankr,
// drpc) are intentionally excluded — they only added console noise.
const BASE_RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_BASE_RPC_URL,
  process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL,
  "https://base.meowrpc.com",
  "https://base-pokt.nodies.app",
  "https://1rpc.io/base",
  "https://base-rpc.publicnode.com",
  "https://base.gateway.tenderly.co",
].filter((url): url is string => !!url && url !== "");

// Create transport array with retry configuration
const baseTransports = BASE_RPC_ENDPOINTS.map((url) =>
  http(url, {
    // Retry configuration for each transport
    retryCount: 2,
    retryDelay: 1000,
    timeout: 10_000,
  })
);

// Connector order matters — handleConnect on /mine etc. tries them in
// sequence until one succeeds:
//
// 1. farcasterMiniApp — works inside Warpcast and any legacy Farcaster host
// 2. injected (Rabby target) — for Rabby users when another extension also
//    owns window.ethereum
// 3. injected (generic) — MetaMask + any EIP-6963-announcing wallet
// 4. baseAccount — Base App and Base Account users. Required after April
//    9, 2026 because Base App stopped invoking Farcaster mini-app SDK
//    methods, so farcasterMiniApp() is silently dead there. baseAccount
//    speaks the EIP-5792 `wallet_connect` protocol that Base App exposes.
//    https://docs.base.org/apps/guides/migrate-to-standard-web-app
const connectors = [
  farcasterMiniApp(),
  injected({ target: "rabby" }),
  injected(),
  baseAccount({ appName: "GlazeCorp" }),
];

export const wagmiConfig = createConfig({
  chains: [base],
  ssr: true,
  connectors,
  // Disable EIP-6963 auto-discovery so we only use the connectors above.
  // Base's wagmi setup guide recommends this when including baseAccount.
  multiInjectedProviderDiscovery: false,
  transports: {
    // Tries each RPC in order. We intentionally don't pass `rank: true`
    // because it makes viem periodically ping every endpoint to measure
    // latency, and any 403/timeout from the backup pool fills the console
    // with noise even when Alchemy is healthy.
    [base.id]: fallback(baseTransports),
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
  // Increased polling interval to reduce request frequency
  pollingInterval: 15_000,
});

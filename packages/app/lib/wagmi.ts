import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { fallback, http, createStorage, cookieStorage } from "wagmi";
import { base } from "wagmi/chains";
import { createConfig } from "wagmi";
import { injected } from "wagmi/connectors";

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

// Include a targeted Rabby connector so users can connect Rabby even when
// another extension owns window.ethereum.
const connectors = [
  farcasterMiniApp(),
  injected({ target: "rabby" }),
  injected(),
];

export const wagmiConfig = createConfig({
  chains: [base],
  ssr: true,
  connectors,
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

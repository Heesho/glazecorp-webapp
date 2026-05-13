import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { fallback, http, createStorage, cookieStorage } from "wagmi";
import { base } from "wagmi/chains";
import { createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

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

const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "d04f41bca90773e76c0fc51b6aa734c5";

// Resolve the app URL from the actual page when running in the browser so
// the WalletConnect metadata matches whichever domain the user loaded
// (glazecorp.io vs glazecorp.vercel.app). Falls back to env var, then to
// the primary domain for SSR.
const APP_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "https://glazecorp.io";

// Include a targeted Rabby connector so users can connect Rabby even when
// another extension owns window.ethereum. WalletConnect is included so
// mobile-browser users without an injected wallet can still connect via QR.
const connectors = [
  farcasterMiniApp(),
  injected({ target: "rabby" }),
  injected(),
  walletConnect({
    projectId: WALLETCONNECT_PROJECT_ID,
    showQrModal: true,
    metadata: {
      name: "GlazeCorp",
      description: "Mine donuts, earn yield, and glaze the world one block at a time.",
      url: APP_URL,
      icons: [`${APP_URL}/media/icon.png`],
    },
  }),
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

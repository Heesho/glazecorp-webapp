import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { fallback, http, createStorage, cookieStorage } from "wagmi";
import { base } from "wagmi/chains";
import { createConfig } from "wagmi";
import { injected } from "wagmi/connectors";

// Backup RPC endpoints for Base mainnet with automatic fallback
// Order: Primary (env) -> Alchemy (env) -> Public RPCs
const BASE_RPC_ENDPOINTS = [
  // Primary RPC from env
  process.env.NEXT_PUBLIC_BASE_RPC_URL,
  // Alchemy backup from env
  process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL,
  // Public backup RPCs (ordered by reliability)
  "https://base.llamarpc.com",
  "https://base.meowrpc.com",
  "https://base-pokt.nodies.app",
  "https://1rpc.io/base",
  "https://base.drpc.org",
  "https://base-rpc.publicnode.com",
  "https://rpc.ankr.com/base",
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
const connectors = [farcasterMiniApp(), injected({ target: "rabby" }), injected()];

export const wagmiConfig = createConfig({
  chains: [base],
  ssr: true,
  connectors,
  transports: {
    // Fallback transport: tries each RPC in order until one succeeds
    // rank: true means it will prefer faster RPCs over time
    [base.id]: fallback(baseTransports, { rank: true }),
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
  // Increased polling interval to reduce request frequency
  pollingInterval: 15_000,
});

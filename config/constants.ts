// Timing
export const POLLING_INTERVAL_MS = 5000;
export const TICKER_INTERVAL_MS = 100;
export const OVERRIDE_DISPLAY_DURATION_MS = 10000;
export const CHANNEL_SWITCH_DELAY_MS = 300;

// Halving
export const HALVING_PERIOD_SECONDS = 30 * 24 * 60 * 60; // 30 days

// Pricing
export const REBATE_PERCENTAGE = 0.95; // 5% rebate = 95% of price
export const PRICE_BUFFER_MULTIPLIER = 10n; // Add 10% buffer to price

// Layout
export const HEADER_HEIGHT = 64; // h-16 = 4rem = 64px

// Video Channels
export const CHANNELS = [
  { id: "CAM_01", name: "DOUGH_MIXING", url: "/cam1.mp4", status: "LIVE", isVideo: true },
  { id: "CAM_02", name: "FRYER_TRANSPORT", url: "/cam2.mp4", status: "LIVE", isVideo: true },
  { id: "CAM_03", name: "GLAZE_LINE", url: "/cam3.mp4", status: "LIVE", isVideo: true },
  { id: "CAM_04", name: "GLAZE_VATS", url: "/cam4.mp4", status: "LIVE", isVideo: true },
  { id: "AD_01", name: "WE_GLAZE_THE_WORLD", url: "/cam5.mp4", status: "LIVE", isVideo: true, hasSound: true },
  { id: "AD_02", name: "FARPLACE", url: "/cam6.mp4", status: "LIVE", isVideo: true, hasSound: true },
] as const;

export type Channel = (typeof CHANNELS)[number];

// Tab Types
export type TabView = "MINE" | "SWAP" | "FRANCHISE" | "GOVERN" | "AUCTIONS";

// Governance Constants
export const EPOCH_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const DONUT_DECIMALS = 18;

// External Links
export const EXTERNAL_LINKS = {
  dune: "https://dune.com/xyk/donut-company?theme=dark",
  farcaster: "https://farcaster.xyz/~/channel/donut",
} as const;

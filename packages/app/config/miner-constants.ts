// Timing
export const POLLING_INTERVAL_MS = 15000; // 15 seconds for slower-moving supporting data
export const MINER_QUOTE_POLLING_INTERVAL_MS = 1000; // Fast quote refresh without piling up requests
export const TICKER_INTERVAL_MS = 100;

// Halving
export const HALVING_PERIOD_SECONDS = 30 * 24 * 60 * 60; // 30 days

// Contract Addresses
export const MINER_MULTICALL_ADDRESS = "0x3ec144554b484C6798A683E34c8e8E222293f323";
export const MINER_CONTRACT_ADDRESS = "0xF69614F4Ee8D4D3879dd53d5A039eB3114C794F6";

// RPC Configuration
export const MINER_RPC_URLS = [
  process.env.NEXT_PUBLIC_RPC_URL,
  "https://mainnet.base.org",
  "https://base.llamarpc.com",
].filter(Boolean) as string[];

// Multicall ABI for getMiner and mine functions
export const MINER_MULTICALL_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getMiner",
    outputs: [
      {
        components: [
          { name: "epochId", type: "uint16" },
          { name: "initPrice", type: "uint192" },
          { name: "startTime", type: "uint40" },
          { name: "glazed", type: "uint256" },
          { name: "price", type: "uint256" },
          { name: "dps", type: "uint256" },
          { name: "nextDps", type: "uint256" },
          { name: "donutPrice", type: "uint256" },
          { name: "miner", type: "address" },
          { name: "uri", type: "string" },
          { name: "ethBalance", type: "uint256" },
          { name: "wethBalance", type: "uint256" },
          { name: "donutBalance", type: "uint256" },
        ],
        name: "state",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "provider", type: "address" },
      { name: "epochId", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "maxPrice", type: "uint256" },
      { name: "uri", type: "string" },
    ],
    name: "mine",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// Miner ABI for startTime
export const MINER_ABI = [
  {
    inputs: [],
    name: "startTime",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

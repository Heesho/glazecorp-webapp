// Governance (LSG) Contract Addresses
export const LSG_ADDRESSES = {
  dao: "0x690C2e187c8254a887B35C0B4477ce6787F92855",
  governanceToken: "0xC78B6e362cB0f48b59E573dfe7C99d92153a16d3", // gDONUT
  voter: "0x9C5Cf3246d7142cdAeBBD5f653d95ACB73DdabA6",
  revenueRouter: "0x4799CBe9782265C0633d24c7311dD029090dED33",
  lsgMulticall: "0x41eA22dF0174cF3Cc09B1469a95D604E1833a462",
} as const;

// Token Addresses
export const TOKEN_ADDRESSES = {
  donut: "0xAE4a37d554C6D6F3E398546d8566B25052e0169C",
  weth: "0x4200000000000000000000000000000000000006",
  usdc: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  cbbtc: "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf",
  donutEthLp: "0xD1DbB2E56533C55C3A637D13C53aeEf65c5D5703",
  gDonut: "0xC78B6e362cB0f48b59E573dfe7C99d92153a16d3",
  qr: "0x2b5050f01d64fbb3e4ac44dc07f0732bfb5ecadf",
  aero: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
  clanker: "0x1bc0c42215582d5a085795f4badbac3ff36d1bcb",
  bnkr: "0x22af33fe49fd1fa80c7149773dde5890d3c76f3b",
} as const;

// Payment token symbols for display
export const PAYMENT_TOKEN_SYMBOLS: Record<string, string> = {
  [TOKEN_ADDRESSES.donut.toLowerCase()]: "DONUT",
  [TOKEN_ADDRESSES.donutEthLp.toLowerCase()]: "DONUT-ETH LP",
  [TOKEN_ADDRESSES.usdc.toLowerCase()]: "USDC",
  [TOKEN_ADDRESSES.cbbtc.toLowerCase()]: "cbBTC",
  [TOKEN_ADDRESSES.qr.toLowerCase()]: "QR",
  [TOKEN_ADDRESSES.aero.toLowerCase()]: "AERO",
  [TOKEN_ADDRESSES.clanker.toLowerCase()]: "CLANKER",
  [TOKEN_ADDRESSES.bnkr.toLowerCase()]: "BNKR",
};

// Timing
export const POLLING_INTERVAL_MS = 15000; // 15 seconds
export const EPOCH_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const DONUT_DECIMALS = 18;

// LSG Multicall ABI
export const LSG_MULTICALL_ABI = [
  {
    inputs: [],
    name: "getSystemOverview",
    outputs: [
      {
        components: [
          { name: "revenueRouter", type: "address" },
          { name: "revenueRouterWethBalance", type: "uint256" },
          { name: "voterAddress", type: "address" },
          { name: "voterTotalClaimable", type: "uint256" },
          { name: "totalWeight", type: "uint256" },
          { name: "bribeSplit", type: "uint256" },
          { name: "governanceToken", type: "address" },
          { name: "governanceTokenTotalSupply", type: "uint256" },
          { name: "underlyingToken", type: "address" },
          { name: "underlyingTokenDecimals", type: "uint8" },
          { name: "underlyingTokenSymbol", type: "string" },
          { name: "currentEpochStart", type: "uint256" },
          { name: "nextEpochStart", type: "uint256" },
          { name: "timeUntilNextEpoch", type: "uint256" },
          { name: "epochDuration", type: "uint256" },
          { name: "strategyCount", type: "uint256" },
        ],
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllStrategyOverviews",
    outputs: [
      {
        components: [
          { name: "strategy", type: "address" },
          { name: "bribe", type: "address" },
          { name: "bribeRouter", type: "address" },
          { name: "paymentToken", type: "address" },
          { name: "paymentTokenSymbol", type: "string" },
          { name: "paymentTokenDecimals", type: "uint8" },
          { name: "isAlive", type: "bool" },
          { name: "strategyWethBalance", type: "uint256" },
          { name: "strategyClaimable", type: "uint256" },
          { name: "strategyPendingRevenue", type: "uint256" },
          { name: "strategyTotalPotentialWeth", type: "uint256" },
          { name: "bribeRouterTokenBalance", type: "uint256" },
          { name: "bribeTokensLeft", type: "uint256" },
          { name: "bribeTotalSupply", type: "uint256" },
          { name: "strategyWeight", type: "uint256" },
          { name: "votePercent", type: "uint256" },
          { name: "epochId", type: "uint256" },
          { name: "epochPeriod", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "initPrice", type: "uint256" },
          { name: "currentPrice", type: "uint256" },
          { name: "timeUntilAuctionEnd", type: "uint256" },
        ],
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "flushAndDistributeAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getVoterData",
    outputs: [
      {
        components: [
          { name: "governanceToken", type: "address" },
          { name: "revenueToken", type: "address" },
          { name: "treasury", type: "address" },
          { name: "underlyingToken", type: "address" },
          { name: "underlyingTokenDecimals", type: "uint8" },
          { name: "totalWeight", type: "uint256" },
          { name: "strategyCount", type: "uint256" },
          { name: "governanceTokenTotalSupply", type: "uint256" },
          { name: "accountGovernanceTokenBalance", type: "uint256" },
          { name: "accountUnderlyingTokenBalance", type: "uint256" },
          { name: "accountUsedWeights", type: "uint256" },
          { name: "accountLastVoted", type: "uint256" },
        ],
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getAllBribesData",
    outputs: [
      {
        components: [
          { name: "strategy", type: "address" },
          { name: "bribe", type: "address" },
          { name: "isAlive", type: "bool" },
          { name: "rewardTokens", type: "address[]" },
          { name: "rewardTokenDecimals", type: "uint8[]" },
          { name: "rewardsPerToken", type: "uint256[]" },
          { name: "accountRewardsEarned", type: "uint256[]" },
          { name: "rewardsLeft", type: "uint256[]" },
          { name: "voteWeight", type: "uint256" },
          { name: "votePercent", type: "uint256" },
          { name: "totalSupply", type: "uint256" },
          { name: "accountVote", type: "uint256" },
        ],
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getAllStrategiesData",
    outputs: [
      {
        components: [
          { name: "strategy", type: "address" },
          { name: "bribe", type: "address" },
          { name: "bribeRouter", type: "address" },
          { name: "paymentToken", type: "address" },
          { name: "paymentReceiver", type: "address" },
          { name: "isAlive", type: "bool" },
          { name: "paymentTokenDecimals", type: "uint8" },
          { name: "strategyWeight", type: "uint256" },
          { name: "votePercent", type: "uint256" },
          { name: "claimable", type: "uint256" },
          { name: "pendingRevenue", type: "uint256" },
          { name: "routerRevenue", type: "uint256" },
          { name: "totalPotentialRevenue", type: "uint256" },
          { name: "epochPeriod", type: "uint256" },
          { name: "priceMultiplier", type: "uint256" },
          { name: "minInitPrice", type: "uint256" },
          { name: "epochId", type: "uint256" },
          { name: "initPrice", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "currentPrice", type: "uint256" },
          { name: "revenueBalance", type: "uint256" },
          { name: "accountVotes", type: "uint256" },
          { name: "accountPaymentTokenBalance", type: "uint256" },
        ],
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "strategy", type: "address" }],
    name: "distribute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "distributeAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "strategy", type: "address" },
      { name: "epochId", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "maxPaymentAmount", type: "uint256" },
    ],
    name: "distributeAndBuy",
    outputs: [{ name: "paymentAmount", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Voter ABI
export const VOTER_ABI = [
  {
    inputs: [
      { name: "strategies", type: "address[]" },
      { name: "weights", type: "uint256[]" },
    ],
    name: "vote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "reset",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bribes", type: "address[]" }],
    name: "claimBribes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Governance Token ABI (gDONUT)
export const GOVERNANCE_TOKEN_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "delegatee", type: "address" }],
    name: "delegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "delegates",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getVotes",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ERC20 ABI
export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

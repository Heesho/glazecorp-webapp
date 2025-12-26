// Launchpad Subgraph API
const LAUNCHPAD_SUBGRAPH_URL = process.env.NEXT_PUBLIC_LAUNCHPAD_SUBGRAPH_URL || "https://api.goldsky.com/api/public/project_cmgscxhw81j5601xmhgd42rej/subgraphs/miner-launchpad/1.0.2/gn";
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";
const PINATA_GATEWAY_KEY = process.env.NEXT_PUBLIC_PINATA_GATEWAY_KEY || "";

// Types - using name/symbol aliases for backwards compatibility
export interface SubgraphRig {
  id: string;
  name: string; // mapped from tokenName
  symbol: string; // mapped from tokenSymbol
  uri: string;
  launcher: string;
  unit: string;
  auction: string;
  lp: string; // mapped from lpToken
  revenue: string;
  minted: string;
  createdAt: string;
  // Price calculation fields
  rigInitPrice: string;
  rigStartTime: string;
  rigEpochPeriod: string;
  rigPriceMultiplier: string;
  lastMined: string;
}

export interface SubgraphEpoch {
  id: string;
  spent: string;
  earned: string;
  mined: string;
  startTime: string;
  uri: string;
  initPrice: string;
  account?: string;
  rig: {
    id: string;
    name: string; // mapped from tokenName
    symbol: string; // mapped from tokenSymbol
  };
}

export interface SubgraphLaunchpad {
  id: string;
  rigCount: string; // mapped from totalRigs
  revenue: string; // mapped from totalRevenue
  minted: string; // mapped from totalMinted
  protocolRevenue: string;
}

export interface SubgraphRigAccount {
  id: string;
  spent: string;
  earned: string;
  mined: string;
  rig: {
    id: string;
    name: string;
    symbol: string;
  };
}

// GraphQL Queries - using actual schema field names
const GET_LAUNCHPAD_STATS_QUERY = `
  query GetLaunchpadStats {
    launchpad(id: "launchpad") {
      id
      totalRigs
      totalRevenue
      totalMinted
      protocolRevenue
    }
  }
`;

const GET_RIGS_QUERY = `
  query GetRigs($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
    rigs(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      tokenName
      tokenSymbol
      uri
      launcher
      unit
      auction
      lpToken
      revenue
      minted
      createdAt
      rigInitPrice
      rigStartTime
      rigEpochPeriod
      rigPriceMultiplier
      lastMined
    }
  }
`;

const GET_RIG_QUERY = `
  query GetRig($id: ID!) {
    rig(id: $id) {
      id
      tokenName
      tokenSymbol
      uri
      launcher
      unit
      auction
      lpToken
      revenue
      minted
      createdAt
      rigInitPrice
      rigStartTime
      rigEpochPeriod
      rigPriceMultiplier
      lastMined
    }
  }
`;

const GET_RECENT_EPOCHS_QUERY = `
  query GetRecentEpochs($first: Int!) {
    epoches(first: $first, orderBy: startTime, orderDirection: desc) {
      id
      spent
      earned
      mined
      startTime
      uri
      initPrice
      rigAccount {
        account {
          id
        }
      }
      rig {
        id
        tokenName
        tokenSymbol
      }
    }
  }
`;

const GET_TOP_RIGS_QUERY = `
  query GetTopRigs($first: Int!) {
    rigs(first: $first, orderBy: revenue, orderDirection: desc) {
      id
      tokenName
      tokenSymbol
      uri
      launcher
      unit
      auction
      lpToken
      revenue
      minted
      createdAt
      rigInitPrice
      rigStartTime
      rigEpochPeriod
      rigPriceMultiplier
      lastMined
    }
  }
`;

const GET_USER_RIG_ACCOUNTS_QUERY = `
  query GetUserRigAccounts($account: String!) {
    rigAccounts(where: { account: $account }, first: 100) {
      id
      spent
      earned
      mined
      rig {
        id
        tokenName
        tokenSymbol
      }
    }
  }
`;

const GET_RIG_EPOCHS_QUERY = `
  query GetRigEpochs($rigId: String!, $first: Int!) {
    epoches(where: { rig: $rigId }, first: $first, orderBy: startTime, orderDirection: desc) {
      id
      spent
      earned
      mined
      startTime
      uri
      initPrice
      rigAccount {
        account {
          id
        }
      }
      rig {
        id
        tokenName
        tokenSymbol
      }
    }
  }
`;

// Raw types from subgraph
interface RawRig {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  uri: string;
  launcher: string;
  unit: string;
  auction: string;
  lpToken: string;
  revenue: string;
  minted: string;
  createdAt: string;
  // Price calculation fields
  rigInitPrice: string;
  rigStartTime: string;
  rigEpochPeriod: string;
  rigPriceMultiplier: string;
  lastMined: string;
}

interface RawEpoch {
  id: string;
  spent: string;
  earned: string;
  mined: string;
  startTime: string;
  uri: string;
  initPrice: string;
  rigAccount?: {
    account: {
      id: string;
    };
  };
  rig: {
    id: string;
    tokenName: string;
    tokenSymbol: string;
  };
}

interface RawLaunchpad {
  id: string;
  totalRigs: string;
  totalRevenue: string;
  totalMinted: string;
  protocolRevenue: string;
}

interface RawRigAccount {
  id: string;
  spent: string;
  earned: string;
  mined: string;
  rig: {
    id: string;
    tokenName: string;
    tokenSymbol: string;
  };
}

// Transform functions
function transformRig(raw: RawRig): SubgraphRig {
  return {
    id: raw.id,
    name: raw.tokenName,
    symbol: raw.tokenSymbol,
    uri: raw.uri,
    launcher: raw.launcher,
    unit: raw.unit,
    auction: raw.auction,
    lp: raw.lpToken,
    revenue: raw.revenue,
    minted: raw.minted,
    createdAt: raw.createdAt,
    rigInitPrice: raw.rigInitPrice,
    rigStartTime: raw.rigStartTime,
    rigEpochPeriod: raw.rigEpochPeriod,
    rigPriceMultiplier: raw.rigPriceMultiplier,
    lastMined: raw.lastMined,
  };
}

function transformEpoch(raw: RawEpoch): SubgraphEpoch {
  return {
    id: raw.id,
    spent: raw.spent,
    earned: raw.earned,
    mined: raw.mined,
    startTime: raw.startTime,
    uri: raw.uri,
    initPrice: raw.initPrice || "0",
    account: raw.rigAccount?.account?.id,
    rig: {
      id: raw.rig.id,
      name: raw.rig.tokenName,
      symbol: raw.rig.tokenSymbol,
    },
  };
}

function transformLaunchpad(raw: RawLaunchpad): SubgraphLaunchpad {
  return {
    id: raw.id,
    rigCount: raw.totalRigs,
    revenue: raw.totalRevenue,
    minted: raw.totalMinted,
    protocolRevenue: raw.protocolRevenue,
  };
}

function transformRigAccount(raw: RawRigAccount): SubgraphRigAccount {
  return {
    id: raw.id,
    spent: raw.spent,
    earned: raw.earned,
    mined: raw.mined,
    rig: {
      id: raw.rig.id,
      name: raw.rig.tokenName,
      symbol: raw.rig.tokenSymbol,
    },
  };
}

// API Functions
async function querySubgraph<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(LAUNCHPAD_SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) {
      console.error("Subgraph query errors:", json.errors);
    }
    return json.data;
  } catch (error) {
    console.error("Launchpad Subgraph Error:", error);
    return null;
  }
}

export async function getLaunchpadStats(): Promise<SubgraphLaunchpad | null> {
  const data = await querySubgraph<{ launchpad: RawLaunchpad }>(GET_LAUNCHPAD_STATS_QUERY);
  return data?.launchpad ? transformLaunchpad(data.launchpad) : null;
}

export async function getRigs(
  first = 20,
  skip = 0,
  orderBy = "createdAt",
  orderDirection = "desc"
): Promise<SubgraphRig[]> {
  const data = await querySubgraph<{ rigs: RawRig[] }>(GET_RIGS_QUERY, {
    first,
    skip,
    orderBy,
    orderDirection,
  });
  return data?.rigs?.map(transformRig) ?? [];
}

export async function searchRigs(text: string): Promise<SubgraphRig[]> {
  // Fallback to filtering locally since rigSearch may not exist
  const allRigs = await getRigs(100, 0, "createdAt", "desc");
  const searchLower = text.toLowerCase();
  return allRigs.filter(
    rig =>
      rig.name.toLowerCase().includes(searchLower) ||
      rig.symbol.toLowerCase().includes(searchLower)
  );
}

export async function getRig(id: string): Promise<SubgraphRig | null> {
  const data = await querySubgraph<{ rig: RawRig }>(GET_RIG_QUERY, { id: id.toLowerCase() });
  return data?.rig ? transformRig(data.rig) : null;
}

export async function getRecentEpochs(first = 20): Promise<SubgraphEpoch[]> {
  const data = await querySubgraph<{ epoches: RawEpoch[] }>(GET_RECENT_EPOCHS_QUERY, { first });
  return data?.epoches?.map(transformEpoch) ?? [];
}

export async function getRigEpochs(rigId: string, first = 20): Promise<SubgraphEpoch[]> {
  const data = await querySubgraph<{ epoches: RawEpoch[] }>(GET_RIG_EPOCHS_QUERY, {
    rigId: rigId.toLowerCase(),
    first
  });
  return data?.epoches?.map(transformEpoch) ?? [];
}

export async function getTopRigs(first = 10): Promise<SubgraphRig[]> {
  const data = await querySubgraph<{ rigs: RawRig[] }>(GET_TOP_RIGS_QUERY, { first });
  return data?.rigs?.map(transformRig) ?? [];
}

export async function getUserRigAccounts(account: string): Promise<SubgraphRigAccount[]> {
  const data = await querySubgraph<{ rigAccounts: RawRigAccount[] }>(GET_USER_RIG_ACCOUNTS_QUERY, {
    account: account.toLowerCase(),
  });
  return data?.rigAccounts?.map(transformRigAccount) ?? [];
}

// Calculate current Dutch auction price
export function calculateCurrentPrice(rig: SubgraphRig): number {
  const now = Math.floor(Date.now() / 1000);
  const initPrice = parseFloat(rig.rigInitPrice || "0");
  const startTime = parseInt(rig.rigStartTime || "0");
  const epochPeriod = parseInt(rig.rigEpochPeriod || "3600");
  const multiplier = parseFloat(rig.rigPriceMultiplier || "2");

  if (initPrice === 0 || startTime === 0) return 0;

  const elapsed = now - startTime;
  const progress = Math.min(1, elapsed / epochPeriod);
  const minPrice = initPrice / multiplier;

  // Linear decay from initPrice to minPrice
  const currentPrice = initPrice - (initPrice - minPrice) * progress;
  return Math.max(minPrice, currentPrice);
}

// Utility to parse IPFS URI to HTTP
export function ipfsToHttp(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    const hash = uri.replace("ipfs://", "");
    const gateway = PINATA_GATEWAY.replace(/\/+$/, ""); // Remove trailing slashes
    const baseUrl = `${gateway}/ipfs/${hash}`;
    // Add gateway key if available for authenticated access
    if (PINATA_GATEWAY_KEY) {
      return `${baseUrl}?pinataGatewayToken=${PINATA_GATEWAY_KEY}`;
    }
    return baseUrl;
  }
  return uri;
}

// Parse rig metadata from URI
export interface RigMetadata {
  name?: string;
  description?: string;
  image?: string;
  defaultMessage?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export async function fetchRigMetadata(uri: string): Promise<RigMetadata | null> {
  try {
    const url = ipfsToHttp(uri);
    const res = await fetch(url);
    return await res.json();
  } catch {
    return null;
  }
}

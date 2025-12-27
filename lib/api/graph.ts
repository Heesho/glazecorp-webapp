import { ethers } from 'ethers';

const GRAPH_URL = process.env.NEXT_PUBLIC_MINER_SUBGRAPH_URL || "https://api.goldsky.com/api/public/project_cmgscxhw81j5601xmhgd42rej/subgraphs/donut-miner/1.0.0/gn";

// Revenue constants
const REVENUE_RATE = 0.15; // 15% of spent goes to revenue
const GLAZES_PER_DAY = 48; // ~30 min per glaze

export interface GraphResponse {
  miners?: Array<{ revenue: string; minted: string }>;
  glazes?: Array<{
    id: string;
    uri: string;
    spent: string;
    earned: string;
    mined: string;
    startTime: string;
    account: { id: string };
  }>;
  account?: {
    id: string;
    spent: string;
    earned: string;
    mined: string;
  };
}

/**
 * Fetch data from The Graph subgraph
 */
export async function fetchGraphData(
  userAddress?: string
): Promise<GraphResponse | null> {
  const userQuery =
    userAddress && userAddress !== ethers.ZeroAddress
      ? `account(id: "${userAddress.toLowerCase()}") { id spent earned mined }`
      : "";

  const query = `
    {
      miners(first: 1) {
        revenue
        minted
      }
      glazes(first: 20, orderBy: startTime, orderDirection: desc) {
        id
        uri
        spent
        earned
        mined
        startTime
        account {
          id
        }
      }
      ${userQuery}
    }
  `;

  try {
    const res = await fetch(GRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error("Graph Error:", error);
    return null;
  }
}

export interface RevenueEstimate {
  latestGlazeSpent: number; // ETH spent in latest glaze
  revenuePerGlaze: number;  // ETH revenue per glaze (spent * 0.15)
  dailyRevenue: number;     // ETH per day
  weeklyRevenue: number;    // ETH per week
}

/**
 * Calculate revenue estimates from the latest glaze data
 */
export function calculateRevenueEstimate(glazes: GraphResponse['glazes']): RevenueEstimate | null {
  if (!glazes || glazes.length === 0) return null;

  // Get the latest glaze
  const latestGlaze = glazes[0];
  const latestGlazeSpent = parseFloat(latestGlaze.spent);

  // Calculate revenue
  const revenuePerGlaze = latestGlazeSpent * REVENUE_RATE;
  const dailyRevenue = revenuePerGlaze * GLAZES_PER_DAY;
  const weeklyRevenue = dailyRevenue * 7;

  return {
    latestGlazeSpent,
    revenuePerGlaze,
    dailyRevenue,
    weeklyRevenue,
  };
}

/**
 * Fetch revenue estimate from subgraph
 */
export async function fetchRevenueEstimate(): Promise<RevenueEstimate | null> {
  const query = `
    {
      glazes(first: 1, orderBy: startTime, orderDirection: desc) {
        id
        spent
        startTime
      }
    }
  `;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const res = await fetch(GRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const json = await res.json();
    const result = calculateRevenueEstimate(json.data?.glazes);

    // Return result or fallback to reasonable defaults
    return result || {
      latestGlazeSpent: 0.1,
      revenuePerGlaze: 0.015,
      dailyRevenue: 0.72,
      weeklyRevenue: 5.04,
    };
  } catch (error) {
    console.error("Revenue Estimate Error:", error);
    // Return fallback values so UI doesn't get stuck
    return {
      latestGlazeSpent: 0.1,
      revenuePerGlaze: 0.015,
      dailyRevenue: 0.72,
      weeklyRevenue: 5.04,
    };
  }
}

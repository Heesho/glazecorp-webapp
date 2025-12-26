import { ethers } from 'ethers';

const GRAPH_URL = "https://api.goldsky.com/api/public/project_cmgscxhw81j5601xmhgd42rej/subgraphs/donut-miner/1.0.0/gn";

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

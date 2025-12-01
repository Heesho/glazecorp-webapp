import { ethers } from 'ethers';
import { MinerState, Slot0, FarcasterProfile, FeedItem } from './types';

// --- CONFIGURATION ---
export const RPC_URL = "https://mainnet.base.org";
export const MULTICALL_ADDRESS = "0x7a85CA4b4E15df2a7b927Fa56edb050d2399B34c";
export const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const SUBGRAPH_ID = "8LAXZsz9xTzGMH2HB1F78AkoXD9yvxm2epLGr48wDhrK";
const GRAPH_API_KEY = "7302378dbbe0ef268c60a5cee4251713";
export const GRAPH_URL = `https://gateway.thegraph.com/api/${GRAPH_API_KEY}/subgraphs/id/${SUBGRAPH_ID}`;
export const NEYNAR_API_KEY = "A197D798-429D-4B89-90E2-A11208D0C5B7";

// --- ABIS ---
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

// We use JSON ABI for the struct return to ensure Ethers v6 decodes the tuple correctly
export const MULTICALL_ABI = [
  {
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "getMiner",
    "outputs": [
      {
        "components": [
          { "name": "epochId", "type": "uint16" },
          { "name": "initPrice", "type": "uint192" },
          { "name": "startTime", "type": "uint40" },
          { "name": "glazed", "type": "uint256" },
          { "name": "price", "type": "uint256" },
          { "name": "dps", "type": "uint256" },
          { "name": "nextDps", "type": "uint256" },
          { "name": "donutPrice", "type": "uint256" },
          { "name": "ethBalance", "type": "uint256" },
          { "name": "donutBalance", "type": "uint256" },
          { "name": "miner", "type": "address" },
          { "name": "uri", "type": "string" }
        ],
        "name": "state",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "provider", "type": "address" },
      { "name": "epochId", "type": "uint256" },
      { "name": "deadline", "type": "uint256" },
      { "name": "maxPrice", "type": "uint256" },
      { "name": "uri", "type": "string" }
    ],
    "name": "mine",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

// --- PRICING MATH ---
export const calculateDutchAuctionPrice = (initPrice: bigint, startTime: number): bigint => {
  const EPOCH_DURATION = 3600n; // 1 hour in seconds (BigInt)
  const now = BigInt(Math.floor(Date.now() / 1000));
  const start = BigInt(startTime);
  const elapsed = now - start;

  if (elapsed >= EPOCH_DURATION) return 0n;
  if (elapsed < 0n) return initPrice; 

  // Solidity equivalent: 
  // decay = (EPOCH_DURATION - elapsed) * 1e18 / EPOCH_DURATION
  // price = (initPrice * decay) / 1e18
  
  const decay = ((EPOCH_DURATION - elapsed) * 1000000000000000000n) / EPOCH_DURATION;
  return (initPrice * decay) / 1000000000000000000n;
};

// --- DATA FETCHING ---

// 0. Fetch ETH Price
export const fetchEthPrice = async (): Promise<number> => {
  try {
    const res = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot");
    const json = await res.json();
    return json?.data?.amount ? parseFloat(json.data.amount) : 0;
  } catch (e) {
    console.error("Failed to fetch ETH price", e);
    return 0;
  }
};

// 1. Fetch Contract State
export const fetchMinerState = async (userAddress: string = ethers.ZeroAddress): Promise<MinerState | null> => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL_ABI, provider);
    const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, provider);

    const [data, wethBal] = await Promise.all([
      contract.getMiner(userAddress),
      userAddress !== ethers.ZeroAddress ? wethContract.balanceOf(userAddress).catch(() => 0n) : Promise.resolve(0n)
    ]);
    
    // Ethers returns the tuple as a result object
    return {
      epochId: Number(data.epochId),
      initPrice: data.initPrice,
      startTime: Number(data.startTime),
      glazed: data.glazed,
      price: data.price,
      dps: data.dps,
      nextDps: data.nextDps,
      donutPrice: data.donutPrice,
      miner: data.miner,
      uri: data.uri,
      ethBalance: data.ethBalance,
      donutBalance: data.donutBalance,
      wethBalance: wethBal
    };
  } catch (e) {
    console.error("RPC Error:", e);
    return null;
  }
};

// 2. Fetch Single Farcaster Profile
export const fetchFarcasterProfile = async (address: string): Promise<FarcasterProfile | null> => {
  if (address === ethers.ZeroAddress) return null;
  try {
    const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`, {
      headers: { 
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY
      }
    });
    const json = await res.json();
    const user = json[address.toLowerCase()]?.[0];
    if (!user) return null;
    return {
      username: user.username,
      displayName: user.display_name,
      pfp: user.pfp_url,
      fid: user.fid
    };
  } catch (e) {
    console.error("Neynar Error:", e);
    return null;
  }
};

// 3. Fetch Multiple Farcaster Profiles (Bulk)
export const fetchFarcasterProfiles = async (addresses: string[]): Promise<Record<string, FarcasterProfile>> => {
  if (addresses.length === 0) return {};
  
  // Filter unique and valid
  const unique = [...new Set(addresses.filter(a => a && a.length > 0).map(a => a.toLowerCase()))];
  if (unique.length === 0) return {};

  try {
    // Join addresses with commas
    const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${unique.join(',')}`;
    const res = await fetch(url, {
      headers: { 
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY
      }
    });
    const json = await res.json();
    
    const result: Record<string, FarcasterProfile> = {};
    // Response structure: { [address]: [userObj, ...] }
    for (const addr of unique) {
      // The API returns keys in lowercase
      const user = json[addr]?.[0];
      if (user) {
        result[addr] = {
          username: user.username,
          displayName: user.display_name,
          pfp: user.pfp_url,
          fid: user.fid
        };
      }
    }
    return result;
  } catch (e) {
    console.error("Neynar Bulk Error:", e);
    return {};
  }
};

// 4. Fetch Subgraph Data
export const fetchGraphData = async (userAddress?: string) => {
  const userQuery = (userAddress && userAddress !== ethers.ZeroAddress) 
    ? `miner(id: "${userAddress.toLowerCase()}") { minted revenue spent }` 
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
        initPrice
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const json = await res.json();
    return json.data;
  } catch (e) {
    console.error("Graph Error:", e);
    return null;
  }
};

// --- FORMATTERS ---

export const formatEth = (wei: bigint, decimals = 4): string => {
  try {
    if (!wei) return "0.0000";
    const float = parseFloat(ethers.formatEther(wei));
    if (float === 0) return "0.0000";
    return float.toFixed(decimals);
  } catch (e) {
    return "0.0000";
  }
};

export const formatDonut = (wei: bigint): string => {
  try {
    if (!wei) return "0";
    const val = parseFloat(ethers.formatEther(wei));
    return val.toLocaleString('en-US', { maximumFractionDigits: 0 });
  } catch (e) {
    return "0";
  }
};

export const truncateAddress = (addr: string): string => {
  if (!addr || addr.length < 10) return "0x00...0000";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export const isImageUri = (uri: string): boolean => {
  if (!uri) return false;
  return uri.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null || uri.includes("imgur") || uri.includes("picsum");
};
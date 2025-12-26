// Uniswap V2 direct integration for DONUT swaps
import { createPublicClient, http, formatUnits, parseUnits, type Address } from "viem";
import { base } from "viem/chains";
import { TOKEN_ADDRESSES, LAUNCHPAD_ADDRESSES, RPC_URL } from "@/lib/blockchain/contracts";
import { NATIVE_ETH_ADDRESS } from "./kyber";

// ERC20 ABI for totalSupply
const ERC20_TOTAL_SUPPLY_ABI = [
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Uniswap V2 Pair ABI (minimal)
const PAIR_ABI = [
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token0",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Uniswap V2 Router ABI (minimal for swaps)
export const UNIV2_ROUTER_ABI = [
  {
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactETHForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForETH",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

export interface UniV2Quote {
  amountIn: bigint;
  amountOut: bigint;
  path: Address[];
  priceImpact: number;
  amountInUsd?: string;
  amountOutUsd?: string;
}

// Cache for DONUT USD price
let cachedDonutUsdPrice: number | null = null;
let donutPriceCacheTime = 0;
const PRICE_CACHE_DURATION = 60000; // 1 minute

/**
 * Fetch DONUT USD price from Kyber (via ETH quote)
 */
export async function getDonutUsdPrice(): Promise<number> {
  const now = Date.now();
  if (cachedDonutUsdPrice !== null && now - donutPriceCacheTime < PRICE_CACHE_DURATION) {
    return cachedDonutUsdPrice;
  }

  try {
    // Get quote for 1 DONUT -> ETH via Kyber to get USD value
    const oneDonut = parseUnits("1", 18);
    const params = new URLSearchParams({
      tokenIn: TOKEN_ADDRESSES.donut,
      tokenOut: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Native ETH
      amountIn: oneDonut.toString(),
      gasInclude: "true",
    });

    const res = await fetch(`https://aggregator-api.kyberswap.com/base/api/v1/routes?${params}`, {
      headers: { "X-Client-Id": "glazecorp" },
    });
    const data = await res.json();

    if (data.data?.routeSummary?.amountInUsd) {
      const price = parseFloat(data.data.routeSummary.amountInUsd);
      cachedDonutUsdPrice = price;
      donutPriceCacheTime = now;
      return price;
    }
  } catch (error) {
    console.error("Failed to fetch DONUT price:", error);
  }

  return cachedDonutUsdPrice || 0;
}

/**
 * Get token price in DONUT from a UniV2 LP pair
 */
export async function getTokenPriceInDonut(
  lpAddress: Address,
  tokenAddress: string
): Promise<number> {
  try {
    const [reserves, token0] = await Promise.all([
      client.readContract({
        address: lpAddress,
        abi: PAIR_ABI,
        functionName: "getReserves",
      }),
      client.readContract({
        address: lpAddress,
        abi: PAIR_ABI,
        functionName: "token0",
      }),
    ]);

    const [reserve0, reserve1] = reserves;
    const isToken0 = token0.toLowerCase() === tokenAddress.toLowerCase();

    // Token reserves
    const tokenReserve = isToken0 ? reserve0 : reserve1;
    const donutReserve = isToken0 ? reserve1 : reserve0;

    // Price = donutReserve / tokenReserve (how much DONUT per 1 token)
    if (tokenReserve === 0n) return 0;
    return Number(donutReserve) / Number(tokenReserve);
  } catch (error) {
    console.error("Failed to get token price from LP:", error);
    return 0;
  }
}

/**
 * Get USD value for a token amount using LP price + DONUT USD price
 */
export async function getTokenUsdValue(
  lpAddress: string,
  tokenAddress: string,
  tokenAmount: number
): Promise<number> {
  try {
    const [priceInDonut, donutUsdPrice] = await Promise.all([
      getTokenPriceInDonut(lpAddress as Address, tokenAddress),
      getDonutUsdPrice(),
    ]);

    if (priceInDonut === 0 || donutUsdPrice === 0) return 0;

    // Token amount * price in DONUT * DONUT USD price
    return tokenAmount * priceInDonut * donutUsdPrice;
  } catch (error) {
    console.error("Failed to get token USD value:", error);
    return 0;
  }
}

// Get output amount using constant product formula (x * y = k)
function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  const amountInWithFee = amountIn * 997n; // 0.3% fee
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  return numerator / denominator;
}

// Get input amount needed for desired output
function getAmountIn(amountOut: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  const numerator = reserveIn * amountOut * 1000n;
  const denominator = (reserveOut - amountOut) * 997n;
  return numerator / denominator + 1n;
}

// Calculate price impact
function calculatePriceImpact(
  amountIn: bigint,
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  // Spot price before swap
  const spotPrice = (reserveOut * 10n ** 18n) / reserveIn;
  // Execution price
  const executionPrice = (amountOut * 10n ** 18n) / amountIn;
  // Price impact = 1 - (execution / spot)
  const impact = 1 - Number(executionPrice) / Number(spotPrice);
  return Math.max(0, impact * 100); // Return as percentage
}

/**
 * Get a quote for swapping between ETH/WETH and DONUT
 */
export async function getUniV2Quote(
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: bigint
): Promise<UniV2Quote | null> {
  try {
    const lpAddress = TOKEN_ADDRESSES.donutEthLp as Address;

    // Get reserves and token order from LP
    const [reserves, token0] = await Promise.all([
      client.readContract({
        address: lpAddress,
        abi: PAIR_ABI,
        functionName: "getReserves",
      }),
      client.readContract({
        address: lpAddress,
        abi: PAIR_ABI,
        functionName: "token0",
      }),
    ]);

    const [reserve0, reserve1] = reserves;
    const isDonutToken0 = token0.toLowerCase() === TOKEN_ADDRESSES.donut.toLowerCase();

    // Determine reserves based on token order
    let reserveIn: bigint;
    let reserveOut: bigint;
    let path: Address[];

    const isSwappingToDonut =
      tokenOutAddress.toLowerCase() === TOKEN_ADDRESSES.donut.toLowerCase();

    if (isSwappingToDonut) {
      // ETH/WETH -> DONUT
      reserveIn = isDonutToken0 ? reserve1 : reserve0; // WETH reserve
      reserveOut = isDonutToken0 ? reserve0 : reserve1; // DONUT reserve
      path = [TOKEN_ADDRESSES.weth as Address, TOKEN_ADDRESSES.donut as Address];
    } else {
      // DONUT -> ETH/WETH
      reserveIn = isDonutToken0 ? reserve0 : reserve1; // DONUT reserve
      reserveOut = isDonutToken0 ? reserve1 : reserve0; // WETH reserve
      path = [TOKEN_ADDRESSES.donut as Address, TOKEN_ADDRESSES.weth as Address];
    }

    const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
    const priceImpact = calculatePriceImpact(amountIn, amountOut, reserveIn, reserveOut);

    return {
      amountIn,
      amountOut,
      path,
      priceImpact,
    };
  } catch (error) {
    console.error("UniV2 quote error:", error);
    return null;
  }
}

/**
 * Build swap calldata for Uniswap V2 Router
 */
export function buildUniV2SwapCalldata(
  quote: UniV2Quote,
  recipient: Address,
  slippageBps: number = 100, // 1% default
  isEthIn: boolean
): { to: Address; data: `0x${string}`; value: bigint } {
  const router = LAUNCHPAD_ADDRESSES.uniV2Router as Address;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30 minutes
  const amountOutMin = (quote.amountOut * BigInt(10000 - slippageBps)) / 10000n;

  if (isEthIn) {
    // swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline)
    const selector = "0x7ff36ab5";
    const encodedParams = [
      amountOutMin.toString(16).padStart(64, "0"),
      "80".padStart(64, "0"), // offset to path array (128 bytes = 0x80)
      recipient.slice(2).toLowerCase().padStart(64, "0"),
      deadline.toString(16).padStart(64, "0"),
      "2".padStart(64, "0"), // path length
      quote.path[0].slice(2).toLowerCase().padStart(64, "0"),
      quote.path[1].slice(2).toLowerCase().padStart(64, "0"),
    ].join("");

    return {
      to: router,
      data: `${selector}${encodedParams}` as `0x${string}`,
      value: quote.amountIn,
    };
  } else {
    // swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)
    const selector = "0x18cbafe5";
    const encodedParams = [
      quote.amountIn.toString(16).padStart(64, "0"),
      amountOutMin.toString(16).padStart(64, "0"),
      "a0".padStart(64, "0"), // offset to path array (160 bytes = 0xa0)
      recipient.slice(2).toLowerCase().padStart(64, "0"),
      deadline.toString(16).padStart(64, "0"),
      "2".padStart(64, "0"), // path length
      quote.path[0].slice(2).toLowerCase().padStart(64, "0"),
      quote.path[1].slice(2).toLowerCase().padStart(64, "0"),
    ].join("");

    return {
      to: router,
      data: `${selector}${encodedParams}` as `0x${string}`,
      value: 0n,
    };
  }
}

/**
 * Get spot price from LP reserves (no price impact)
 * Returns how much of tokenOut you get for 1 tokenIn
 */
export async function getLpSpotPrice(
  lpAddress: Address,
  tokenInAddress: string
): Promise<number> {
  try {
    const [reserves, token0] = await Promise.all([
      client.readContract({
        address: lpAddress,
        abi: PAIR_ABI,
        functionName: "getReserves",
      }),
      client.readContract({
        address: lpAddress,
        abi: PAIR_ABI,
        functionName: "token0",
      }),
    ]);

    const [reserve0, reserve1] = reserves;
    const isToken0In = token0.toLowerCase() === tokenInAddress.toLowerCase();

    const reserveIn = isToken0In ? reserve0 : reserve1;
    const reserveOut = isToken0In ? reserve1 : reserve0;

    if (reserveIn === 0n) return 0;
    return Number(reserveOut) / Number(reserveIn);
  } catch (error) {
    console.error("Failed to get LP spot price:", error);
    return 0;
  }
}

/**
 * Calculate theoretical output at spot price for ETH/WETH <-> franchise token swaps
 * Uses DONUT as intermediate: ETH -> DONUT -> FranchiseToken
 */
export async function getTheoreticalOutput(
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: number,
  franchiseTokenLpAddress?: string
): Promise<number> {
  try {
    const donutEthLp = TOKEN_ADDRESSES.donutEthLp as Address;
    const wethAddress = TOKEN_ADDRESSES.weth.toLowerCase();
    const donutAddress = TOKEN_ADDRESSES.donut.toLowerCase();
    const tokenInLower = tokenInAddress.toLowerCase();
    const tokenOutLower = tokenOutAddress.toLowerCase();

    // Normalize ETH to WETH for LP lookups
    const normalizedTokenIn = tokenInLower === NATIVE_ETH_ADDRESS.toLowerCase() ? wethAddress : tokenInLower;
    const normalizedTokenOut = tokenOutLower === NATIVE_ETH_ADDRESS.toLowerCase() ? wethAddress : tokenOutLower;

    // Case 1: ETH/WETH -> Franchise Token (via DONUT)
    if ((normalizedTokenIn === wethAddress) && franchiseTokenLpAddress) {
      // Get DONUT per WETH from DONUT/ETH LP
      const donutPerWeth = await getLpSpotPrice(donutEthLp, wethAddress);
      // Get FranchiseToken per DONUT from FranchiseToken/DONUT LP
      const tokenPerDonut = await getLpSpotPrice(franchiseTokenLpAddress as Address, donutAddress);

      if (donutPerWeth > 0 && tokenPerDonut > 0) {
        return amountIn * donutPerWeth * tokenPerDonut;
      }
    }

    // Case 2: Franchise Token -> ETH/WETH (via DONUT)
    if ((normalizedTokenOut === wethAddress) && franchiseTokenLpAddress) {
      // Get DONUT per FranchiseToken from FranchiseToken/DONUT LP
      const donutPerToken = await getLpSpotPrice(franchiseTokenLpAddress as Address, normalizedTokenIn);
      // Get WETH per DONUT from DONUT/ETH LP
      const wethPerDonut = await getLpSpotPrice(donutEthLp, donutAddress);

      if (donutPerToken > 0 && wethPerDonut > 0) {
        return amountIn * donutPerToken * wethPerDonut;
      }
    }

    // Case 3: DONUT -> ETH/WETH
    if (normalizedTokenIn === donutAddress && normalizedTokenOut === wethAddress) {
      const wethPerDonut = await getLpSpotPrice(donutEthLp, donutAddress);
      return amountIn * wethPerDonut;
    }

    // Case 4: ETH/WETH -> DONUT
    if (normalizedTokenIn === wethAddress && normalizedTokenOut === donutAddress) {
      const donutPerWeth = await getLpSpotPrice(donutEthLp, wethAddress);
      return amountIn * donutPerWeth;
    }

    return 0;
  } catch (error) {
    console.error("Failed to get theoretical output:", error);
    return 0;
  }
}

/**
 * Get the USD price of an LP token
 * LP value = (reserveDonut * donutPriceUsd + reserveWeth * ethPriceUsd) / totalSupply
 */
export async function getLpTokenPriceUsd(
  lpAddress: Address,
  ethPriceUsd: number,
  donutPriceUsd: number
): Promise<number> {
  try {
    const [reserves, token0, totalSupply] = await Promise.all([
      client.readContract({
        address: lpAddress,
        abi: PAIR_ABI,
        functionName: "getReserves",
      }),
      client.readContract({
        address: lpAddress,
        abi: PAIR_ABI,
        functionName: "token0",
      }),
      client.readContract({
        address: lpAddress,
        abi: ERC20_TOTAL_SUPPLY_ABI,
        functionName: "totalSupply",
      }),
    ]);

    if (totalSupply === 0n) return 0;

    const [reserve0, reserve1] = reserves;
    const isDonutToken0 = token0.toLowerCase() === TOKEN_ADDRESSES.donut.toLowerCase();

    // Get reserves in native units (both are 18 decimals)
    const donutReserve = isDonutToken0 ? reserve0 : reserve1;
    const wethReserve = isDonutToken0 ? reserve1 : reserve0;

    // Calculate total value of LP in USD
    const donutValue = Number(formatUnits(donutReserve, 18)) * donutPriceUsd;
    const wethValue = Number(formatUnits(wethReserve, 18)) * ethPriceUsd;
    const totalValueUsd = donutValue + wethValue;

    // LP token price = total value / total supply (LP tokens also have 18 decimals)
    const lpPriceUsd = totalValueUsd / Number(formatUnits(totalSupply, 18));

    return lpPriceUsd;
  } catch (error) {
    console.error("Failed to get LP token price:", error);
    return 0;
  }
}

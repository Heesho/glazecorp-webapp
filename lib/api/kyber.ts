// KyberSwap Aggregator API for Base chain
const KYBER_API_BASE = "https://aggregator-api.kyberswap.com/base";

export interface KyberQuoteResponse {
  code: number;
  message?: string;
  data?: {
    routeSummary: {
      tokenIn: string;
      amountIn: string;
      amountInUsd: string;
      tokenOut: string;
      amountOut: string;
      amountOutUsd: string;
      gas: string;
      gasPrice: string;
      gasUsd: string;
      route: Array<Array<{
        pool: string;
        tokenIn: string;
        tokenOut: string;
        swapAmount: string;
        amountOut: string;
        exchange: string;
      }>>;
      routeID: string;
    };
    routerAddress: string;
  };
  // Legacy format compatibility
  routeSummary?: {
    tokenIn: string;
    amountIn: string;
    amountInUsd?: string;
    tokenOut: string;
    amountOut: string;
    amountOutUsd: string;
    gas: string;
    gasUsd: string;
  };
  routerAddress?: string;
}

export interface KyberBuildRouteResponse {
  code: number;
  message?: string;
  data?: {
    amountIn: string;
    amountOut: string;
    routerAddress: string;
    data: string; // encoded swap calldata
  };
}

export interface SwapToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  lpAddress?: string; // UniV2 LP address (for franchise tokens paired with DONUT)
}

// Native ETH represented as zero address in Kyber
export const NATIVE_ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Get quote from Kyber aggregator
export async function getKyberQuote(
  tokenIn: string,
  tokenOut: string,
  amountIn: string, // in wei
  slippageBps = 100 // 1% default
): Promise<KyberQuoteResponse | null> {
  try {
    const params = new URLSearchParams({
      tokenIn,
      tokenOut,
      amountIn,
      gasInclude: "true",
    });

    console.log("Kyber quote request:", {
      url: `${KYBER_API_BASE}/api/v1/routes?${params}`,
      tokenIn,
      tokenOut,
      amountIn,
    });

    const res = await fetch(`${KYBER_API_BASE}/api/v1/routes?${params}`, {
      headers: {
        "X-Client-Id": "glazecorp",
      },
    });

    const data = await res.json();
    console.log("Kyber quote response:", data);

    // Check for error codes in response body
    if (data.code && data.code !== 0) {
      console.error("Kyber API error:", data.code, data.message);
      return null;
    }

    // Handle both nested and flat response formats
    if (data.data?.routeSummary) {
      return {
        ...data,
        routeSummary: data.data.routeSummary,
        routerAddress: data.data.routerAddress,
      };
    }

    return data;
  } catch (error) {
    console.error("Kyber quote error:", error);
    return null;
  }
}

// Build swap transaction from Kyber
export async function buildKyberSwap(
  routeSummary: KyberQuoteResponse["routeSummary"],
  routerAddress: string,
  sender: string,
  recipient: string,
  slippageBps = 100 // 1% default
): Promise<KyberBuildRouteResponse | null> {
  try {
    console.log("Kyber build request:", { routeSummary, sender, recipient, slippageBps });

    const res = await fetch(`${KYBER_API_BASE}/api/v1/route/build`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "glazecorp",
      },
      body: JSON.stringify({
        routeSummary,
        sender,
        recipient,
        slippageTolerance: slippageBps,
      }),
    });

    const data = await res.json();
    console.log("Kyber build response:", data);

    // Check for error codes in response body
    if (data.code && data.code !== 0) {
      console.error("Kyber build API error:", data.code, data.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Kyber build error:", error);
    return null;
  }
}

// Format amount with decimals
export function formatTokenAmount(amount: string, decimals: number): string {
  const num = parseFloat(amount) / Math.pow(10, decimals);
  if (num < 0.0001) return num.toExponential(2);
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return (num / 1000).toFixed(2) + "K";
  return (num / 1000000).toFixed(2) + "M";
}

// Parse amount to wei
export function parseTokenAmount(amount: string, decimals: number): string {
  try {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return "0";
    return BigInt(Math.floor(num * Math.pow(10, decimals))).toString();
  } catch {
    return "0";
  }
}

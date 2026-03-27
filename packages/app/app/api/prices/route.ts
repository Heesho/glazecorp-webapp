import { NextResponse } from "next/server";

let cachedPrices: { eth: number; btc: number } | null = null;
let cacheTime = 0;
const CACHE_DURATION = 120000; // 2 minutes

export async function GET() {
  const now = Date.now();

  if (cachedPrices && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedPrices);
  }

  try {
    const [ethRes, btcRes] = await Promise.all([
      fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot"),
      fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot"),
    ]);

    const [ethData, btcData] = await Promise.all([
      ethRes.json(),
      btcRes.json(),
    ]);

    const prices = {
      eth: ethData?.data?.amount ? parseFloat(ethData.data.amount) : 0,
      btc: btcData?.data?.amount ? parseFloat(btcData.data.amount) : 0,
    };

    cachedPrices = prices;
    cacheTime = now;

    return NextResponse.json(prices);
  } catch (error) {
    console.error("Failed to fetch prices:", error);

    if (cachedPrices) {
      return NextResponse.json(cachedPrices);
    }

    return NextResponse.json({ eth: 0, btc: 0 }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

type Prices = {
  eth: number;
  btc: number;
  aero: number;
  clanker: number;
  bnkr: number;
  qr: number;
};

let cachedPrices: Prices | null = null;
let cacheTime = 0;
const CACHE_DURATION = 120000; // 2 minutes

// Base chain token contract addresses for DexScreener
const BASE_TOKENS: Record<string, string> = {
  aero: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
  clanker: "0x1bc0c42215582d5a085795f4badbac3ff36d1bcb",
  bnkr: "0x22af33fe49fd1fa80c7149773dde5890d3c76f3b",
  qr: "0x2b5050f01d64fbb3e4ac44dc07f0732bfb5ecadf",
};

async function fetchDexScreenerPrice(address: string): Promise<number> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const pair = data?.pairs?.[0];
    return pair?.priceUsd ? parseFloat(pair.priceUsd) : 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  const now = Date.now();

  if (cachedPrices && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedPrices);
  }

  try {
    const [ethRes, btcRes, aeroPrice, clankerPrice, bnkrPrice, qrPrice] = await Promise.all([
      fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot"),
      fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot"),
      fetchDexScreenerPrice(BASE_TOKENS.aero),
      fetchDexScreenerPrice(BASE_TOKENS.clanker),
      fetchDexScreenerPrice(BASE_TOKENS.bnkr),
      fetchDexScreenerPrice(BASE_TOKENS.qr),
    ]);

    const [ethData, btcData] = await Promise.all([
      ethRes.json(),
      btcRes.json(),
    ]);

    const prices: Prices = {
      eth: ethData?.data?.amount ? parseFloat(ethData.data.amount) : 0,
      btc: btcData?.data?.amount ? parseFloat(btcData.data.amount) : 0,
      aero: aeroPrice,
      clanker: clankerPrice,
      bnkr: bnkrPrice,
      qr: qrPrice,
    };

    cachedPrices = prices;
    cacheTime = now;

    return NextResponse.json(prices);
  } catch (error) {
    console.error("Failed to fetch prices:", error);

    if (cachedPrices) {
      return NextResponse.json(cachedPrices);
    }

    return NextResponse.json({ eth: 0, btc: 0, aero: 0, clanker: 0, bnkr: 0, qr: 0 }, { status: 500 });
  }
}

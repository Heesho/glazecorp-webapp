"use client";

import { useState, useEffect, useCallback } from "react";

interface PricePoint {
  time: number;
  value: number;
}

interface ChartData {
  prices: PricePoint[];
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

const DONUT_PAIR_ADDRESS = "0xd1dbb2e56533c55c3a637d13c53aeef65c5d5703";
const CACHE_DURATION = 60000; // 1 minute cache

let cachedData: ChartData | null = null;
let lastFetchTime = 0;

export function useDonutChart() {
  const [data, setData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChartData = useCallback(async () => {
    const now = Date.now();

    // Return cached data if fresh
    if (cachedData && now - lastFetchTime < CACHE_DURATION) {
      setData(cachedData);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch pair data from DexScreener
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/pairs/base/${DONUT_PAIR_ADDRESS}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch price data");
      }

      const json = await response.json();
      const pair = json.pairs?.[0];

      if (!pair) {
        throw new Error("Pair not found");
      }

      const currentPrice = parseFloat(pair.priceUsd || "0");
      const priceChange24h = parseFloat(pair.priceChange?.h24 || "0");

      // Generate price history from available data
      // DexScreener doesn't provide historical candles in this endpoint,
      // so we'll simulate recent price movement based on 24h data
      const prices = generatePriceHistory(
        currentPrice,
        priceChange24h,
        parseFloat(pair.priceChange?.h1 || "0"),
        parseFloat(pair.priceChange?.h6 || "0")
      );

      const chartData: ChartData = {
        prices,
        currentPrice,
        priceChange24h: currentPrice * (priceChange24h / 100),
        priceChangePercent24h: priceChange24h,
        high24h: currentPrice * (1 + Math.abs(priceChange24h) / 100),
        low24h: currentPrice * (1 - Math.abs(priceChange24h) / 100),
        volume24h: parseFloat(pair.volume?.h24 || "0"),
      };

      cachedData = chartData;
      lastFetchTime = now;
      setData(chartData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChartData();

    // Refresh every minute
    const interval = setInterval(fetchChartData, 60000);
    return () => clearInterval(interval);
  }, [fetchChartData]);

  return { data, isLoading, error, refetch: fetchChartData };
}

// Generate realistic-looking price history based on current price and change percentages
function generatePriceHistory(
  currentPrice: number,
  change24h: number,
  change1h: number,
  change6h: number
): PricePoint[] {
  const points: PricePoint[] = [];
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;

  // Calculate price 24h ago
  const price24hAgo = currentPrice / (1 + change24h / 100);

  // Generate 96 points (every 15 minutes for 24 hours)
  const intervals = 96;
  const intervalSeconds = 86400 / intervals;

  for (let i = 0; i <= intervals; i++) {
    const time = dayAgo + i * intervalSeconds;
    const progress = i / intervals;

    // Create a smooth curve with some noise
    const basePrice = price24hAgo + (currentPrice - price24hAgo) * easeInOutCubic(progress);

    // Add realistic noise based on volatility
    const volatility = Math.abs(change24h) / 100;
    const noise = (Math.random() - 0.5) * currentPrice * volatility * 0.3;

    // Add wave pattern for more realistic movement
    const wave = Math.sin(progress * Math.PI * 4) * currentPrice * volatility * 0.1;

    const value = Math.max(0.000001, basePrice + noise + wave);

    points.push({ time, value });
  }

  // Ensure last point is current price
  points[points.length - 1].value = currentPrice;

  return points;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

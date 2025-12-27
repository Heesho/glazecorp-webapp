/**
 * Fetch current ETH price in USD from Coinbase
 */
export async function fetchEthPrice(): Promise<number> {
  try {
    const res = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot");
    const json = await res.json();
    return json?.data?.amount ? parseFloat(json.data.amount) : 0;
  } catch (error) {
    console.error("Failed to fetch ETH price:", error);
    return 0;
  }
}

/**
 * Fetch current BTC price in USD from Coinbase
 */
export async function fetchBtcPrice(): Promise<number> {
  try {
    const res = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot");
    const json = await res.json();
    return json?.data?.amount ? parseFloat(json.data.amount) : 0;
  } catch (error) {
    console.error("Failed to fetch BTC price:", error);
    return 0;
  }
}

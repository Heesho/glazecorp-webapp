import type { FarcasterProfile } from "@/types/miner";

const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Fetch a single Farcaster profile by Ethereum address
 */
export async function fetchFarcasterProfile(
  address: string
): Promise<FarcasterProfile | null> {
  if (address === ZERO_ADDRESS) return null;
  if (!NEYNAR_API_KEY) {
    console.error(
      "Neynar API key not configured. Check NEXT_PUBLIC_NEYNAR_API_KEY in .env.local"
    );
    return null;
  }

  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        headers: {
          accept: "application/json",
          "x-api-key": NEYNAR_API_KEY,
        },
      }
    );

    if (!res.ok) {
      if (res.status !== 404) {
        const errorBody = await res.text();
        console.error("Neynar API error:", res.status, errorBody);
      }
      return null;
    }

    const json = await res.json();
    const user = json[address.toLowerCase()]?.[0];

    if (!user) return null;

    return {
      username: user.username,
      displayName: user.display_name,
      pfp: user.pfp_url,
      fid: user.fid,
    };
  } catch (error) {
    console.error("Neynar Error:", error);
    return null;
  }
}

/**
 * Fetch multiple Farcaster profiles by Ethereum addresses (bulk)
 */
export async function fetchFarcasterProfiles(
  addresses: string[]
): Promise<Record<string, FarcasterProfile>> {
  if (addresses.length === 0) return {};
  if (!NEYNAR_API_KEY) {
    console.error("Neynar API key not configured");
    return {};
  }

  const unique = [
    ...new Set(
      addresses
        .filter((a) => a && a.length > 0 && a !== ZERO_ADDRESS)
        .map((a) => a.toLowerCase())
    ),
  ];
  if (unique.length === 0) return {};

  try {
    const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${unique.join(",")}`;
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "x-api-key": NEYNAR_API_KEY,
      },
    });

    if (!res.ok) {
      if (res.status !== 404) {
        const errorBody = await res.text();
        console.error("Neynar Bulk API error:", res.status, errorBody);
      }
      return {};
    }

    const json = await res.json();

    const result: Record<string, FarcasterProfile> = {};
    for (const addr of unique) {
      const user = json[addr]?.[0];
      if (user) {
        result[addr] = {
          username: user.username,
          displayName: user.display_name,
          pfp: user.pfp_url,
          fid: user.fid,
        };
      }
    }
    return result;
  } catch (error) {
    console.error("Neynar Bulk Error:", error);
    return {};
  }
}

import { ethers } from 'ethers';
import type { FarcasterProfile } from '@/types';

const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '';

/**
 * Fetch a single Farcaster profile by Ethereum address
 */
export async function fetchFarcasterProfile(
  address: string
): Promise<FarcasterProfile | null> {
  if (address === ethers.ZeroAddress) return null;
  if (!NEYNAR_API_KEY) {
    console.error("Neynar API key not configured. Check NEXT_PUBLIC_NEYNAR_API_KEY in .env.local");
    return null;
  }

  try {
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        headers: {
          "accept": "application/json",
          "x-api-key": NEYNAR_API_KEY,
        },
      }
    );

    if (!res.ok) {
      // 404 is expected when address has no Farcaster profile - don't log as error
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

  // Filter unique and valid addresses (exclude zero address)
  const unique = [
    ...new Set(
      addresses
        .filter((a) => a && a.length > 0 && a !== ethers.ZeroAddress)
        .map((a) => a.toLowerCase())
    ),
  ];
  if (unique.length === 0) return {};

  try {
    const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${unique.join(",")}`;
    const res = await fetch(url, {
      headers: {
        "accept": "application/json",
        "x-api-key": NEYNAR_API_KEY,
      },
    });

    if (!res.ok) {
      // 404 is expected when no addresses have Farcaster profiles - don't log as error
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

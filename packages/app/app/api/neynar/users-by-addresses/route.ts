import { NextRequest, NextResponse } from "next/server";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const apiKey = process.env.NEYNAR_API_KEY;
const neynarClient = apiKey ? new NeynarAPIClient(apiKey) : null;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type ProfilePayload = {
  fid: number | null;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
};

export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get("addresses");
  if (!param) {
    return NextResponse.json(
      { error: "Missing addresses parameter." },
      { status: 400 },
    );
  }

  if (!apiKey || !neynarClient) {
    return NextResponse.json(
      { error: "Neynar API key not configured." },
      { status: 503 },
    );
  }

  const unique = [
    ...new Set(
      param
        .split(",")
        .map((a) => a.trim().toLowerCase())
        .filter((a) => a.length > 0 && a !== ZERO_ADDRESS),
    ),
  ];

  if (unique.length === 0) {
    return NextResponse.json({ users: {} });
  }

  try {
    const response = await neynarClient.fetchBulkUsersByEthereumAddress(unique);

    const users: Record<string, ProfilePayload | null> = {};
    for (const addr of unique) {
      const matchKey = Object.keys(response).find((key) => key.toLowerCase() === addr);
      const user = matchKey ? response[matchKey]?.[0] : null;
      users[addr] = user
        ? {
            fid: user.fid ?? null,
            username: user.username ?? null,
            displayName: user.display_name ?? null,
            pfpUrl: user.pfp_url ?? null,
          }
        : null;
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[neynar:users-by-addresses] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch Neynar users.", details: errorMessage },
      { status: 500 },
    );
  }
}

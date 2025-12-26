export interface Slot0 {
  locked: boolean;
  epochId: number;
  initPrice: bigint;
  startTime: number;
  dps: bigint;
  miner: string;
  uri: string;
}

export interface MinerState {
  epochId: number;
  initPrice: bigint;
  startTime: number;
  glazed: bigint;
  price: bigint;
  dps: bigint;
  nextDps: bigint;
  donutPrice: bigint;
  miner: string;
  uri: string;
  ethBalance: bigint;
  donutBalance: bigint;
  wethBalance: bigint;
}

export interface FarcasterProfile {
  username: string;
  displayName: string;
  pfp: string;
  fid: number;
}

export interface GraphStat {
  id: string;
  mined: string;
  spent: string;
  earned: string;
}

export interface FeedItem {
  id: string;
  miner: string;
  uri: string;
  timestamp: number;
  price: string;
  earned: string;
  mined: string;
}

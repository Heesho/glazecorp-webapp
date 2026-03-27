type ConnectorLike = {
  id?: string;
  type?: string;
};

export const FARCASTER_AUTO_CONNECT_KEY = "farcaster_auto_connect_attempted";

export function isFarcasterConnector(connector: ConnectorLike | null | undefined): boolean {
  if (!connector) return false;
  return connector.type === "farcasterMiniApp" || connector.id === "farcaster" || connector.id === "farcasterMiniApp";
}

export function getFarcasterConnector<T extends ConnectorLike>(connectors: readonly T[]): T | undefined {
  return connectors.find((connector) => isFarcasterConnector(connector));
}

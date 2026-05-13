type ConnectorLike = {
  id?: string;
  name?: string;
  rdns?: string | readonly string[];
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

export function isRabbyConnector(connector: ConnectorLike | null | undefined): boolean {
  if (!connector) return false;

  const id = connector.id?.toLowerCase();
  const name = connector.name?.toLowerCase();
  const rdnsValues =
    typeof connector.rdns === "string" ? [connector.rdns] : connector.rdns ?? [];

  return (
    id === "rabby" ||
    id === "io.rabby" ||
    name?.includes("rabby") === true ||
    rdnsValues.some((rdns) => rdns.toLowerCase() === "io.rabby")
  );
}

export function isWalletConnectConnector(connector: ConnectorLike | null | undefined): boolean {
  if (!connector) return false;
  return connector.type === "walletConnect" || connector.id === "walletConnect";
}

export function isBrowserWalletConnector(connector: ConnectorLike | null | undefined): boolean {
  if (!connector || isFarcasterConnector(connector)) return false;
  return (
    connector.type === "injected" ||
    connector.id === "injected" ||
    isRabbyConnector(connector) ||
    isWalletConnectConnector(connector)
  );
}

export function getBrowserWalletConnectors<T extends ConnectorLike>(connectors: readonly T[]): T[] {
  const preferred = [
    connectors.filter((connector) => isRabbyConnector(connector)),
    connectors.filter((connector) => connector.id === "injected"),
    connectors.filter((connector) => isBrowserWalletConnector(connector) && !isWalletConnectConnector(connector)),
    connectors.filter((connector) => isWalletConnectConnector(connector)),
    connectors.filter((connector) => !isFarcasterConnector(connector)),
  ].flat();

  return preferred.filter(
    (connector, index) => preferred.findIndex((candidate) => candidate.id === connector.id) === index
  );
}

export function getPreferredWalletConnectors<T extends ConnectorLike>(
  connectors: readonly T[],
  options: { preferFarcaster?: boolean } = {}
): T[] {
  const farcasterConnector = getFarcasterConnector(connectors);
  const browserConnectors = getBrowserWalletConnectors(connectors);

  if (options.preferFarcaster && farcasterConnector) {
    return [farcasterConnector, ...browserConnectors];
  }

  return browserConnectors;
}

export function isConnectorUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  return (
    error.name === "ProviderNotFoundError" ||
    error.name === "ConnectorNotFoundError" ||
    message.includes("provider not found") ||
    message.includes("connector not found") ||
    message.includes("wallet connector not available")
  );
}

export function shouldTryNextConnector(connector: ConnectorLike, error: unknown): boolean {
  return isFarcasterConnector(connector) || isConnectorUnavailableError(error);
}

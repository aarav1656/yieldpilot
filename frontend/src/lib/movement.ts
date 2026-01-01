import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Movement Network Configuration
export const MOVEMENT_NETWORKS = {
  mainnet: {
    name: "Movement Mainnet",
    chainId: 126,
    fullnodeUrl: "https://mainnet.movementnetwork.xyz/v1",
    indexerUrl: "https://indexer.mainnet.movementnetwork.xyz/v1/graphql",
    explorerUrl: "https://explorer.movementnetwork.xyz",
    faucetUrl: null,
  },
  testnet: {
    name: "Movement Testnet",
    chainId: 177,
    fullnodeUrl: "https://testnet.movementnetwork.xyz/v1",
    indexerUrl: "https://indexer.testnet.movementnetwork.xyz/v1/graphql",
    explorerUrl: "https://explorer.movementnetwork.xyz/?network=testnet",
    faucetUrl: "https://faucet.testnet.movementnetwork.xyz",
  },
} as const;

// Use mainnet for production x402 transactions
export const ACTIVE_NETWORK = MOVEMENT_NETWORKS.mainnet;

// Create Aptos client for Movement
const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: ACTIVE_NETWORK.fullnodeUrl,
  indexer: ACTIVE_NETWORK.indexerUrl,
});

export const aptosClient = new Aptos(config);

// YieldPilot contract address (will be set after deployment)
export const YIELDPILOT_ADDRESS = process.env.NEXT_PUBLIC_YIELDPILOT_ADDRESS || "0x0";

// x402 Signal Server
export const SIGNAL_SERVER_URL = process.env.NEXT_PUBLIC_SIGNAL_SERVER_URL || "http://localhost:4402";

// Helper functions
export function getExplorerUrl(path: string): string {
  return `${ACTIVE_NETWORK.explorerUrl}${path}`;
}

export function getAccountExplorerUrl(address: string): string {
  return getExplorerUrl(`/account/${address}`);
}

export function getTxExplorerUrl(hash: string): string {
  return getExplorerUrl(`/txn/${hash}`);
}

export function toHex(value: string | number): string {
  if (typeof value === "number") {
    return `0x${value.toString(16)}`;
  }
  if (value.startsWith("0x")) {
    return value;
  }
  return `0x${value}`;
}

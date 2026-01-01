"use client";

import { useState } from "react";
import { useWallet, WalletReadyState, WalletName } from "@aptos-labs/wallet-adapter-react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, ExternalLink } from "lucide-react";

interface WalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletSelectionModal({ isOpen, onClose }: WalletSelectionModalProps) {
  const { wallets, connect } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  // Filter to show installable or installed wallets
  const availableWallets = (wallets || []).filter(
    (wallet) =>
      wallet.readyState === WalletReadyState.Installed ||
      wallet.readyState === WalletReadyState.Loadable
  );

  const notInstalledWallets = (wallets || []).filter(
    (wallet) => wallet.readyState === WalletReadyState.NotDetected
  );

  const handleConnect = async (walletName: WalletName) => {
    try {
      setIsConnecting(true);
      await connect(walletName);
      onClose();
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md z-50 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-bold">
              Connect Wallet
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <p className="text-zinc-400 text-sm mb-6">
            Connect your wallet to access YieldPilot on Movement Network
          </p>

          {/* Available Wallets */}
          <div className="space-y-2 mb-6">
            {availableWallets.length > 0 ? (
              availableWallets.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => handleConnect(wallet.name)}
                  disabled={isConnecting}
                  className="w-full flex items-center gap-3 p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {wallet.icon && (
                    <img
                      src={wallet.icon}
                      alt={wallet.name}
                      className="w-8 h-8 rounded-lg"
                    />
                  )}
                  <span className="font-medium flex-1 text-left">
                    {wallet.name}
                  </span>
                  {isConnecting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-movement-yellow" />
                  ) : (
                    <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                      Installed
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-zinc-400 mb-4">
                  No compatible wallets detected
                </p>
                <p className="text-sm text-zinc-500">
                  Install a wallet to continue
                </p>
              </div>
            )}
          </div>

          {/* Not Installed Wallets */}
          {notInstalledWallets.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">
                Get a Wallet
              </p>
              <div className="space-y-2">
                {notInstalledWallets.slice(0, 3).map((wallet) => (
                  <a
                    key={wallet.name}
                    href={wallet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl transition-colors"
                  >
                    {wallet.icon && (
                      <img
                        src={wallet.icon}
                        alt={wallet.name}
                        className="w-6 h-6 rounded-lg opacity-60"
                      />
                    )}
                    <span className="text-sm text-zinc-400 flex-1 text-left">
                      {wallet.name}
                    </span>
                    <ExternalLink className="w-4 h-4 text-zinc-500" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Wallet */}
          <div className="mt-6 pt-6 border-t border-zinc-700">
            <p className="text-xs text-zinc-500 mb-3">
              Recommended for Movement
            </p>
            <a
              href="https://nightly.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-movement-yellow/10 border border-movement-yellow/30 rounded-xl hover:bg-movement-yellow/20 transition-colors"
            >
              <div className="w-8 h-8 bg-movement-yellow rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">N</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-movement-yellow">
                  Nightly Wallet
                </p>
                <p className="text-xs text-zinc-400">
                  Multi-chain wallet with Movement support
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-movement-yellow" />
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

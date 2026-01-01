"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState } from "react";
import { truncateAddress } from "@/lib/lib/utils";
import { ACTIVE_NETWORK, getAccountExplorerUrl } from "@/lib/movement";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WalletSelectionModal } from "./wallet-selection-modal";
import { Copy, ExternalLink, LogOut, Wallet, ChevronDown } from "lucide-react";

export function ConnectWallet() {
  const { account, connected, disconnect, wallet } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (account?.address) {
      await navigator.clipboard.writeText(account.address.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!connected || !account) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-movement-yellow text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </button>
        <WalletSelectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors">
          {wallet?.icon && (
            <img src={wallet.icon} alt={wallet.name} className="w-4 h-4" />
          )}
          <span className="font-mono text-sm">
            {truncateAddress(account.address.toString())}
          </span>
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 bg-zinc-900 border-zinc-700"
      >
        <div className="px-3 py-2 border-b border-zinc-700">
          <p className="text-xs text-zinc-400">Connected to</p>
          <p className="text-sm font-medium text-movement-yellow">
            {ACTIVE_NETWORK.name}
          </p>
        </div>

        <DropdownMenuItem
          onClick={handleCopy}
          className="cursor-pointer hover:bg-zinc-800"
        >
          <Copy className="w-4 h-4 mr-2" />
          {copied ? "Copied!" : "Copy Address"}
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a
            href={getAccountExplorerUrl(account.address.toString())}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer hover:bg-zinc-800"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Explorer
          </a>
        </DropdownMenuItem>

        {ACTIVE_NETWORK.faucetUrl && (
          <DropdownMenuItem asChild>
            <a
              href={ACTIVE_NETWORK.faucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer hover:bg-zinc-800"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Get Test Tokens
            </a>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-zinc-700" />

        <DropdownMenuItem
          onClick={() => disconnect()}
          className="cursor-pointer text-red-400 hover:bg-zinc-800 hover:text-red-300"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

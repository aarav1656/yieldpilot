"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { ConnectWallet } from "@/components/connect-wallet";
import { Dashboard } from "@/components/dashboard";
import {
  TrendingUp,
  Shield,
  Zap,
  ChevronRight,
  BarChart3,
  Coins,
  Lock,
} from "lucide-react";

export default function Home() {
  const { connected } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 border-4 border-movement-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (connected) {
    return <Dashboard />;
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-movement-yellow rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-black" />
            </div>
            <span className="text-xl font-bold">YieldPilot</span>
          </div>
          <ConnectWallet />
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-movement-yellow/10 border border-movement-yellow/30 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-movement-yellow rounded-full pulse-dot" />
              <span className="text-sm text-movement-yellow">Live on Movement Network</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              <span className="gradient-text">AI-Powered</span>
              <br />
              Yield Optimization
            </h1>

            <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
              Maximize your DeFi returns with intelligent yield strategies on Movement.
              Pay-per-signal with x402 micropayments — only pay for the insights you use.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => document.querySelector<HTMLButtonElement>('[data-wallet-connect]')?.click()}
                className="flex items-center gap-2 bg-movement-yellow text-black px-8 py-4 rounded-xl font-semibold text-lg hover:bg-yellow-400 transition-colors"
              >
                Get Started
                <ChevronRight className="w-5 h-5" />
              </button>
              <a
                href="#features"
                className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-zinc-700 transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 border-y border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold gradient-text">$50M+</p>
            <p className="text-zinc-400 mt-1">TVL Analyzed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold gradient-text">15+</p>
            <p className="text-zinc-400 mt-1">DeFi Protocols</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold gradient-text">0.01</p>
            <p className="text-zinc-400 mt-1">MOVE per Signal</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold gradient-text">Real-time</p>
            <p className="text-zinc-400 mt-1">Pyth Oracle Data</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Intelligent Yield Management
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Powered by real-time data from DefiLlama and Pyth Oracle,
              YieldPilot analyzes Movement DeFi to find optimal opportunities.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 hover:border-zinc-700 transition-colors">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Yield Signals</h3>
              <p className="text-zinc-400 leading-relaxed">
                Get personalized yield optimization recommendations based on
                real-time protocol analysis, TVL trends, and risk scoring.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 hover:border-zinc-700 transition-colors">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Risk Assessment</h3>
              <p className="text-zinc-400 leading-relaxed">
                Comprehensive risk analysis including smart contract risk,
                liquidity depth, protocol safety, and market conditions.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 hover:border-zinc-700 transition-colors">
              <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6">
                <Coins className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">x402 Micropayments</h3>
              <p className="text-zinc-400 leading-relaxed">
                Pay only for the signals you use. No subscriptions, no commitments —
                instant payments via Movement Network.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-6 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-movement-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-movement-yellow font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Connect Wallet</h3>
              <p className="text-sm text-zinc-400">
                Link your Movement-compatible wallet to get started
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-movement-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-movement-yellow font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Request Signal</h3>
              <p className="text-sm text-zinc-400">
                Choose the yield signal or analytics you need
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-movement-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-movement-yellow font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Pay with MOVE</h3>
              <p className="text-sm text-zinc-400">
                Instant micropayment via x402 protocol
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-movement-yellow/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-movement-yellow font-bold">4</span>
              </div>
              <h3 className="font-semibold mb-2">Optimize Yields</h3>
              <p className="text-sm text-zinc-400">
                Execute strategies based on AI recommendations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pay-Per-Signal Pricing
            </h2>
            <p className="text-zinc-400">
              No subscriptions. Pay only for what you use.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <Zap className="w-8 h-8 text-movement-yellow mb-4" />
              <h3 className="font-semibold mb-1">Optimal Yield</h3>
              <p className="text-2xl font-bold gradient-text mb-2">0.01 MOVE</p>
              <p className="text-sm text-zinc-400">
                AI-powered strategy recommendation
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <BarChart3 className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="font-semibold mb-1">Protocol Analytics</h3>
              <p className="text-2xl font-bold text-blue-400 mb-2">0.001 MOVE</p>
              <p className="text-sm text-zinc-400">
                Detailed protocol performance data
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <Shield className="w-8 h-8 text-green-400 mb-4" />
              <h3 className="font-semibold mb-1">Risk Assessment</h3>
              <p className="text-2xl font-bold text-green-400 mb-2">0.005 MOVE</p>
              <p className="text-sm text-zinc-400">
                Comprehensive risk analysis
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <TrendingUp className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="font-semibold mb-1">Live Prices</h3>
              <p className="text-2xl font-bold text-purple-400 mb-2">0.0005 MOVE</p>
              <p className="text-sm text-zinc-400">
                Real-time Pyth oracle feeds
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-movement-yellow/10 to-yellow-500/5 border border-movement-yellow/30 rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Optimize Your Yields?
            </h2>
            <p className="text-zinc-400 text-lg mb-8">
              Connect your wallet and start getting AI-powered yield signals on Movement Network.
            </p>
            <ConnectWallet />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-movement-yellow rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-black" />
            </div>
            <span className="font-semibold">YieldPilot</span>
          </div>
          <p className="text-sm text-zinc-500">
            Built for Movement Network Hackathon 2024
          </p>
          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <a href="#" className="hover:text-white transition-colors">Docs</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

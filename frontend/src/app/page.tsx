import Link from 'next/link';
import { Header } from '@/components/Header';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-purple bg-clip-text text-transparent">
            Cross-Chain Deal Vaults
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Decentralized liquidity pools with state channel settlements powered by Yellow Network and Flare
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/deals"
              className="px-8 py-3 bg-gradient-purple rounded-lg font-semibold hover:opacity-90 transition"
            >
              Browse Deals
            </Link>
            <Link
              href="/positions"
              className="px-8 py-3 border border-purple-500 rounded-lg font-semibold hover:bg-purple-500/10 transition"
            >
              My Positions
            </Link>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <div className="text-3xl font-bold mb-2">$0.00</div>
            <div className="text-gray-400">Total Value Locked</div>
          </div>
          <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
            <div className="text-3xl font-bold mb-2">0</div>
            <div className="text-gray-400">Active Deals</div>
          </div>
          <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
            <div className="text-3xl font-bold mb-2">0</div>
            <div className="text-gray-400">Total LPs</div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-xl bg-gray-800/50 border border-gray-700">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold mb-3">State Channel Powered</h3>
            <p className="text-gray-400">
              Instant settlements using Yellow Network's Nitrolite protocol with ERC-7824 state channels
            </p>
          </div>
          <div className="p-8 rounded-xl bg-gray-800/50 border border-gray-700">
            <div className="text-4xl mb-4">🔮</div>
            <h3 className="text-2xl font-bold mb-3">FTSO Price Feeds</h3>
            <p className="text-gray-400">
              Real-time, decentralized price data from Flare's Time Series Oracle
            </p>
          </div>
          <div className="p-8 rounded-xl bg-gray-800/50 border border-gray-700">
            <div className="text-4xl mb-4">🌐</div>
            <h3 className="text-2xl font-bold mb-3">Cross-Chain</h3>
            <p className="text-gray-400">
              Seamless multi-chain operations powered by LayerZero messaging protocol
            </p>
          </div>
          <div className="p-8 rounded-xl bg-gray-800/50 border border-gray-700">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-2xl font-bold mb-3">Non-Custodial</h3>
            <p className="text-gray-400">
              Your funds remain under your control with smart contract security
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

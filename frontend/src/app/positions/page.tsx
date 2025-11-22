'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useAccount } from 'wagmi';
import { positionsApi, type Position } from '@/lib/api';
import { formatAmount, formatDate, getStatusColor } from '@/lib/utils';
import Link from 'next/link';

export default function PositionsPage() {
  const { address } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address) {
      loadPositions();
    }
  }, [address]);

  const loadPositions = async () => {
    if (!address) return;
    
    try {
      setLoading(true);
      const response = await positionsApi.list({ owner: address });
      setPositions(response.positions || []);
    } catch (error) {
      console.error('Failed to load positions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">My Positions</h1>
          <p className="text-gray-400">Connect your wallet to view your positions</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">My Positions</h1>

        {loading ? (
          <div className="text-center py-20">
            <div className="text-gray-400">Loading positions...</div>
          </div>
        ) : positions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">No positions found</div>
            <Link 
              href="/deals"
              className="inline-block px-6 py-3 bg-gradient-purple rounded-lg hover:opacity-90 transition"
            >
              Browse Deals
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {positions.map((position) => (
              <div
                key={position.id}
                className="p-6 rounded-xl bg-gray-800/50 border border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">Position #{position.id}</h3>
                    <Link
                      href={`/deals/${position.dealId}`}
                      className="text-purple-400 hover:text-purple-300 text-sm"
                    >
                      View Deal #{position.dealId} →
                    </Link>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    position.claimed ? 'bg-gray-500/10 text-gray-500' : 'bg-green-500/10 text-green-500'
                  }`}>
                    {position.claimed ? 'Claimed' : 'Active'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Deposit Amount</div>
                    <div className="font-semibold">{formatAmount(position.depositAmount)} tokens</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Claim Amount</div>
                    <div className="font-semibold">
                      {position.claimAmount ? `${formatAmount(position.claimAmount)} tokens` : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Chain</div>
                    <div className="font-semibold">Chain #{position.chainId}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Created</div>
                    <div className="font-semibold">{formatDate(position.createdAt)}</div>
                  </div>
                </div>

                {!position.claimed && position.claimAmount && (
                  <button
                    className="mt-4 w-full px-6 py-3 bg-gradient-purple rounded-lg hover:opacity-90 transition"
                    onClick={() => alert('Claim functionality coming soon')}
                  >
                    Claim Rewards
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

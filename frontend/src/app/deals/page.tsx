'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { dealsApi, type Deal } from '@/lib/api';
import { formatAmount, formatDate, getStatusColor } from '@/lib/utils';

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadDeals();
  }, [filter]);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await dealsApi.list(params);
      setDeals(response.deals || []);
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Deals</h1>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="CREATED">Created</option>
            <option value="LOCKED">Locked</option>
            <option value="ACTIVE">Active</option>
            <option value="SETTLED">Settled</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="text-gray-400">Loading deals...</div>
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">No deals found</div>
            <p className="text-sm text-gray-500">
              Deals will appear here once created by the protocol
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {deals.map((deal) => (
              <Link
                key={deal.id}
                href={`/deals/${deal.id}`}
                className="block p-6 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">Deal #{deal.id}</h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm ${getStatusColor(deal.status)}`}>
                      {deal.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-400">
                      {deal.expectedYield}% APY
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Total Deposited</div>
                    <div className="font-semibold">{formatAmount(deal.totalDeposited)} tokens</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Target Chain</div>
                    <div className="font-semibold">Chain #{deal.targetChainId}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Created</div>
                    <div className="font-semibold">{formatDate(deal.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Positions</div>
                    <div className="font-semibold">{deal.positions?.length || 0}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Header() {
  return (
    <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-bold bg-gradient-purple bg-clip-text text-transparent">
            Liquium
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link 
              href="/deals" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              Deals
            </Link>
            <Link 
              href="/positions" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              My Positions
            </Link>
          </div>
        </div>

        <ConnectButton />
      </nav>
    </header>
  );
}

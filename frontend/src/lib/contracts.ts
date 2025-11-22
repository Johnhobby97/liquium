import { Address } from 'viem';

// Contract Addresses
export const CONTRACTS = {
  dealVault: (process.env.NEXT_PUBLIC_DEAL_VAULT_ADDRESS || '0x51324081c6483E6170379289a0A3CCC161835b39') as Address,
  dealPosition: (process.env.NEXT_PUBLIC_DEAL_POSITION_ADDRESS || '0x45f61bAD7e29a6FB9ec307daD7B895e63Db1940B') as Address,
  yellowChannel: (process.env.NEXT_PUBLIC_YELLOW_CHANNEL_ADDRESS || '0x332355fcd8Ae1c4Ff9F8926Ca73CdDaF3871269c') as Address,
} as const;

// Simplified ERC20 ABI for token interactions
export const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// DealVault ABI (simplified for frontend)
export const DEAL_VAULT_ABI = [
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'positionId', type: 'uint256' }],
    name: 'claim',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'dealId', type: 'uint256' }],
    name: 'getDeal',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'depositToken', type: 'address' },
          { name: 'totalDeposited', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// DealPosition NFT ABI (simplified)
export const DEAL_POSITION_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

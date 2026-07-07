// lib/escrow-abi.js
export const ESCROW_ABI = [
  // View
  {
    "inputs": [],
    "name": "nextEscrowId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdcToken",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "escrows",
    "outputs": [
      { "internalType": "address",  "name": "payer",    "type": "address"  },
      { "internalType": "address",  "name": "payee",    "type": "address"  },
      { "internalType": "uint256",  "name": "amount",   "type": "uint256"  },
      { "internalType": "bool",     "name": "funded",   "type": "bool"     },
      { "internalType": "bool",     "name": "released", "type": "bool"     },
      { "internalType": "uint256",  "name": "deadline", "type": "uint256"  }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Write
  {
    "inputs": [
      { "internalType": "address", "name": "_payee",    "type": "address" },
      { "internalType": "uint256", "name": "_amount",   "type": "uint256" },
      { "internalType": "uint256", "name": "_deadline", "type": "uint256" }
    ],
    "name": "createEscrow",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
    "name": "fundEscrow",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
    "name": "release",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "id",     "type": "uint256" },
      { "indexed": false, "internalType": "address",  "name": "payer",  "type": "address" },
      { "indexed": false, "internalType": "address",  "name": "payee",  "type": "address" },
      { "indexed": false, "internalType": "uint256",  "name": "amount", "type": "uint256" }
    ],
    "name": "EscrowCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "id",     "type": "uint256" },
      { "indexed": false, "internalType": "uint256",  "name": "amount", "type": "uint256" }
    ],
    "name": "Funded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "id",     "type": "uint256" },
      { "indexed": false, "internalType": "address",  "name": "to",     "type": "address" },
      { "indexed": false, "internalType": "uint256",  "name": "amount", "type": "uint256" }
    ],
    "name": "Released",
    "type": "event"
  }
];

export const ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount",  "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner",   "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// /static/js/shared/config.js

// --- 1. Chain Registry ---
export const NETWORKS = {
  EVM_BASE: {
    TESTNET: { 
        chainId: '0x14a34', 
        name: 'Base Sepolia', 
        rpc: 'https://base-sepolia-rpc.publicnode.com', 
        explorer: 'https://sepolia.basescan.org' 
    },
    MAINNET: { 
        chainId: '0x2105', 
        name: 'Base Mainnet', 
        rpc: 'https://base-rpc.publicnode.com', 
        explorer: 'https://basescan.org' 
    }
  },
  EVM_ETH: {
    TESTNET: { 
        chainId: '0xaa36a7', 
        name: 'Ethereum Sepolia', 
        rpc: 'https://ethereum-sepolia-rpc.publicnode.com', 
        explorer: 'https://sepolia.etherscan.io' 
    },
    MAINNET: { 
        chainId: '0x1', 
        name: 'Ethereum Mainnet', 
        rpc: 'https://ethereum-rpc.publicnode.com', 
        explorer: 'https://etherscan.io' 
    }
  },
  SOL: {
    TESTNET: { cluster: 'devnet', rpc: 'https://api.devnet.solana.com' },
    MAINNET: { cluster: 'mainnet-beta', rpc: 'https://api.mainnet-beta.solana.com' }
  }
};

// --- 2. EVM Contract ABI ---
export const SPLITMATE_ABI = [
	{ "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
	{ "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "billId", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "name", "type": "string" }, { "indexed": true, "internalType": "address", "name": "creator", "type": "address" }, { "indexed": true, "internalType": "address", "name": "receiver", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "totalAmount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "amountOwedPerPerson", "type": "uint256" }, { "indexed": false, "internalType": "address[]", "name": "participants", "type": "address[]" } ], "name": "BillCreated", "type": "event" },
	{ "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "billId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "receiver", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "totalAmount", "type": "uint256" } ], "name": "BillFinalized", "type": "event" },
	{ "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "billId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "participant", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "Contribution", "type": "event" },
	{ "anonymous": false, "inputs": [ { "indexed": false, "internalType": "uint256", "name": "newFee", "type": "uint256" } ], "name": "FeeChanged", "type": "event" },
	{ "anonymous": false, "inputs": [ { "indexed": false, "internalType": "string", "name": "id", "type": "string" }, { "indexed": true, "internalType": "address", "name": "owner", "type": "address" } ], "name": "IDRegistered", "type": "event" },
	{ "inputs": [ { "internalType": "address", "name": "", "type": "address" } ], "name": "addressToId", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [], "name": "billCounter", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "name": "bills", "outputs": [ { "internalType": "string", "name": "name", "type": "string" }, { "internalType": "address", "name": "creator", "type": "address" }, { "internalType": "address", "name": "receiver", "type": "address" }, { "internalType": "uint256", "name": "totalAmount", "type": "uint256" }, { "internalType": "uint256", "name": "amountOwedPerPerson", "type": "uint256" }, { "internalType": "uint256", "name": "amountCollected", "type": "uint256" }, { "internalType": "bool", "name": "isFinalized", "type": "bool" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "uint256", "name": "_billId", "type": "uint256" } ], "name": "contribute", "outputs": [], "stateMutability": "payable", "type": "function" },
	{ "inputs": [ { "internalType": "string", "name": "_name", "type": "string" }, { "internalType": "address", "name": "_receiver", "type": "address" }, { "internalType": "uint256", "name": "_totalAmount", "type": "uint256" }, { "internalType": "address[]", "name": "_participants", "type": "address[]" } ], "name": "createBill", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [ { "internalType": "uint256", "name": "_billId", "type": "uint256" } ], "name": "finalize", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [ { "internalType": "string", "name": "", "type": "string" } ], "name": "idToAddress", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [], "name": "owner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "string", "name": "_id", "type": "string" } ], "name": "register", "outputs": [], "stateMutability": "payable", "type": "function" },
	{ "inputs": [], "name": "registrationFee", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "address", "name": "_user", "type": "address" } ], "name": "resolveAddress", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "string", "name": "_id", "type": "string" } ], "name": "resolveId", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
	{ "inputs": [ { "internalType": "uint256", "name": "_newFee", "type": "uint256" } ], "name": "setFee", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
	{ "inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

// --- 3. EVM Contract Address Map ---
export const SPLITMATE_ADDRESS_MAP = {
  // Base Sepolia
  "0x14a34": "0xF13462054C7670C59009E9721616C78cFE86ec4E", 
  // Ethereum Sepolia
  "0xaa36a7": "0x4Fa22b3f19257f6f0ABff7808F75B9fE2Cf4cddE", 
};

// --- 4. Solana Config ---
export const SPLITMATE_SOL_PROGRAM_ID = "33to5eJieEccLzPWWAYLiaMfHHxoNi7AX22qA9RYDt88";
export const SPLITMATE_SOL_IDL = {};
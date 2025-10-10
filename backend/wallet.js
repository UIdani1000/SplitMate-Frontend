/*
 * wallet.js
 *
 * This file handles all web3 connectivity, wallet interaction,
 * and smart contract calls for the SplitMate DApp on Starknet.
 */

// ====================================================================
// --- 0. ES MODULE IMPORTS (CRITICAL FIX) ---
// ====================================================================

// Fixes: "does not provide an export named 'Contract'" and "cairo is not defined"
import { Contract, cairo, shortString } from 'https://cdn.jsdelivr.net/npm/starknet@latest/dist/starknet.js';


// ====================================================================
// --- 1. STARKNET CONFIGURATION (MUST BE REPLACED) ---
// ====================================================================
// >>> ⚠️ IMPORTANT: REPLACE THESE WITH YOUR DEPLOYED CONTRACT DETAILS ⚠️ <<<

// Your SplitMate Smart Contract Address on Starknet
const SPLITMATE_CONTRACT_ADDRESS = "0xYOUR_SPLITMATE_CONTRACT_ADDRESS_HERE";

// Standard L2 ETH Token Contract Address (Used for fees and payment)
const ETH_ERC20_ADDRESS = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"; 
const ETH_DECIMALS = 18;

// Minimal ABI for the required functions (MUST be replaced with your full contract ABI)
const SPLITMATE_ABI = [
    // create_bill function (Bill Creator action)
    {
        type: "function",
        name: "create_bill",
        inputs: [
            { name: "bill_id", type: "felt" },
            { name: "name", type: "felt" },
            { name: "total_amount", type: "u256" },
            { name: "payer", type: "ContractAddress" },
            { name: "participants", type: "ContractAddress*" },
            { name: "shares", type: "u256*" }
        ],
        outputs: [],
        state_mutability: "external"
    },
    // settle_share function (Participant action)
    {
        type: "function",
        name: "settle_share",
        inputs: [
            { name: "bill_id", type: "felt" }
        ],
        outputs: [],
        state_mutability: "external"
    },
    // get_user_bills function (Dashboard read)
    {
        type: "function",
        name: "get_user_bills",
        inputs: [
            { name: "user_address", type: "ContractAddress" }
        ],
        outputs: [
            { name: "bills", type: "BillStruct*" } // Assuming a custom struct is returned
        ],
        state_mutability: "view"
    },
    // ERC20 approve function (Required for all token payments)
    {
        type: "function",
        name: "approve",
        inputs: [
            { name: "spender", type: "ContractAddress" },
            { name: "amount", type: "u256" }
        ],
        outputs: [
            { name: "success", type: "bool" }
        ],
        state_mutability: "external"
    }
];


// ====================================================================
// --- 2. GLOBAL STATE & UTILITIES ---
// ====================================================================

window.starknetAccount = null; // The connected wallet account (signer)
window.starknetProvider = null; // The RPC provider for reads
window.splitMateContract = null; // The Contract instance
window.userAddress = null; // The connected user's address

/** Converts float amount to Starknet's u256 structure (with 18 decimals). */
function toStarknetU256(amount, decimals = ETH_DECIMALS) {
    // 🛑 FIX: Use the imported 'cairo' object directly
    if (!cairo) {
        throw new Error("Starknet 'cairo' utilities are missing.");
    }
    // Convert float to BigInt string (18 decimals)
    const multiplier = 10n ** BigInt(decimals);
    const value = BigInt(Math.floor(amount * (Number(multiplier))))
    return cairo.uint256(value.toString());
}

/** Converts Starknet's u256 structure to a human-readable float amount. */
function fromStarknetU256(u256, decimals = ETH_DECIMALS) {
    const value = BigInt(u256.low) + (BigInt(u256.high) << 128n);
    const divisor = 10 ** decimals;
    return Number(value) / divisor;
}


// ====================================================================
// --- 3. WALLET CONNECTION LOGIC ---
// ====================================================================

// Expose connectWallet globally
window.connectWallet = async function() {
    try {
        if (!window.starknet) {
            window.showMessageBox("Wallet Required", "Please install ArgentX or Braavos.", () => {
                window.open("https://www.starknet.io/en/ecosystem/wallets", "_blank");
            });
            return false;
        }

        let enabled;
        // Check for existing connection
        if (window.starknet.isConnected) {
             enabled = window.starknet;
        } else {
            // Request connection and access to the user's account
            enabled = await window.starknet.enable({ starknetVersion: "v5" });
        }
        
        if (enabled && enabled.account) {
            window.starknetAccount = enabled.account;
            window.userAddress = window.starknetAccount.address;
            window.starknetProvider = window.starknetAccount.provider;
            
            // 🛑 FIX: Use the imported 'Contract' class directly
            window.splitMateContract = new Contract(
                SPLITMATE_ABI, 
                SPLITMATE_CONTRACT_ADDRESS, 
                window.starknetAccount 
            );

            // Update UI elements (relies on window.updateWalletUI from index.html)
            window.updateWalletUI(); 
            
            return true;
        }
    } catch (error) {
        console.error("Starknet wallet connection failed:", error);
        window.showMessageBox("Connection Error", `Failed to connect: ${error.message || "User rejected connection."}`);
    }
    return false;
}

window.disconnectWallet = function() {
    window.starknetAccount = null;
    window.userAddress = null;
    window.starknetProvider = null;
    window.splitMateContract = null;

    window.updateWalletUI(); 
    window.navigateTo('dashboard');
}

// Placeholder functions (for UI buttons that target other chains)
window.connectMetamaskWallet = function() {
    window.showMessageBox("Connect Wallet", "Metamask is for Ethereum/EVM. SplitMate uses Starknet. Please use ArgentX or Braavos.", window.connectWallet);
}
window.connectXverseWallet = function() {
    window.showMessageBox("Connect Wallet", "Xverse is for Bitcoin/Stacks. SplitMate uses Starknet. Please use ArgentX or Braavos.", window.connectWallet);
}


// ====================================================================
// --- 4. CONTRACT INTERACTION (WRITE LOGIC) ---
// ====================================================================

/**
 * Creates and pays for a bill using a two-step multi-call transaction.
 */
window.sendBillToContract = async function(formData, shares) {
    if (!window.starknetAccount) {
        throw new Error("Wallet not connected. Please connect your Starknet wallet.");
    }
    // ⚠️ TODO: IMPLEMENT MULTI-CALL
    return { transaction_hash: "0xUNIMPLEMENTED_TX_HASH" };
}


/**
 * Sends a transaction for a participant to pay their share of a bill.
 */
window.payBill = async function(billId, amountToPay) {
    if (!window.starknetAccount) {
        throw new Error("Wallet not connected. Please connect your Starknet wallet.");
    }
    // ⚠️ TODO: IMPLEMENT PAYMENT LOGIC
    return { transaction_hash: "0xUNIMPLEMENTED_TX_HASH" };
}


// ====================================================================
// --- 5. CONTRACT INTERACTION (READ LOGIC) ---
// ====================================================================

/**
 * Fetches the list of bills involving the connected user from the Starknet contract state.
 */
window.fetchUserBills = async function(userAddress) {
    if (!window.splitMateContract) {
        // Return an empty array if not connected, showing a clean dashboard
        return []; 
    }
    try {
        const result = await window.splitMateContract.get_user_bills(userAddress);
        
        return result.bills.map(rawBill => ({
            id: rawBill.bill_id, 
            // 🛑 FIX: Use the imported 'shortString' utility
            name: shortString.decodeShortString(rawBill.name),
            totalAmount: fromStarknetU256(rawBill.total_amount),
            payer: rawBill.payer,
            isSettled: rawBill.is_settled, 
            shares: rawBill.shares.map(share => ({ 
                address: share.address,
                amount: fromStarknetU256(share.amount)
            }))
        }));
    } catch (error) {
        console.error("Error fetching bills from contract. Returning empty list.", error);
        return [];
    }
}

window.fetchLeaderboard = async function() {
    // ⚠️ TODO: IMPLEMENT FETCH LEADERBOARD LOGIC
    return [
        { address: "0x05f8...1234", score: 9.8, settledRate: 0.98, totalBills: 25 },
        { address: window.userAddress || "0xUnconnectedUser", score: 9.5, settledRate: 0.95, totalBills: 12 },
        { address: "0x0a1c...5678", score: 9.0, settledRate: 0.90, totalBills: 40 },
    ];
}
/*
 * wallet.js
 *
 * This file handles all web3 connectivity, wallet interaction,
 * and smart contract calls for the SplitMate DApp on Starknet.
 */

// ====================================================================
// --- 0. ES MODULE IMPORTS (CRITICAL FIX) ---
// ====================================================================

// Import the necessary utilities directly from the Starknet library
import { Contract, cairo, shortString } from 'https://cdn.jsdelivr.net/npm/starknet@latest/dist/starknet.js';

// The getStarknet function is available via window.getStarknet (see index.html)

// ====================================================================
// --- 1. STARKNET CONFIGURATION (MUST BE REPLACED) ---
// ====================================================================
const SPLITMATE_CONTRACT_ADDRESS = "0xYOUR_SPLITMATE_CONTRACT_ADDRESS_HERE";
const ETH_ERC20_ADDRESS = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"; 
const ETH_DECIMALS = 18;
const SPLITMATE_ABI = [
    { type: "function", name: "create_bill", /* ... */ },
    { type: "function", name: "settle_share", /* ... */ },
    { type: "function", name: "get_user_bills", /* ... */ },
    { type: "function", name: "approve", /* ... */ }
];

// ====================================================================
// --- 2. GLOBAL STATE & UTILITIES ---
// ====================================================================
// Expose these global variables to the main script block
window.starknetAccount = null; 
window.starknetProvider = null; 
window.splitMateContract = null; 
window.userAddress = null; 

/** Converts float amount to Starknet's u256 structure. */
function toStarknetU256(amount, decimals = ETH_DECIMALS) {
    // Uses the imported 'cairo' object directly
    if (!cairo) {
        throw new Error("Starknet 'cairo' utilities are missing.");
    }
    const multiplier = 10n ** BigInt(decimals);
    const value = BigInt(Math.floor(amount * (Number(multiplier))));
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
        // Use the wallet object injected into window.starknet by the extension
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
            enabled = await window.starknet.enable({ starknetVersion: "v5" });
        }
        
        if (enabled && enabled.account) {
            window.starknetAccount = enabled.account;
            window.userAddress = window.starknetAccount.address;
            window.starknetProvider = window.starknetAccount.provider;
            
            // 🛑 FIX: Use the imported 'Contract' class directly (no global conflict)
            window.splitMateContract = new Contract(
                SPLITMATE_ABI, 
                SPLITMATE_CONTRACT_ADDRESS, 
                window.starknetAccount 
            );

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

window.connectMetamaskWallet = function() {
    window.showMessageBox("Connect Wallet", "Metamask is for Ethereum/EVM. SplitMate uses Starknet. Please use ArgentX or Braavos.", window.connectWallet);
}
window.connectXverseWallet = function() {
    window.showMessageBox("Connect Wallet", "Xverse is for Bitcoin/Stacks. SplitMate uses Starknet. Please use ArgentX or Braavos.", window.connectWallet);
}


// ====================================================================
// --- 4 & 5. CONTRACT INTERACTION (WRITE/READ LOGIC) ---
// ====================================================================

window.sendBillToContract = async function(formData, shares) {
    if (!window.starknetAccount) throw new Error("Wallet not connected.");
    // ⚠️ TODO: IMPLEMENT MULTI-CALL
    return { transaction_hash: "0xUNIMPLEMENTED_TX_HASH" };
}

window.payBill = async function(billId, amountToPay) {
    if (!window.starknetAccount) throw new Error("Wallet not connected.");
    // ⚠️ TODO: IMPLEMENT PAYMENT LOGIC
    return { transaction_hash: "0xUNIMPLEMENTED_TX_HASH" };
}

window.fetchUserBills = async function(userAddress) {
    if (!window.splitMateContract) return []; 
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
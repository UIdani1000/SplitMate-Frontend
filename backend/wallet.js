/*
 * wallet.js
 *
 * This file handles all web3 connectivity, wallet interaction,
 * and smart contract calls for the SplitMate DApp on Starknet.
 */

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
// Note: starknet_lib is the renamed Starknet utility library (see index.html)
window.starknetAccount = null; 
window.starknetProvider = null; 
window.splitMateContract = null; 
window.userAddress = null; 

/** Converts float amount to Starknet's u256 structure. */
function toStarknetU256(amount, decimals = ETH_DECIMALS) {
    // 🛑 FIX: Use the renamed library object 'starknet_lib'
    if (!window.starknet_lib || !window.starknet_lib.cairo) {
        throw new Error("Starknet 'cairo' utilities are missing. Is starknet.js loaded?");
    }
    const multiplier = 10n ** BigInt(decimals);
    const value = BigInt(Math.floor(amount * (Number(multiplier))));
    return window.starknet_lib.cairo.uint256(value.toString());
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

window.connectWallet = async function() {
    try {
        if (!window.starknet) {
            window.showMessageBox("Wallet Required", "Please install ArgentX or Braavos.", () => {
                window.open("https://www.starknet.io/en/ecosystem/wallets", "_blank");
            });
            return false;
        }

        let enabled;
        // Check for existing connection to avoid unnecessary pop-ups
        if (window.starknet.isConnected) {
             enabled = window.starknet;
        } else {
            enabled = await window.starknet.enable({ starknetVersion: "v5" });
        }
        
        if (enabled && enabled.account) {
            window.starknetAccount = enabled.account;
            window.userAddress = window.starknetAccount.address;
            window.starknetProvider = window.starknetAccount.provider;
            
            // 🛑 CRITICAL FIX: Use the renamed library object 'starknet_lib' for Contract constructor
            window.splitMateContract = new window.starknet_lib.Contract(
                SPLITMATE_ABI, 
                SPLITMATE_CONTRACT_ADDRESS, 
                window.starknetAccount 
            );

            window.updateWalletUI(); 
            
            return true;
        }
    } catch (error) {
        // The 'User rejected connection' error is handled here
        console.error("Starknet wallet connection failed:", error);
        window.showMessageBox("Connection Error", `Failed to connect: ${error.message || "User rejected connection."}`);
    }
    return false;
}

window.disconnectWallet = function() {
    // Note: Starknet wallets typically do not support an in-browser disconnect API,
    // so we simply clear the application's local state.
    window.starknetAccount = null;
    window.userAddress = null;
    window.starknetProvider = null;
    window.splitMateContract = null;

    window.updateWalletUI(); 
    window.navigateTo('dashboard');
}

// Placeholder functions 
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
            // 🛑 FIX: Use the renamed library object 'starknet_lib' for shortString utility
            name: window.starknet_lib.shortString.decodeShortString(rawBill.name),
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


// ====================================================================
// --- 6. INITIALIZATION ---
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Check for auto-connect ONLY after the DOM is ready
    if (window.starknet && window.starknet.isConnected) {
        window.connectWallet().catch(console.error);
    }
});
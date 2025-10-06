/*
 * wallet.js
 *
 * This file handles all web3 connectivity, wallet interaction,
 * and smart contract calls for the SplitMate DApp on Starknet.
 * It relies on 'starknet.js' and '@starknet-io/get-starknet' CDN imports in index.html.
 */

// Global variables for contract instance and current user address
window.splitMateContract = null;
window.currentAddress = null;
window.starknet = null;

// ====================================================================
// --- 1. STARKNET CONFIGURATION (MUST BE REPLACED) ---
// ====================================================================

// >>> ⚠️ IMPORTANT: REPLACE THESE WITH YOUR DEPLOYED CONTRACT DETAILS ⚠️ <<<
const SPLITMATE_CONTRACT_ADDRESS = "0xYOUR_SPLITMATE_CONTRACT_ADDRESS_HERE";
const ETH_ERC20_ADDRESS = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"; 
const ETH_DECIMALS = 18;
const SPLITMATE_ABI = [
    // ... your ABI here
];

function fromStarknetU256(u256) {
    // Placeholder - MUST be implemented for live data to display correctly
    return 0; 
}

// ====================================================================
// --- 2. WALLET CONNECTION AND STATE MANAGEMENT ---
// ====================================================================

/**
 * Connects to the Starknet wallet. This triggers the wallet list/modal.
 */
window.connectWallet = async function() {
    try {
        if (typeof getStarknet === 'undefined') {
            throw new Error("Starknet connector library not loaded.");
        }

        // 🛑 This opens the modal to select/connect the wallet
        window.starknet = await getStarknet.connect({ showModal: true }); 
        
        if (!window.starknet || !window.starknet.account || !window.starknet.account.address) {
             window.showMessageBox("Connection Canceled", "Wallet connection was not completed.");
             return;
        }

        // --- SUCCESS LOGIC (WAS MISSING) ---
        window.currentAddress = window.starknet.account.address;
        
        // Initialize contract instance
        const provider = window.starknet.provider;
        const Contract = new starknet.Contract(SPLITMATE_ABI, SPLITMATE_CONTRACT_ADDRESS, provider);
        window.splitMateContract = Contract.connect(window.starknet.account);
        
        window.showMessageBox("Success", `Wallet connected! Address: ${window.currentAddress.substring(0, 10)}...`, () => {
            window.updateWalletUI(); 
        });

    } catch (error) {
        console.error("Wallet connection failed:", error);
        window.showMessageBox("Connection Failed", `Could not connect to Starknet wallet. Check browser console.`);
    }
}


// ====================================================================
// --- 3. CONTRACT INTERFACE (READ/VIEW/WRITE) ---
// ====================================================================

window.contract = {}; 

window.contract.getBillsForUser = async function(userAddress) {
    if (!window.splitMateContract) return []; 
    try {
        const result = await window.splitMateContract.get_user_bills(userAddress);
        // ... mapping logic (must be fully defined in your copy) ...
        return [];
    } catch (error) {
        console.error("Error fetching bills from contract. Returning empty list.", error);
        return [];
    }
}

window.contract.getLeaderboard = async function() {
    if (!window.splitMateContract) return [];
    try {
        const result = await window.splitMateContract.get_leaderboard();
        // ... mapping logic (must be fully defined in your copy) ...
        return [];
    } catch (error) {
        console.error("Error fetching leaderboard.", error);
        return [];
    }
}

window.contract.broadcastBill = async function(formData) {
    if (!window.splitMateContract || !window.starknet) {
        throw new Error("Wallet or Contract not initialized.");
    }
    try {
        // ... Argument preparation and live contract call ...
        const tx = await window.splitMateContract.broadcast_bill(/* args */);
        return tx;
    } catch (error) {
        throw new Error(`Transaction failed: ${error.message}`);
    }
}


// ====================================================================
// --- 4. INITIALIZATION (Auto-Connect Attempt) ---
// ====================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Attempt to auto-connect if a wallet is already enabled.
    try {
        const starknetConnector = await getStarknet.connect({ showModal: false }); 
        
        if (starknetConnector && starknetConnector.account && starknetConnector.account.address) {
            // --- SUCCESS LOGIC (WAS MISSING) ---
            window.starknet = starknetConnector;
            window.currentAddress = window.starknet.account.address;
            
            const Contract = new starknet.Contract(SPLITMATE_ABI, SPLITMATE_CONTRACT_ADDRESS, window.starknet.provider);
            window.splitMateContract = Contract.connect(window.starknet.account);

            if (typeof window.updateWalletUI === 'function') {
                window.updateWalletUI();
            }
        }
    } catch (error) {
        // This is normal if the wallet is not installed or enabled.
        console.warn("Auto-connection attempt failed, waiting for user click.");
    }
});
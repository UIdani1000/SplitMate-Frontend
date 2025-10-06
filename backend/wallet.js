/*
 * wallet.js
 *
 * This file handles all web3 connectivity, wallet interaction,
 * and smart contract calls for the SplitMate DApp on Starknet.
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

// Minimal ABI for the required functions (MUST be replaced)
const SPLITMATE_ABI = [
    // ... your ABI here
];

// Helper to convert U256 (Starknet struct) to a standard number (must handle 18 decimals)
function fromStarknetU256(u256) {
    // This is a placeholder. Use actual Starknet conversion logic.
    return 0; 
}

// ====================================================================
// --- 2. WALLET CONNECTION (FIXED) ---
// ====================================================================

/**
 * Connects to the Starknet wallet. This function now explicitly calls
 * the connector's enable method, which triggers the wallet list/modal.
 */
window.connectWallet = async function() {
    try {
        // This connects and will trigger the modal to select the wallet
        window.starknet = await getStarknet.connect(); 
        
        if (!window.starknet) {
             window.showMessageBox("Wallet Connection", "No wallet selected or connection was rejected.");
             return;
        }

        if (window.starknet.account.address) {
            window.currentAddress = window.starknet.account.address;
            
            // Initialize contract instance with the connected provider
            const provider = window.starknet.provider;
            const Contract = new starknet.Contract(SPLITMATE_ABI, SPLITMATE_CONTRACT_ADDRESS, provider);
            
            // Use the account instance for sending transactions
            window.splitMateContract = Contract.connect(window.starknet.account);
            
            window.showMessageBox("Success", `Wallet connected! Address: ${window.currentAddress.substring(0, 10)}...`, () => {
                window.updateWalletUI(); // Update UI after successful connection
            });
        } else {
            throw new Error("Wallet connection failed: No address found.");
        }
    } catch (error) {
        console.error("Wallet connection failed:", error);
        window.showMessageBox("Connection Failed", `Could not connect to Starknet wallet: ${error.message}`);
    }
}

// ====================================================================
// --- 3. CONTRACT READ/VIEW FUNCTIONS ---
// (No changes here, relies on splitMateContract)
// ====================================================================

window.contract = {}; 

window.contract.getBillsForUser = async function(userAddress) {
    if (!window.splitMateContract) return []; 
    // ... (Your live contract call logic)
    try {
        const result = await window.splitMateContract.get_user_bills(userAddress);
        // ... (Your mapping logic)
        return [];
    } catch (error) {
        console.error("Error fetching bills from contract. Returning empty list.", error);
        return [];
    }
}

window.contract.getLeaderboard = async function() {
    if (!window.splitMateContract) return [];
    // ... (Your live contract call logic)
    try {
        const result = await window.splitMateContract.get_leaderboard();
        // ... (Your mapping logic)
        return [];
    } catch (error) {
        console.error("Error fetching leaderboard.", error);
        return [];
    }
}


// ====================================================================
// --- 4. CONTRACT WRITE/TRANSACTION FUNCTIONS ---
// (No changes here, relies on splitMateContract)
// ====================================================================

window.contract.broadcastBill = async function(formData) {
    if (!window.splitMateContract || !window.starknet) {
        throw new Error("Wallet or Contract not initialized.");
    }
    // ... (Your live transaction logic)
    try {
        // ... Argument preparation ...
        const tx = await window.splitMateContract.broadcast_bill(/* args */);
        return tx;
    } catch (error) {
        throw new Error(`Transaction failed: ${error.message}`);
    }
}


// ====================================================================
// --- 5. INITIALIZATION ---
// (Refined to use the connect() method)
// ====================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Attempt to auto-connect if a wallet is already enabled/injected by the extension
    try {
        // Use connect with modal: false to attempt auto-connection without a popup
        const starknetConnector = await getStarknet.connect({ showModal: false }); 
        
        if (starknetConnector && starknetConnector.account.address) {
            window.starknet = starknetConnector;
            window.currentAddress = window.starknet.account.address;
            
            // Initialize contract
            const Contract = new starknet.Contract(SPLITMATE_ABI, SPLITMATE_CONTRACT_ADDRESS, window.starknet.provider);
            window.splitMateContract = Contract.connect(window.starknet.account);

            // Update UI after initial connection
            if (typeof window.updateWalletUI === 'function') {
                window.updateWalletUI();
            }
        }
    } catch (error) {
        console.warn("Auto-connection attempt failed, waiting for user click:", error.message);
        // If auto-connect fails, the 'Connect Wallet' button will handle manual connection.
    }
});
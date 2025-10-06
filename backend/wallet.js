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
window.starknet = null; // The connected wallet object

// ====================================================================
// --- 1. STARKNET CONFIGURATION (MUST BE REPLACED) ---
// ====================================================================

// >>> ⚠️ IMPORTANT: REPLACE THESE WITH YOUR DEPLOYED CONTRACT DETAILS ⚠️ <<<

// Your SplitMate Smart Contract Address on Starknet
const SPLITMATE_CONTRACT_ADDRESS = "0xYOUR_SPLITMATE_CONTRACT_ADDRESS_HERE";

// Minimal ABI for the required functions (MUST be replaced with your full contract ABI)
const SPLITMATE_ABI = [
    // Include the ABIs for: get_user_bills, broadcast_bill, get_leaderboard, etc.
];

// Helper to convert U256 (Starknet struct) to a standard number (must handle 18 decimals)
function fromStarknetU256(u256) {
    // This function MUST be properly implemented using felt/BigInt conversion based on the U256 structure.
    console.warn("fromStarknetU256 is a placeholder. Implement proper U256 conversion.");
    // Placeholder return for UI to run:
    return 0; 
}

// ====================================================================
// --- 2. WALLET CONNECTION AND STATE MANAGEMENT ---
// ====================================================================

/**
 * Connects to the Starknet wallet, showing the selection modal.
 */
window.connectWallet = async function() {
    try {
        // Triggers the wallet selection modal
        window.starknet = await getStarknet.connect(); 
        
        if (!window.starknet || !window.starknet.account || !window.starknet.account.address) {
             // Connection was rejected or canceled
             window.showMessageBox("Connection Canceled", "Wallet connection was not completed.");
             return;
        }

        window.currentAddress = window.starknet.account.address;
        
        // Initialize contract instance with the connected provider
        const provider = window.starknet.provider;
        const Contract = new starknet.Contract(SPLITMATE_ABI, SPLITMATE_CONTRACT_ADDRESS, provider);
        
        // Connect the Contract to the Account instance for sending transactions
        window.splitMateContract = Contract.connect(window.starknet.account);
        
        // Listen for account changes (e.g., user switches address in the wallet)
        window.starknet.on("accountsChanged", (accounts) => {
            if (accounts.length > 0) {
                window.currentAddress = accounts[0];
            } else {
                window.currentAddress = null; // Disconnected
            }
            window.updateWalletUI();
        });
        
        window.showMessageBox("Success", `Wallet connected! Address: ${window.currentAddress.substring(0, 10)}...`, () => {
            window.updateWalletUI(); 
        });

    } catch (error) {
        console.error("Wallet connection failed:", error);
        window.showMessageBox("Connection Failed", `Could not connect to Starknet wallet: ${error.message}`);
    }
}

/**
 * Disconnects the wallet (if the wallet supports a disconnect action).
 */
window.disconnectWallet = async function() {
    if (window.starknet && window.starknet.disconnect) {
        await window.starknet.disconnect();
    }
    window.currentAddress = null;
    window.starknet = null;
    window.splitMateContract = null;
    window.updateWalletUI();
}


// ====================================================================
// --- 3. CONTRACT INTERFACE (EXPOSES FUNCTIONS TO index.html) ---
// ====================================================================

// Define the namespace expected by index.html
window.contract = {}; 

/**
 * LIVE CALL: Fetches all bills associated with the user from the smart contract.
 */
window.contract.getBillsForUser = async function(userAddress) {
    if (!window.splitMateContract) return []; 

    try {
        // 🛑 LIVE CALL: Assumes your contract has this view function
        const result = await window.splitMateContract.get_user_bills(userAddress);
        
        // ⚠️ Mapping Logic: This is the most likely place for an error due to 
        // mismatch between Cairo struct and JS object.
        const bills = result.bills.map(rawBill => ({
            id: rawBill.bill_id.toString(), 
            name: starknet.shortString.decodeShortString(rawBill.name),
            amount: fromStarknetU256(rawBill.total_amount),
            payer: rawBill.payer,
            status: rawBill.is_settled ? "Settled" : "Open", 
            // Needs logic to find the share amount specific to the userAddress
            yourShare: rawBill.shares.find(s => s.address === userAddress)?.amount ? fromStarknetU256(rawBill.shares.find(s => s.address === userAddress).amount) : 0,
        }));

        return bills;

    } catch (error) {
        console.error("Error fetching bills from contract. Returning empty list.", error);
        return [];
    }
}

/**
 * LIVE CALL: Sends a transaction to create and broadcast a new bill.
 */
window.contract.broadcastBill = async function(formData) {
    if (!window.splitMateContract || !window.starknet) {
        throw new Error("Wallet or Contract not initialized.");
    }
    
    // ⚠️ Argument Conversion: Must convert the JS formData into the exact Cairo structure.
    
    // Example argument preparation (MUST BE ADJUSTED)
    const contractArgs = {
        name: starknet.shortString.encodeShortString(formData.name),
        // Convert amount from float to U256 BigInt felt structure
        total_amount: starknet.uint256.bnToUint256(BigInt(Math.round(formData.amount * (10 ** 18)))), 
        payer_address: formData.payer,
        // The participants array needs complex mapping to the Cairo array/struct type
        participants: [], 
    };

    try {
        // 🛑 LIVE CALL: Execute the transaction
        const tx = await window.splitMateContract.broadcast_bill(contractArgs);
        
        return tx;

    } catch (error) {
        console.error("Broadcast Bill Transaction Failed:", error);
        throw new Error(`Transaction execution failed. Check console for details.`);
    }
}

/**
 * LIVE CALL: Fetches the global reputation leaderboard.
 */
window.contract.getLeaderboard = async function() {
    if (!window.splitMateContract) return [];

    try {
        // 🛑 LIVE CALL: Assumes your contract has this view function
        const result = await window.splitMateContract.get_leaderboard();

        // ⚠️ Mapping Logic: Adjust field names to match your Cairo struct
        const leaderboard = result.leaderboard.map((raw, index) => ({
            rank: index + 1,
            address: raw.user_address, 
            score: fromStarknetU256(raw.reputation_score), 
            totalBills: raw.total_bills_count.toNumber(), 
            settledRate: raw.settled_rate.toNumber() / 100 
        }));

        return leaderboard;
    } catch (error) {
        console.error("Error fetching leaderboard.", error);
        return [];
    }
}


// ====================================================================
// --- 4. INITIALIZATION (Auto-Connect Attempt) ---
// ====================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Attempt to auto-connect if a wallet is already enabled/injected.
    try {
        // Use connect with modal: false to attempt auto-connection without a popup
        const starknetConnector = await getStarknet.connect({ showModal: false }); 
        
        if (starknetConnector && starknetConnector.account && starknetConnector.account.address) {
            window.starknet = starknetConnector;
            window.currentAddress = window.starknet.account.address;
            
            // Initialize contract
            const Contract = new starknet.Contract(SPLITMATE_ABI, SPLITMATE_CONTRACT_ADDRESS, window.starknet.provider);
            window.splitMateContract = Contract.connect(window.starknet.account);

            // Set up listener for address changes
            window.starknet.on("accountsChanged", (accounts) => {
                if (accounts.length > 0) {
                    window.currentAddress = accounts[0];
                } else {
                    window.currentAddress = null;
                }
                window.updateWalletUI();
            });

            // Update UI after initial connection
            if (typeof window.updateWalletUI === 'function') {
                window.updateWalletUI();
            }
        }
    } catch (error) {
        // If auto-connect fails (e.g., wallet not installed), we wait for the user to click 'Connect Wallet'.
        console.warn("Auto-connection attempt failed:", error.message);
    }
});
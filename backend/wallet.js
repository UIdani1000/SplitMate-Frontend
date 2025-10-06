/*
 * wallet.js
 *
 * This file handles all web3 connectivity, wallet interaction,
 * and smart contract calls for the SplitMate DApp on Starknet.
 */

// Global variables for contract instance and current user address
window.splitMateContract = null;
window.userAddress = null; // Renamed from currentAddress for consistency
window.starknet = null;

// ====================================================================
// --- 1. STARKNET CONFIGURATION (MUST BE REPLACED) ---
// ====================================================================

// >>> ⚠️ IMPORTANT: REPLACE THESE WITH YOUR DEPLOYED CONTRACT DETAILS ⚠️ <<<

const SPLITMATE_CONTRACT_ADDRESS = "0xYOUR_SPLITMATE_CONTRACT_ADDRESS_HERE";
const ETH_ERC20_ADDRESS = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"; 
const ETH_DECIMALS = 18;

// Minimal ABI for the required functions (MUST be replaced with your full contract ABI)
const SPLITMATE_ABI = [
    // ... your full ABI here
];

// Helper to convert U256 (Starknet struct) to a standard number (must handle 18 decimals)
function fromStarknetU256(u256) {
    // This is a placeholder. Use actual Starknet conversion logic:
    // E.g., const low = BigInt(u256.low); const high = BigInt(u256.high); 
    // const value = (high << 128n) + low;
    // return Number(value / (10n ** BigInt(ETH_DECIMALS)));
    return 0; 
}


// ====================================================================
// --- 2. WALLET CONNECTION AND STATE MANAGEMENT ---
// ====================================================================

/**
 * Connects to the Starknet wallet. This function triggers the wallet list/modal.
 */
window.connectWallet = async function() {
    try {
        // 🛑 CRITICAL CHECK: This is what was previously failing.
        if (typeof getStarknet === 'undefined') {
            throw new Error("Starknet wallet connector library not loaded. Check Network tab for failed index.js load.");
        }

        // 🛑 This opens the modal to select/connect the wallet
        window.starknet = await getStarknet.connect({ showModal: true }); 
        
        if (!window.starknet || !window.starknet.account || !window.starknet.account.address) {
             window.showMessageBox("Connection Canceled", "Wallet connection was not completed by the user.");
             return;
        }

        // --- SUCCESS LOGIC ---
        window.userAddress = window.starknet.account.address;
        
        // Initialize contract instance
        const Contract = new starknet.Contract(SPLITMATE_ABI, SPLITMATE_CONTRACT_ADDRESS, window.starknet.provider);
        window.splitMateContract = Contract.connect(window.starknet.account);
        
        window.showMessageBox("Success", `Wallet connected! Address: ${window.userAddress.substring(0, 10)}...`, () => {
            window.updateWalletUI(); 
        });

    } catch (error) {
        console.error("Wallet connection failed:", error);
        window.showMessageBox("Connection Failed", `Could not connect to Starknet wallet. Reason: ${error.message}. Please ensure a wallet extension (Argent X/Braavos) is installed and enabled.`);
    }
}


// ====================================================================
// --- 3. CONTRACT INTERFACE (READ/VIEW/WRITE) ---
// ====================================================================

/**
 * Fetches the list of bills relevant to the user from the contract.
 */
window.fetchUserBills = async function(userAddress) {
    if (!window.splitMateContract) {
        console.warn("Contract not initialized. Cannot fetch bills for dashboard");
        return []; 
    }

    try {
        // Call the view function on the contract
        const result = await window.splitMateContract.get_user_bills(userAddress);
        
        // This mapping logic depends heavily on your Cairo BillStruct definition!
        const bills = result.bills.map(rawBill => ({
            // NOTE: You will need to adjust the field names (e.g., rawBill.id, rawBill.total)
            id: rawBill.bill_id, 
            name: window.starknet.shortString.decodeShortString(rawBill.name),
            totalAmount: fromStarknetU256(rawBill.total_amount),
            payer: rawBill.payer,
            isSettled: rawBill.is_settled, 
            shares: rawBill.shares.map(share => ({ 
                address: share.address,
                amount: fromStarknetU256(share.amount)
            }))
        }));

        return bills;

    } catch (error) {
        console.error("Error fetching bills from contract. Returning empty list.", error);
        return [];
    }
}

/**
 * Fetches the leaderboard data (reputation scores) from the contract.
 */
window.fetchLeaderboard = async function() {
    if (!window.splitMateContract) return [];
    
    try {
        const result = await window.splitMateContract.get_leaderboard();
        // NOTE: Map your contract's leaderboard struct (e.g., address, score, rate) here
        // Placeholder mapping for now:
        const leaderboard = result.leaderboard_data.map(raw => ({
            address: raw.user_address,
            score: Number(raw.reputation_score), // Convert to Number if it's a small integer
            settledRate: Number(raw.settled_rate) / 1000 // If stored as a fixed-point number
        }));

        return leaderboard;
    } catch (error) {
        console.error("Error fetching leaderboard.", error);
        return [];
    }
}

/**
 * Sends a new bill transaction to the contract.
 */
window.sendBillToContract = async function(formData, shares) {
    if (!window.splitMateContract || !window.starknet) {
        throw new Error("Wallet or Contract not initialized.");
    }
    
    try {
        const totalAmountWei = starknet.uint256.bnToUint256(BigInt(Math.round(formData.amount * (10 ** ETH_DECIMALS))));
        
        // Prepare shares array for Cairo struct (assuming a list of structs {address, amount})
        const cairoShares = shares.map(share => ({
            address: share.address,
            amount: starknet.uint256.bnToUint256(BigInt(Math.round(share.amount * (10 ** ETH_DECIMALS))))
        }));
        
        // The first argument to the Cairo function must be the number of items in the array
        const sharesArray = [cairoShares.length, ...cairoShares.flatMap(s => [s.address, s.amount.low, s.amount.high])];

        const tx = await window.splitMateContract.broadcast_bill(
            formData.payer, // Payer address
            starknet.shortString.encodeShortString(formData.name), // Bill name
            totalAmountWei, // Total amount
            sharesArray
        );
        return tx;

    } catch (error) {
        console.error("Transaction failed details:", error);
        throw new Error(`Transaction failed: ${error.message}`);
    }
}


// ====================================================================
// --- 4. INITIALIZATION ---
// ====================================================================

// Attempt to auto-connect if a wallet is already enabled/injected by the extension
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Use connect with modal: false to attempt auto-connection without a popup
        if (typeof getStarknet === 'undefined') {
             console.warn("Starknet connector library not yet loaded. Skipping auto-connect.");
             return; // Exit if the library isn't there yet.
        }
        
        const starknetConnector = await getStarknet.connect({ showModal: false }); 
        
        if (starknetConnector && starknetConnector.account && starknetConnector.account.address) {
            window.starknet = starknetConnector;
            window.userAddress = window.starknet.account.address;
            
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
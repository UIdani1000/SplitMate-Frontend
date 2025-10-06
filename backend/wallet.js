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

// Your SplitMate Smart Contract Address on Starknet
const SPLITMATE_CONTRACT_ADDRESS = "0xYOUR_SPLITMATE_CONTRACT_ADDRESS_HERE";

// Standard L2 ETH Token Contract Address (Used for fees and payment)
const ETH_ERC20_ADDRESS = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"; 
const ETH_DECIMALS = 18;

// Minimal ABI for the required functions (MUST be replaced with your full contract ABI)
const SPLITMATE_ABI = [
    // Must include the ABI for get_user_bills, broadcast_bill, and get_leaderboard
    // Example entries (replace with your actual structure):
    {"type": "function", "name": "get_user_bills", "inputs": [{"name": "user_address", "type": "felt"}], "outputs": [{"name": "bills", "type": "core::array::Array::<SplitMate::BillStruct>"}], "state_mutability": "view"},
    {"type": "function", "name": "broadcast_bill", "inputs": [/* your input structure */], "outputs": [], "state_mutability": "external"},
    {"type": "function", "name": "get_leaderboard", "inputs": [], "outputs": [{"name": "leaderboard", "type": "core::array::Array::<SplitMate::UserReputation>"}], "state_mutability": "view"}
];

// Helper to convert U256 (Starknet struct) to a standard number (must handle 18 decimals)
function fromStarknetU256(u256) {
    // This is a placeholder. Real conversion logic is complex, often using BigNumber/felt.js
    // Assuming U256 is an object like {low: felt, high: felt}
    const low = BigInt(u256.low);
    const high = BigInt(u256.high);
    const total = low + (high << BigInt(128));
    return parseFloat(total.toString()) / (10 ** ETH_DECIMALS);
}

// ====================================================================
// --- 2. WALLET CONNECTION ---
// ====================================================================

/**
 * Connects to the Starknet wallet (e.g., Argent X, Braavos).
 * This function is called when the "Connect Wallet" button is clicked.
 */
window.connectWallet = async function() {
    try {
        const connectors = await getStarknet.get-starknet({});
        const connector = connectors[0]; // Assuming user picks the first available

        if (!connector) {
            window.showMessageBox("Wallet Required", "Please install a Starknet wallet like Argent X or Braavos.");
            return;
        }

        window.starknet = await connector.enable();
        
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
// ====================================================================

/**
 * Fetches all bills associated with the user from the smart contract.
 * @param {string} userAddress - The connected Starknet address.
 * @returns {Array<Object>} The list of bills.
 */
window.contract = {}; // Namespace for contract functions

window.contract.getBillsForUser = async function(userAddress) {
    if (!window.splitMateContract) {
        console.warn("Contract not initialized. Cannot fetch bills.");
        return []; 
    }

    try {
        // 🛑 LIVE CALL: Call the view function on the contract
        const result = await window.splitMateContract.get_user_bills(userAddress);
        
        // This mapping logic depends heavily on your Cairo BillStruct definition!
        const bills = result.bills.map(rawBill => ({
            // NOTE: You will need to adjust the field names (e.g., rawBill.id, rawBill.total)
            id: rawBill.bill_id.toString(), 
            name: starknet.shortString.decodeShortString(rawBill.name),
            amount: fromStarknetU256(rawBill.total_amount),
            payer: rawBill.payer,
            status: rawBill.is_settled ? "Settled" : "Open", 
            // This field will need custom logic based on how shares are structured
            yourShare: rawBill.shares.find(s => s.address === userAddress)?.amount ? fromStarknetU256(rawBill.shares.find(s => s.address === userAddress).amount) : 0,
        }));

        return bills;

    } catch (error) {
        console.error("Error fetching bills from contract. Returning empty list.", error);
        return [];
    }
}

/**
 * Fetches the global reputation leaderboard.
 * @returns {Array<Object>} The list of users and their reputation scores.
 */
window.contract.getLeaderboard = async function() {
    if (!window.splitMateContract) return [];

    try {
        // 🛑 LIVE CALL: Call the view function on the contract
        const result = await window.splitMateContract.get_leaderboard();

        // Map the result to the expected UI format (assuming your contract returns rank/score)
        const leaderboard = result.leaderboard.map((raw, index) => ({
            rank: index + 1,
            address: raw.user_address, 
            score: fromStarknetU256(raw.reputation_score), // Assuming score is U256
            totalBills: raw.total_bills_count.toNumber(), 
            settledRate: raw.settled_rate.toNumber() / 100 // Assuming rate is an integer 0-100
        }));

        return leaderboard;
    } catch (error) {
        console.error("Error fetching leaderboard.", error);
        return [];
    }
}


// ====================================================================
// --- 4. CONTRACT WRITE/TRANSACTION FUNCTIONS ---
// ====================================================================

/**
 * Sends a transaction to create and broadcast a new bill.
 * @param {Object} formData - The structured bill data from the form.
 * @returns {Object} The transaction response.
 */
window.contract.broadcastBill = async function(formData) {
    if (!window.splitMateContract || !window.starknet) {
        throw new Error("Wallet or Contract not initialized.");
    }
    
    // ⚠️ IMPORTANT: You must implement the logic to convert the JS formData 
    // into the exact structure (felts/U256s/Arrays) expected by your Cairo contract's 'broadcast_bill' function.
    
    try {
        // Example argument preparation (MUST BE ADJUSTED)
        const contractArgs = {
            name: starknet.shortString.encodeShortString(formData.name),
            total_amount: starknet.uint256.bnToUint256(BigInt(formData.amount * (10 ** ETH_DECIMALS))),
            // ... other fields like payer, participant arrays, etc.
        };

        // 🛑 LIVE CALL: Execute the transaction
        const tx = await window.splitMateContract.broadcast_bill(contractArgs);
        
        return tx;

    } catch (error) {
        throw new Error(`Transaction failed: ${error.message}`);
    }
}


// ====================================================================
// --- 5. INITIALIZATION ---
// ====================================================================

// Attempt to auto-connect if a wallet is already enabled/injected by the extension
document.addEventListener('DOMContentLoaded', async () => {
    // Check if Starknet provider is available
    if (window.starknet) {
        try {
            // Attempt to connect immediately (will only prompt if not previously connected)
            const provider = await window.starknet.enable({ showModal: false }); 
            
            if (provider.account.address) {
                window.currentAddress = provider.account.address;
                
                // Initialize contract
                const Contract = new starknet.Contract(SPLITMATE_ABI, SPLITMATE_CONTRACT_ADDRESS, provider.provider);
                window.splitMateContract = Contract.connect(provider.account);

                // Update UI after initial connection
                if (typeof window.updateWalletUI === 'function') {
                    window.updateWalletUI();
                }
            }
        } catch (error) {
            console.warn("Auto-connection failed:", error.message);
            // If auto-connect fails, the 'Connect Wallet' button will handle manual connection.
        }
    }
});
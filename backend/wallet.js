/*
 * wallet.js
 *
 * This file handles all web3 connectivity, wallet interaction,
 * and smart contract calls for the SplitMate DApp on Starknet.
 */

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
    if (!window.cairo) {
        throw new Error("Starknet 'cairo' utilities are missing.");
    }
    // Convert float to BigInt string (18 decimals)
    const multiplier = 10n ** BigInt(decimals);
    const value = BigInt(Math.floor(amount * (Number(multiplier))))
    return window.cairo.uint256(value.toString());
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

// 🛑 RENAMED THIS FUNCTION TO MATCH THE INDEX.HTML BUTTON 🛑
window.connectWallet = async function() {
    try {
        if (!window.starknet) {
            window.showMessageBox("Wallet Required", "Please install ArgentX or Braavos.", () => {
                window.open("https://www.starknet.io/en/ecosystem/wallets", "_blank");
            });
            return false;
        }

        // Request connection and access to the user's account
        const enabled = await window.starknet.enable({ starknetVersion: "v5" });
        
        if (enabled && enabled.account) {
            window.starknetAccount = enabled.account;
            window.userAddress = window.starknetAccount.address;
            window.starknetProvider = window.starknetAccount.provider;
            
            // Initialize the Contract instance using the connected Account for signing
            window.splitMateContract = new window.starknet.Contract(
                SPLITMATE_ABI, 
                SPLITMATE_CONTRACT_ADDRESS, 
                window.starknetAccount 
            );

            // Update UI elements (assumes existing IDs)
            document.getElementById('connect-status').textContent = `Connected: ${window.userAddress.slice(0, 6)}...${window.userAddress.slice(-4)}`;
            document.getElementById('connect-button-container').classList.add('hidden');
            document.getElementById('disconnect-button-container').classList.remove('hidden');
            
            // This relies on updateWalletUI from index.html
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

    document.getElementById('connect-status').textContent = 'Disconnected';
    document.getElementById('connect-button-container').classList.remove('hidden');
    document.getElementById('disconnect-button-container').classList.add('hidden');
    
    // Redirect to the connect page
    window.loadPageContent('connect');
}

// Placeholder functions (for UI buttons that target other chains)
window.connectMetamaskWallet = function() {
    // 🛑 This is the current function in your code.
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
    // ... (logic remains the same) ...
    if (!window.starknetAccount) {
        throw new Error("Wallet not connected. Please connect your Starknet wallet.");
    }
    // ... (rest of the logic) ...
}


/**
 * Sends a transaction for a participant to pay their share of a bill.
 */
window.payBill = async function(billId, amountToPay) {
    // ... (logic remains the same) ...
    if (!window.starknetAccount) {
        throw new Error("Wallet not connected. Please connect your Starknet wallet.");
    }
    // ... (rest of the logic) ...
}


// ====================================================================
// --- 5. CONTRACT INTERACTION (READ LOGIC) ---
// ====================================================================

/**
 * Fetches the list of bills involving the connected user from the Starknet contract state.
 */
window.fetchUserBills = async function(userAddress) {
    // ... (logic remains the same) ...
    if (!window.splitMateContract) {
        // Return an empty array if not connected, showing a clean dashboard
        return []; 
    }
    // ... (rest of the logic) ...
}


// ====================================================================
// --- 6. INITIALIZATION ---
// ====================================================================

// Attempt to auto-connect if a wallet is already enabled/injected by the extension
document.addEventListener('DOMContentLoaded', () => {
    // NOTE: Checking for window.starknet ensures the library is loaded first.
    if (window.starknet && window.starknet.isConnected) {
        window.connectWallet().catch(console.error);
    }
});
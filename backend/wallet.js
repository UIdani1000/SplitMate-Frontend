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
const SPLITMATE_CONTRACT_ADDRESS = "0xYOUR_SPLITMATE_CONTRACT_ADDRESS_HERE"; // 🛑 Change this!

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

window.starknetAccount = null; // The connected Starknet wallet account (signer)
window.starknetProvider = null; // The Starknet RPC provider for reads
window.splitMateContract = null; // The Starknet Contract instance
window.userAddress = null; // The connected user's address (Starknet or EVM)
window.isStarknetWallet = false; // NEW: Flag to track wallet type
window.evmProvider = null; // NEW: Ethers.js Provider for EVM

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

/**
 * Handles connection for ArgentX or Braavos (Starknet wallets).
 */
window.connectStarknetWallet = async function() {
    try {
        if (!window.starknet) {
            window.showMessageBox("Wallet Required", "Please install ArgentX or Braavos for Starknet transactions.", () => {
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
            window.isStarknetWallet = true; // Set flag
            
            // Initialize the Contract instance using the connected Account for signing
            window.splitMateContract = new window.starknet.Contract(
                SPLITMATE_ABI, 
                SPLITMATE_CONTRACT_ADDRESS, 
                window.starknetAccount 
            );

            // This relies on updateWalletUI from index.html
            window.updateWalletUI(true); 
            
            return true;
        }
    } catch (error) {
        console.error("Starknet wallet connection failed:", error);
        window.showMessageBox("Connection Error", `Starknet connection failed: ${error.message || "User rejected connection."}`);
    }
    return false;
}

/**
 * NEW: Handles connection for Metamask (EVM wallet).
 */
window.connectEVMWallet = async function() {
    try {
        if (!window.ethereum) {
            window.showMessageBox("Metamask Required", "Please install Metamask to connect an EVM wallet.", () => {
                window.open("https://metamask.io/", "_blank");
            });
            return false;
        }

        // Use Ethers.js to connect
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        
        if (accounts.length > 0) {
            const signer = await provider.getSigner();
            
            // Clear Starknet state
            window.starknetAccount = null;
            window.splitMateContract = null;
            
            // Set EVM state
            window.userAddress = accounts[0];
            window.evmProvider = provider;
            window.isStarknetWallet = false; // Set flag
            
            // Warn user about incompatibility
            window.showMessageBox("EVM Wallet Connected", 
                                  "You are now connected with Metamask (EVM). Please note: This wallet cannot natively sign or interact with Starknet contracts for bill splitting.", 
                                  () => {
                                      window.updateWalletUI(false); // Update UI without Starknet flag
                                  });
            return true;
        }

    } catch (error) {
        console.error("EVM wallet connection failed:", error);
        window.showMessageBox("Connection Error", `Metamask connection failed: ${error.message || "User rejected connection."}`);
    }
    return false;
}

// Renamed and repurposed the original connectWallet
window.connectWallet = window.connectStarknetWallet; 

window.disconnectWallet = function() {
    // Clear all connection state
    window.starknetAccount = null;
    window.userAddress = null;
    window.starknetProvider = null;
    window.splitMateContract = null;
    window.evmProvider = null;
    window.isStarknetWallet = false;

    // Reset UI
    window.updateWalletUI(false); 

    // NOTE: Removed deprecated DOM manipulations like document.getElementById('connect-status')
    // and let window.updateWalletUI handle the UI reset.
}

// Placeholder functions for the old logic are now obsolete/removed
window.connectMetamaskWallet = window.connectEVMWallet;
window.connectXverseWallet = window.connectStarknetWallet; // Just points to the main Starknet function


// ====================================================================
// --- 4. CONTRACT INTERACTION (WRITE LOGIC) ---
// ====================================================================

/**
 * Creates and pays for a bill using a two-step multi-call transaction.
 */
window.sendBillToContract = async function(formData, shares) {
    if (!window.starknetAccount) {
        throw new Error("Starknet Wallet not connected or EVM wallet connected. Starknet transaction required.");
    }
    // ... (rest of the Starknet logic remains the same) ...
}


/**
 * Sends a transaction for a participant to pay their share of a bill.
 */
window.payBill = async function(billId, amountToPay) {
    if (!window.starknetAccount) {
        throw new Error("Starknet Wallet not connected or EVM wallet connected. Starknet transaction required.");
    }
    // ... (rest of the Starknet logic remains the same) ...
}


// ====================================================================
// --- 5. CONTRACT INTERACTION (READ LOGIC) ---
// ====================================================================

/**
 * Fetches the list of bills involving the connected user from the Starknet contract state.
 */
window.fetchUserBills = async function(userAddress) {
    if (!window.splitMateContract || !window.isStarknetWallet) {
        // Return an empty array if not connected OR if EVM wallet is connected
        return []; 
    }
    // ... (rest of the Starknet logic remains the same) ...
}


// ====================================================================
// --- 6. INITIALIZATION ---
// ====================================================================

// Attempt to auto-connect if a wallet is already enabled/injected by the extension
document.addEventListener('DOMContentLoaded', () => {
    // Attempt Starknet auto-connect
    if (window.starknet && window.starknet.isConnected) {
        window.connectStarknetWallet().catch(console.error);
    }
    // You could optionally add Metamask auto-connect here, but it's often best to wait for user interaction.
});
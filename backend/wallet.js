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

// Note: The global starknet object containing Coda/cairo utilities is available as 'starknet'
window.starknetAccount = null; 
window.starknetProvider = null; 
window.splitMateContract = null; 
window.userAddress = null; 

/** Converts float amount to Starknet's u256 structure (with 18 decimals). */
function toStarknetU256(amount, decimals = ETH_DECIMALS) {
    // 🛑 BUG FIX: 'cairo' utilities are typically found directly on the global starknet object.
    if (!starknet || !starknet.cairo) {
        throw new Error("Starknet 'cairo' utilities are missing. Is starknet.js loaded?");
    }
    const multiplier = 10n ** BigInt(decimals);
    const value = BigInt(Math.floor(amount * (Number(multiplier))))
    return starknet.cairo.uint256(value.toString());
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
        
        // 1. If the wallet is already "connected" (enabled), use the existing session object.
        if (window.starknet.isConnected) {
             enabled = window.starknet;
        } else {
            // 2. Request connection. This triggers the popup for new/disconnected wallets.
            enabled = await window.starknet.enable({ starknetVersion: "v5" });
        }
        
        if (enabled && enabled.account) {
            window.starknetAccount = enabled.account;
            window.userAddress = window.starknetAccount.address;
            window.starknetProvider = window.starknetAccount.provider;
            
            // 🛑 CRITICAL FIX: Use the global 'starknet' object (the library) for the Contract constructor, 
            // not the injected wallet object (window.starknet) which does not expose the Contract class.
            window.splitMateContract = new starknet.Contract(
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
// --- 4. CONTRACT INTERACTION (WRITE LOGIC) ---
// ====================================================================

/**
 * Creates and pays for a bill using a two-step multi-call transaction.
 */
window.sendBillToContract = async function(formData, shares) {
    if (!window.starknetAccount) {
        throw new Error("Wallet not connected. Please connect your Starknet wallet.");
    }
    
    // ⚠️ TODO: IMPLEMENT MULTI-CALL (APPROVE + CREATE_BILL)
    // 1. Convert float amounts to u256 using toStarknetU256()
    // 2. Build the multicall array: [approve_call, create_bill_call]
    // 3. Send transaction: starknetAccount.execute(multicall_array);
    
    // Placeholder return until implemented
    return { transaction_hash: "0xUNIMPLEMENTED_TX_HASH" };
}


/**
 * Sends a transaction for a participant to pay their share of a bill.
 */
window.payBill = async function(billId, amountToPay) {
    if (!window.starknetAccount) {
        throw new Error("Wallet not connected. Please connect your Starknet wallet.");
    }
    
    // ⚠️ TODO: IMPLEMENT PAYMENT LOGIC (APPROVE + SETTLE_SHARE)
    // 1. Build multicall: [approve_call, settle_share_call]
    // 2. Send transaction: starknetAccount.execute(multicall_array);
    
    // Placeholder return until implemented
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
        return []; 
    }
    
    try {
        // Call the view function on the contract
        const result = await window.splitMateContract.get_user_bills(userAddress);
        
        // This mapping logic depends heavily on your Cairo BillStruct definition!
        const bills = result.bills.map(rawBill => ({
            id: rawBill.bill_id, 
            // 🛑 BUG FIX: shortString utility is on the global starknet object, not the wallet object.
            name: starknet.shortString.decodeShortString(rawBill.name),
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
 * Fetches the reputation leaderboard.
 */
window.fetchLeaderboard = async function() {
    // ⚠️ TODO: IMPLEMENT FETCH LEADERBOARD LOGIC
    // This will likely be a read-only call to a contract function like 'get_leaderboard()'
    
    // Mock data for immediate testing
    return [
        { address: "0x05f8...1234", score: 9.8, settledRate: 0.98, totalBills: 25 },
        { address: window.userAddress || "0xUnconnectedUser", score: 9.5, settledRate: 0.95, totalBills: 12 },
        { address: "0x0a1c...5678", score: 9.0, settledRate: 0.90, totalBills: 40 },
    ];
}


// ====================================================================
// --- 6. INITIALIZATION ---
// ====================================================================

// Attempt to auto-connect if a wallet is already enabled/injected by the extension
document.addEventListener('DOMContentLoaded', () => {
    // Note: window.starknet is the wallet object injected by the extension
    if (window.starknet && window.starknet.isConnected) {
        window.connectWallet().catch(console.error);
    }
});
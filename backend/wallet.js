<script src="https://cdn.jsdelivr.net/npm/starknet@latest/dist/starknet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@starknet-io/get-starknet@latest/dist/index.js"></script>
<script src="wallet.js"></script> ```

***

## `wallet.js` (Upgraded)

```javascript
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

window.connectStarknetWallet = async function() {
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
            
            // Reload the DApp content
            window.loadPageContent(window.location.hash.substring(1) || 'dashboard');
            
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
    window.showMessageBox("Connect Wallet", "Metamask is for Ethereum/EVM. SplitMate uses Starknet. Please use ArgentX or Braavos.", window.connectStarknetWallet);
}
window.connectXverseWallet = function() {
    window.showMessageBox("Connect Wallet", "Xverse is for Bitcoin/Stacks. SplitMate uses Starknet. Please use ArgentX or Braavos.", window.connectStarknetWallet);
}


// ====================================================================
// --- 4. CONTRACT INTERACTION (WRITE LOGIC) ---
// ====================================================================

/**
 * Creates and pays for a bill using a two-step multi-call transaction.
 * 1. Approve the SplitMate contract to spend the total bill amount.
 * 2. Call the create_bill function.
 * @param {object} formData - Bill details (name, totalAmount, etc.).
 * @param {object[]} shares - The calculated shares for all participants (including creator).
 */
window.sendBillToContract = async function(formData, shares) {
    if (!window.starknetAccount) {
        throw new Error("Wallet not connected. Please connect your Starknet wallet.");
    }

    const totalAmountU256 = toStarknetU256(formData.totalAmount);
    
    // Create a client-side bill ID (or fetch from contract if deploy logic is different)
    const billId = `0x${(Date.now() + Math.random()).toString(16)}`;

    // Prepare arguments for the contract
    const participantAddresses = shares.map(s => s.address);
    const participantShares = shares.map(s => toStarknetU256(s.amount));
    
    // Build the Multi-Call Transaction Array
    const calls = [
        // CALL 1: APPROVE the SplitMate Contract to spend the TOTAL ETH amount
        {
            contractAddress: ETH_ERC20_ADDRESS,
            entrypoint: 'approve',
            calldata: window.starknet.CallData.compile({
                spender: SPLITMATE_CONTRACT_ADDRESS,
                amount: totalAmountU256,
            })
        },
        // CALL 2: CREATE_BILL on the SplitMate Contract
        {
            contractAddress: SPLITMATE_CONTRACT_ADDRESS,
            entrypoint: 'create_bill',
            calldata: window.starknet.CallData.compile({
                bill_id: billId,
                name: window.starknet.shortString.splitLongString(formData.name)[0], 
                total_amount: totalAmountU256,
                payer: window.userAddress, 
                participants: participantAddresses,
                shares: participantShares,
            })
        }
    ];

    // Execute the Multi-Call (This opens the wallet for the user to approve)
    const { transaction_hash } = await window.starknetAccount.execute(calls);

    // Wait for confirmation before signaling success to the user
    await window.starknetProvider.waitForTransaction(transaction_hash, {
        retryInterval: 5000,
        successStates: ["ACCEPTED_ON_L1", "ACCEPTED_ON_L2"]
    });

    return { billId, transaction_hash };
}


/**
 * Sends a transaction for a participant to pay their share of a bill.
 * 1. Approve the SplitMate contract to spend the share amount.
 * 2. Call the settle_share function.
 * @param {string} billId - The ID of the bill to settle.
 * @param {number} amountToPay - The ETH amount of the participant's share.
 */
window.payBill = async function(billId, amountToPay) {
    if (!window.starknetAccount) {
        throw new Error("Wallet not connected. Please connect your Starknet wallet.");
    }
    
    const amountU256 = toStarknetU256(amountToPay);

    // Build the Multi-Call Transaction Array
    const calls = [
        // CALL 1: APPROVE the SplitMate Contract to spend the SHARE amount
        {
            contractAddress: ETH_ERC20_ADDRESS,
            entrypoint: 'approve',
            calldata: window.starknet.CallData.compile({
                spender: SPLITMATE_CONTRACT_ADDRESS,
                amount: amountU256,
            })
        },
        // CALL 2: SETTLE_SHARE on the SplitMate Contract
        {
            contractAddress: SPLITMATE_CONTRACT_ADDRESS,
            entrypoint: 'settle_share',
            calldata: window.starknet.CallData.compile({
                bill_id: billId,
            })
        }
    ];
    
    // Execute the Multi-Call (Opens the wallet for transaction approval/debit)
    const { transaction_hash } = await window.starknetAccount.execute(calls);

    await window.starknetProvider.waitForTransaction(transaction_hash, {
        retryInterval: 5000,
        successStates: ["ACCEPTED_ON_L1", "ACCEPTED_ON_L2"]
    });
    
    window.showMessageBox("Success!", `Bill settled on Starknet. Hash: ${transaction_hash.slice(0, 10)}...`, () => {
        window.loadPageContent('dashboard'); 
    });
    
    return transaction_hash;
}


// ====================================================================
// --- 5. CONTRACT INTERACTION (READ LOGIC) ---
// ====================================================================

/**
 * Fetches the list of bills involving the connected user from the Starknet contract state.
 * @param {string} userAddress - The address of the connected user.
 * @returns {Promise<object[]>} - An array of bill objects.
 */
window.fetchUserBills = async function(userAddress) {
    if (!window.splitMateContract) {
        // Return an empty array if not connected, showing a clean dashboard
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


// ====================================================================
// --- 6. INITIALIZATION ---
// ====================================================================

// Attempt to auto-connect if a wallet is already enabled/injected by the extension
document.addEventListener('DOMContentLoaded', () => {
    if (window.starknet && window.starknet.isConnected) {
        window.connectStarknetWallet().catch(console.error);
    }
});
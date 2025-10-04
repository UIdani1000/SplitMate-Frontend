// /static/js/wallet.js

// --- Globals & Persistence ---
let userAddress = sessionStorage.getItem('userAddress'); 
let walletType = sessionStorage.getItem('walletType'); 

// Expose as window properties for the rest of the app to read
window.userAddress = userAddress;
window.walletType = walletType;

// Chain IDs
const SEPOLIA_CHAIN_ID_HEX = "0x534e5f5345504f4c4941"; // Starknet Sepolia
const ETH_SEPOLIA_CHAIN_ID_HEX = "0xaa36a7"; // Ethereum Sepolia (11155111)

// --- Utility Functions (Keep) ---

/**
 * Formats a long address to a short version (0x...xxxx).
 */
function formatAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Updates the header greeting and calls the page-specific content loader.
 * This is the function that calls window.loadPageContent.
 */
function updateConnectionState(address, type) {
    if (address) {
        sessionStorage.setItem('userAddress', address);
        sessionStorage.setItem('walletType', type);
        window.userAddress = address;
        window.walletType = type;
        
        // This function must be defined in the calling page (e.g., index.html)
        if (typeof window.loadPageContent === 'function') {
            window.loadPageContent(address);
        }
    } else {
        sessionStorage.removeItem('userAddress');
        sessionStorage.removeItem('walletType');
        window.userAddress = null;
        window.walletType = null;

        if (typeof window.loadPageContent === 'function') {
            window.loadPageContent(null);
        }
    }
}

/**
 * Universal Message Box Helper
 */
function showMessageBox(title, content) {
    document.getElementById('message-title').textContent = title;
    document.getElementById('message-content').textContent = content;
    document.getElementById('message-box').classList.remove('hidden');
    document.getElementById('message-box').classList.add('flex');
}
window.showMessageBox = showMessageBox; // Expose globally

function closeMessageBox() {
    document.getElementById('message-box').classList.add('hidden');
    document.getElementById('message-box').classList.remove('flex');
}
window.closeMessageBox = closeMessageBox; // Expose globally

/**
 * Centralized Disconnect Logic
 */
function disconnectWallet() {
    console.log("Wallet disconnected.");
    // Clear the session cache and update UI state
    updateConnectionState(null, null);
}
window.disconnectWallet = disconnectWallet; // Expose globally


// --- WALLET CONNECTION LOGIC (LIVE) ---

async function connectMetamaskWallet() {
    if (typeof window.closeConnectModal === 'function') {
        window.closeConnectModal();
    }
    
    if (!window.ethereum) {
        showMessageBox("Wallet Not Found", "Please install MetaMask or a compatible EVM wallet to connect.");
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        let chainId = await window.ethereum.request({ method: 'eth_chainId' });

        // Check and switch to Sepolia
        if (chainId !== ETH_SEPOLIA_CHAIN_ID_HEX) { 
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: ETH_SEPOLIA_CHAIN_ID_HEX }],
                });
                chainId = await window.ethereum.request({ method: 'eth_chainId' });
            } catch (switchError) {
                // Handle switch rejection
                if (switchError.code === 4001) {
                    showMessageBox("Connection Rejected", "You rejected the network switch. Please select Sepolia manually in MetaMask.");
                } else {
                    showMessageBox("Network Error", `Failed to switch network: ${switchError.message}`);
                }
                return; 
            }
        }
        
        // Final check and update UI if we are on Sepolia
        if (chainId === ETH_SEPOLIA_CHAIN_ID_HEX) {
            updateConnectionState(address, 'MetaMask');
            showMessageBox("Connected!", `Successfully connected to MetaMask on Sepolia! Address: ${formatAddress(address)}`);
        } else {
            showMessageBox("Network Mismatch", "Connection successful, but you are still on the wrong network. Please switch to Sepolia manually.");
        }

    } catch (error) {
        if (error.code === 4001) {
            showMessageBox("Connection Rejected", "You rejected the initial wallet connection request.");
        } else {
            console.error("MetaMask connection error:", error);
            showMessageBox("Error", `An error occurred during connection: ${error.message.substring(0, 100)}...`);
        }
    }
}
window.connectMetamaskWallet = connectMetamaskWallet;


async function connectStarknetWallet() {
    if (typeof window.closeConnectModal === 'function') {
        window.closeConnectModal();
    }
    
    if (typeof window.starknet === 'undefined') {
        showMessageBox("Wallet Not Found", "Please install an extension like ArgentX or Braavos.");
        return;
    }
    
    try {
        const starknet = await window.starknet.enable({
            suggestedChainId: window.starknet.constants.StarknetChainId.SN_SEPOLIA 
        });

        if (starknet && starknet.selectedAddress) {
            const address = starknet.selectedAddress;
            
            if (starknet.chainId !== SEPOLIA_CHAIN_ID_HEX) {
                showMessageBox("Wrong Network", "Please ensure your Starknet wallet is on the **Sepolia Testnet**.");
            }
            
            // Set up event listener for Starknet (accounts/network change)
            starknet.accountsChangedHandler = (newAccounts) => {
                if (newAccounts.length > 0) {
                    updateConnectionState(newAccounts[0], 'Starknet');
                    window.showMessageBox("Account Changed", `Starknet account switched to ${formatAddress(newAccounts[0])}`);
                } else {
                    disconnectWallet();
                }
            };
            starknet.on("accountsChanged", starknet.accountsChangedHandler);
            
            updateConnectionState(address, 'Starknet');
            showMessageBox("Success (Sepolia)", `Starknet Wallet Connected! Address: ${formatAddress(address)}. Now running on Sepolia Testnet.`);
        } else {
            showMessageBox("Connection Rejected", "The wallet connection request was rejected.");
        }

    } catch (error) {
        console.error("Starknet Wallet Connection Error:", error);
        showMessageBox("Connection Failed", `Error connecting Starknet wallet: ${error.message || 'Check console.'}`);
    }
}
window.connectStarknetWallet = connectStarknetWallet;


async function connectXverseWallet() {
    if (typeof window.closeConnectModal === 'function') {
        window.closeConnectModal();
    }
    showMessageBox(
        "Xverse Connection Pending", 
        "Integrating a live Xverse connection requires a specific library and API calls (e.g., Stacks Connect). This function is currently a placeholder until the library is added."
    );
}
window.connectXverseWallet = connectXverseWallet;


// --- Initialization (FIXED: The closure was missing) ---
// Ensures the page attempts to load content if a wallet address is already in sessionStorage
document.addEventListener('DOMContentLoaded', () => {
    if (window.userAddress) {
        // loadPageContent will be called if it exists on the page
        if (typeof window.loadPageContent === 'function') {
            window.loadPageContent(window.userAddress);
        }
    }
});
// --- FILE: wallet.js ---
// This file contains all the core logic for connecting, disconnecting, and managing
// wallet state for both EVM (MetaMask) and Starknet (ArgentX/Braavos).
// Global State Variables (accessible by index.html)
window.userAddress = null;
window.walletType = null; // 'EVM', 'Starknet', or 'Xverse' (for display)
// Starknet connection setup (assuming starknet.js is loaded with type="module" in index.html)
// The 'get-starknet' library is the preferred way to handle ArgentX and Braavos.
// We need a helper function to import 'get-starknet' dynamically since it's a module
// and we are working in a single HTML/JS environment.
// --- UTILITY FUNCTIONS ---

/**
 * Custom alert/message box to replace the blocked window.alert/confirm.
 * This function is exposed globally for use in index.html (e.g., in settleBill).
 */
window.showMessageBox = (title, content) => {
    const modal = document.getElementById('message-box');
    document.getElementById('message-title').textContent = title;
    document.getElementById('message-content').innerHTML = content;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.classList.add('open');
};

window.closeMessageBox = () => {
    const modal = document.getElementById('message-box');
    modal.classList.remove('open');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
};

/**
 * Shortens an Ethereum or Starknet address for display.
 * Exposed globally for use in index.html.
 * @param {string} address - The full wallet address.
 * @returns {string} The shortened address string.
 */
window.formatAddress = (address) => {
    if (!address) return "No Address";
    if (address.length < 10) return address; // Handles short IDs if necessary
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// --- CORE WALLET CONNECTION LOGIC ---

/**
 * 1. EVM Connection (MetaMask)
 */
window.connectMetamaskWallet = async () => {
    closeConnectModal();
    if (typeof window.ethereum === 'undefined') {
        window.showMessageBox("Wallet Error", "MetaMask is not installed. Please install it to connect.");
        return;
    }

    try {
        window.showMessageBox("Connecting...", "Awaiting connection confirmation in MetaMask.");
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (accounts.length > 0) {
            window.userAddress = accounts[0];
            window.walletType = 'EVM';
            window.loadPageContent(window.userAddress);
            window.closeMessageBox(); // Close loading message
        } else {
            window.showMessageBox("Connection Rejected", "Please approve the connection in MetaMask.");
        }

        // Add event listener to handle account changes
        window.ethereum.on('accountsChanged', (newAccounts) => {
            if (newAccounts.length > 0) {
                window.userAddress = newAccounts[0];
            } else {
                window.userAddress = null; // Disconnected
            }
            window.loadPageContent(window.userAddress);
        });

    } catch (error) {
        console.error("MetaMask connection failed:", error);
        window.showMessageBox("Connection Failed", `Error connecting to MetaMask: ${error.message || error}`);
    }
};

/**
 * 2. Starknet Connection (ArgentX / Braavos)
 */
window.connectStarknetWallet = async () => {
    closeConnectModal();
    window.showMessageBox("Connecting...", "Awaiting connection confirmation for Starknet wallet (ArgentX/Braavos).");

    // FIX: Use the standard way to check for the injected wallet extension, 
    // which should be globally available if the user has a Starknet wallet installed.
    // The "get-starknet" library we loaded automatically injects the active wallet's object here.
    const injectedWallet = window.starknet;

    const injectedWallet = window.starknet || (window.starknet_argentX && window.starknet_braavos); 

if (!injectedWallet || !injectedWallet.connect) {
    // If we can't find a connect function, show the error
    window.showMessageBox("Wallet Error", "Starknet wallet extension (ArgentX or Braavos) not detected or is incompatible. Please ensure a wallet is installed.");
    return;
}

    try {
        // Use the connect method from the injected wallet object
        const connectedWallet = await injectedWallet.connect({
            modalMode: 'alwaysAsk', 
            suggested: ['argentX', 'braavos'] 
        });

        if (connectedWallet) {
            await connectedWallet.enable({ showModal: false });
            window.userAddress = connectedWallet.account.address;
            window.walletType = 'Starknet';
            window.loadPageContent(window.userAddress);
            window.closeMessageBox(); 
        } else {
            window.showMessageBox("Connection Cancelled", "Starknet wallet connection was cancelled by the user.");
        }

    } catch (error) {
        console.error("Starknet connection failed:", error);
        window.showMessageBox("Connection Failed", `Error connecting to Starknet wallet: ${error.message || error.reason || 'Unknown error'}`);
    }
};


/**
 * 3. Xverse Connection (Placeholder)
 * NOTE: Implement Xverse connection logic here when ready.
 */
window.connectXverseWallet = () => {
    closeConnectModal();
    window.showMessageBox(
        "Xverse Wallet",
        "Xverse (Bitcoin) connection logic has not been implemented yet. Please use EVM or Starknet."
    );
};


/**
 * Disconnects the current wallet session.
 * Exposed globally for use by the Disconnect button.
 */
window.disconnectWallet = async () => {
    // FIX: Change this line to use the global object
    const starknet = window.starknet; 
    
    if (starknet && starknet.isConnected) {
        try {
            // Starknet disconnect logic
            await starknet.disconnect();
        } catch (e) {
            console.warn("Starknet disconnect failed, continuing cleanup:", e);
        }
    }
    // Universal cleanup
    window.userAddress = null;
    window.walletType = null;
    window.loadPageContent(null);
    window.showMessageBox("Disconnected", "Your wallet has been successfully disconnected.");
};

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
    // Attempt to reconnect previously enabled Starknet wallet on page load
    // FIX: Check for the injected wallet object
    const injectedWallet = window.starknet; 

    if (injectedWallet && injectedWallet.isConnected) {
        try {
            await injectedWallet.enable({ showModal: false });
            window.userAddress = injectedWallet.account.address;
            window.walletType = 'Starknet';
        } catch (e) {
            console.log("Starknet auto-reconnect failed:", e);
            window.userAddress = null;
        }
    }

    // Call the page content loader
    window.loadPageContent(window.userAddress);
});

// Expose these methods globally in case they need to be called by index.html (though usually only window.loadPageContent is called by external scripts)
window.showMessageBox = window.showMessageBox;
window.closeMessageBox = window.closeMessageBox;
window.connectMetamaskWallet = window.connectMetamaskWallet;
window.connectStarknetWallet = window.connectStarknetWallet;
window.connectXverseWallet = window.connectXverseWallet;
window.disconnectWallet = window.disconnectWallet;
window.formatAddress = window.formatAddress;

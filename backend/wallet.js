// --- FILE: wallet.js ---
// This file contains all the core logic for connecting, disconnecting, and managing
// wallet state for both EVM (MetaMask), Starknet, and Xverse.

// Global State Variables (accessible by index.html)
window.userAddress = null;
window.walletType = null; // 'EVM', 'Starknet', or 'Xverse' (for display)

// --- UTILITY FUNCTIONS ---

/**
 * Custom alert/message box
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
 * Shortens an address for display.
 */
window.formatAddress = (address) => {
    if (!address) return "No Address";
    if (address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// --- CORE WALLET CONNECTION LOGIC ---

/**
 * 1. EVM Connection (MetaMask) - Working
 */
window.connectMetamaskWallet = async () => {
    closeConnectModal();
    if (typeof window.ethereum === 'undefined') {
        window.showMessageBox("Wallet Error", "MetaMask is not installed. Please install it to connect.");
        return;
    }
    // ... (rest of Metamask logic is correct)
    try {
        window.showMessageBox("Connecting...", "Awaiting connection confirmation in MetaMask.");
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (accounts.length > 0) {
            window.userAddress = accounts[0];
            window.walletType = 'EVM';
            window.loadPageContent(window.userAddress);
            window.closeMessageBox();
        } else {
            window.showMessageBox("Connection Rejected", "Please approve the connection in MetaMask.");
        }

        window.ethereum.on('accountsChanged', (newAccounts) => {
            if (newAccounts.length > 0) {
                window.userAddress = newAccounts[0];
            } else {
                window.userAddress = null;
            }
            window.loadPageContent(window.userAddress);
        });

    } catch (error) {
        console.error("MetaMask connection failed:", error);
        window.showMessageBox("Connection Failed", `Error connecting to MetaMask: ${error.message || error}`);
    }
};

/**
 * 2. Starknet Connection (ArgentX / Braavos) - FIX APPLIED
 */
window.connectStarknetWallet = async () => {
    closeConnectModal();
    window.showMessageBox("Connecting...", "Awaiting connection confirmation for Starknet wallet (ArgentX/Braavos).");

    // FIX: Rely ONLY on the object proven to be injected in the console
    const injectedWallet = window.starknet;

    if (!injectedWallet || !injectedWallet.connect) {
        window.showMessageBox("Wallet Error", "Starknet wallet extension not detected or is incompatible. Please ensure a wallet is installed, enabled, and allowed for this site. Check browser console for confirmation (window.starknet).");
        return;
    }

    try {
        // Use the connect method from the injected wallet object
        // NOTE: The absence of 'suggested' might force the use of the only detected wallet (Ready Wallet)
        const connectedWallet = await injectedWallet.connect({
            modalMode: 'alwaysAsk'
        });

        if (connectedWallet) {
            // Using enable is necessary to initialize the full wallet API context
            await connectedWallet.enable({ showModal: false });
            window.userAddress = connectedWallet.account.address;
            window.walletType = connectedWallet.id; // Use the wallet ID (e.g., 'argentX')
            window.loadPageContent(window.userAddress);
            window.closeMessageBox();
        } else {
            window.showMessageBox("Connection Cancelled", "Starknet wallet connection was cancelled by the user.");
        }

    } catch (error) {
        console.error("Starknet connection failed:", error);
        window.showMessageBox("Connection Failed", `Error connecting to Starknet wallet: ${error.message || error.reason || 'Unknown error'}. Did you approve the request?`);
    }
};


/**
 * 3. Xverse Connection (Bitcoin/Sponsor) - CONFIRMED PERMISSIONS ISSUE
 */
window.connectXverseWallet = async () => {
    closeConnectModal();
    
    if (typeof window.xverse === 'undefined') {
        window.showMessageBox("Wallet Error", 
            "Xverse Wallet is not detected. This is likely a **browser extension permission issue**. Please check your Xverse extension settings and ensure it is allowed to run on this specific Vercel URL."
        );
        return;
    }

    const XVERSE_APP_NAME = 'SplitMate DApp';
    const XVERSE_ALLOWED_METHODS = ['getAddresses', 'signMessage']; 

    try {
        window.showMessageBox("Connecting...", "Awaiting connection confirmation in Xverse Wallet.");
        
        const response = await window.xverse.request({
            method: 'requestAccounts',
            params: [{
                appDetails: { name: XVERSE_APP_NAME },
                methods: XVERSE_ALLOWED_METHODS,
            }]
        });

        const addresses = response.result.addresses;
        if (addresses && addresses.length > 0) {
            window.userAddress = addresses[0].address;
            window.walletType = 'Xverse';
            window.loadPageContent(window.userAddress);
            window.closeMessageBox();
        } else {
            window.showMessageBox("Connection Rejected", "No address returned from Xverse Wallet.");
        }

    } catch (error) {
        console.error("Xverse connection failed:", error);
        window.showMessageBox("Connection Failed", `Error connecting to Xverse Wallet: ${error.message || error}`);
    }
};


/**
 * Disconnects the current wallet session.
 */
window.disconnectWallet = async () => {
    const starknet = window.starknet;
    
    // Attempt to disconnect Starknet gracefully
    if (starknet && starknet.isConnected) {
        try {
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
    const injectedWallet = window.starknet; // Use simple detection

    if (injectedWallet && injectedWallet.isConnected) {
        try {
            await injectedWallet.enable({ showModal: false });
            window.userAddress = injectedWallet.account.address;
            window.walletType = injectedWallet.id; // Get the specific wallet ID
        } catch (e) {
            console.log("Starknet auto-reconnect failed:", e);
            window.userAddress = null;
        }
    }

    // Call the page content loader
    window.loadPageContent(window.userAddress);
});

// Expose these methods globally
window.showMessageBox = window.showMessageBox;
window.closeMessageBox = window.closeMessageBox;
window.connectMetamaskWallet = window.connectMetamaskWallet;
window.connectStarknetWallet = window.connectStarknetWallet;
window.connectXverseWallet = window.connectXverseWallet;
window.disconnectWallet = window.disconnectWallet;
window.formatAddress = window.formatAddress;
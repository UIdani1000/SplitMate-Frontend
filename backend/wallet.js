// --- FILE: wallet.js ---
// This file contains all the core logic for connecting, disconnecting, and managing
// wallet state with added persistence via localStorage.

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
 * 1. EVM Connection (MetaMask) - WITH PERSISTENCE
 */
window.connectMetamaskWallet = async () => {
    closeConnectModal();
    if (typeof window.ethereum === 'undefined') {
        window.showMessageBox("Wallet Error", "MetaMask is not installed. Please install it to connect.");
        return;
    }

    try {
        window.showMessageBox("Connecting...", "Awaiting connection confirmation in MetaMask.");
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (accounts.length > 0) {
            window.userAddress = accounts[0];
            window.walletType = 'EVM';
            
            // **PERSISTENCE: Save state to localStorage**
            localStorage.setItem('splitmate_address', window.userAddress);
            localStorage.setItem('splitmate_walletType', window.walletType);

            window.loadPageContent(window.userAddress);
            window.closeMessageBox();
        } else {
            window.showMessageBox("Connection Rejected", "Please approve the connection in MetaMask.");
        }

        // Add event listener to handle account changes
        window.ethereum.on('accountsChanged', (newAccounts) => {
            if (newAccounts.length > 0) {
                window.userAddress = newAccounts[0];
                localStorage.setItem('splitmate_address', window.userAddress); // Update persistence
            } else {
                window.disconnectWallet(); // Disconnect if accounts array is empty
            }
            window.loadPageContent(window.userAddress);
        });

    } catch (error) {
        console.error("MetaMask connection failed:", error);
        window.showMessageBox("Connection Failed", `Error connecting to MetaMask: ${error.message || error}`);
    }
};

/**
 * 2. Starknet Connection (ArgentX / Braavos) - SIMPLIFIED DETECTION
 */
window.connectStarknetWallet = async () => {
    closeConnectModal();
    window.showMessageBox("Connecting...", "Awaiting connection confirmation for Starknet wallet (ArgentX/Braavos).");

    // FIX: Rely ONLY on the object proven to be injected in the console
    const injectedWallet = window.starknet;

    if (!injectedWallet || !injectedWallet.connect) {
        window.showMessageBox("Wallet Error", "Starknet wallet extension not detected or is incompatible. Please ensure a wallet is installed, enabled, and allowed for this site.");
        return;
    }

    try {
        const connectedWallet = await injectedWallet.connect({
            modalMode: 'alwaysAsk'
        });

        if (connectedWallet) {
            await connectedWallet.enable({ showModal: false });
            window.userAddress = connectedWallet.account.address;
            window.walletType = connectedWallet.id; 
            
            // **PERSISTENCE: Save state to localStorage**
            localStorage.setItem('splitmate_address', window.userAddress);
            localStorage.setItem('splitmate_walletType', window.walletType);
            
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
 * 3. Xverse Connection (Temporarily Disabled)
 */
window.connectXverseWallet = () => {
    closeConnectModal();
    window.showMessageBox(
        "Bitcoin Utility Available",
        "Wallet connection is temporarily disabled due to browser extension compatibility issues on this domain. " + 
        "Please use the **'Sponsor this Bill'** feature on the 'Create Bill' page to integrate Bitcoin/Xverse utility for the hackathon!"
    );
};


/**
 * Disconnects the current wallet session. - WITH PERSISTENCE
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
    
    // **PERSISTENCE: Clear state from localStorage**
    localStorage.removeItem('splitmate_address');
    localStorage.removeItem('splitmate_walletType');
    
    window.loadPageContent(null);
    window.showMessageBox("Disconnected", "Your wallet has been successfully disconnected.");
};

// --- INITIALIZATION (WITH PERSISTENCE CHECK) ---

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Check for stored connection in LocalStorage
    const storedAddress = localStorage.getItem('splitmate_address');
    const storedType = localStorage.getItem('splitmate_walletType');

    if (storedAddress && storedType) {
        // Restore connection from storage
        window.userAddress = storedAddress;
        window.walletType = storedType;

        // If it's EVM, ensure MetaMask is still enabled (optional check)
        if (storedType === 'EVM' && typeof window.ethereum !== 'undefined') {
            try {
                // Attempt to get accounts to confirm connection is still valid
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length === 0) {
                    // Wallet was locked or disconnected externally
                    window.disconnectWallet(); 
                    return;
                }
            } catch (e) {
                console.warn("EVM silent check failed:", e);
                window.disconnectWallet();
                return;
            }
        }
    } 
    
    // 2. If no persistent connection found, attempt Starknet auto-reconnect
    if (!window.userAddress) {
        const injectedWallet = window.starknet; 

        if (injectedWallet && injectedWallet.isConnected) {
            try {
                await injectedWallet.enable({ showModal: false });
                window.userAddress = injectedWallet.account.address;
                window.walletType = injectedWallet.id;
                
                // Save Starknet state if successfully reconnected automatically
                localStorage.setItem('splitmate_address', window.userAddress);
                localStorage.setItem('splitmate_walletType', window.walletType);
                
            } catch (e) {
                console.log("Starknet auto-reconnect failed:", e);
                window.userAddress = null;
            }
        }
    }

    // Call the page content loader with the final determined address
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

// --- LISTEN FOR STORAGE CHANGES ACROSS TABS ---
window.addEventListener('storage', (event) => {
    // We only care about changes to our specific keys
    if (event.key === 'splitmate_address' || event.key === 'splitmate_walletType') {
        
        const newAddress = localStorage.getItem('splitmate_address');
        
        // If the address changed (e.g., connected or disconnected in another tab)
        if (window.userAddress !== newAddress) {
            window.userAddress = newAddress;
            window.walletType = localStorage.getItem('splitmate_walletType');
            
            // Force the page content to reload with the new state
            // loadPageContent() will handle the connected/disconnected state update
            window.loadPageContent(window.userAddress);
            
            console.log(`Wallet state synced from another tab. New address: ${window.formatAddress(newAddress)}`);
        }
    }
});
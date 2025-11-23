// /static/js/shared/wallet.js
import { NETWORKS } from './config.js';
import { STATE, setEnv, setSelectedChain, saveEvmAccount, saveSolAccount } from './state.js';
import {
  $, show, hide,
  showToast,
  updateBadge, setConnectButtonLabel, renderChips, updateActiveChainStyle,
  networkModal, evmAssist
} from './ui.js';

// -------------------- EVM Enforcement --------------------
export async function maybeEnforceChain() {
  try {
    if (STATE.selected === 'SOL') return; // Solana handled via modals
    if (!window.ethereum) return;
    const target = NETWORKS[STATE.selected][STATE.env];
    const current = await window.ethereum.request({ method: 'eth_chainId' });
    if (current === target.chainId) return; // already correct

    // Ensure permission first
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
    } catch (permErr) {
      $('#expected-network').textContent = target.name; show(networkModal); return;
    }

    // Try to switch
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: target.chainId }] });
      showToast('Switched to ' + target.name, 'success');
    } catch (switchErr) {
      const msg = (switchErr && (switchErr.message || '')).toLowerCase();
      if (switchErr?.code === 4902 || msg.includes('unrecognized chain') || msg.includes('not added')) {
        await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: target.chainId, chainName: target.name, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: [target.rpc], blockExplorerUrls: [target.explorer] }] });
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: target.chainId }] });
        showToast('Switched to ' + target.name, 'success');
      } else if (switchErr?.code === 4001) {
        // user rejected → manual assist
        $('#evm-assist-name').textContent = target.name; show(evmAssist);
      } else if (switchErr?.code === 4100) {
        $('#expected-network').textContent = target.name; show(networkModal);
      } else {
        // fallback manual assist
        $('#evm-assist-name').textContent = target.name; show(evmAssist);
      }
    }
  } catch (e) {
    console.error(e);
    const errorBanner = $('#error-banner');
    errorBanner && (errorBanner.textContent = e.message || String(e), show(errorBanner));
  }
}

// -------------------- Solana UX Modals --------------------
export function openSolanaClusterAssist() {
  const cluster = STATE.env === 'TESTNET' ? 'devnet' : 'mainnet-beta';
  const rpc = NETWORKS.SOL[STATE.env].rpc;
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/50"></div>
    <div class="relative max-w-md mx-auto mt-32 p-6 bg-background border border-border rounded-2xl glass">
      <h3 class="text-xl font-bold mb-2">Switch Phantom Cluster</h3>
      <p class="text-foreground/70 mb-3">SplitMate is set to <span class="font-semibold">${STATE.env}</span> → <span class="font-semibold">${cluster}</span>. Please switch your Phantom to match.</p>
      <ol class="list-decimal pl-5 text-sm text-foreground/70 space-y-1 mb-4">
        <li>Open Phantom → <em>Settings</em></li>
        <li>Developer → <em>Change Network</em></li>
        <li>Select <strong>${cluster}</strong></li>
      </ol>
      <div class="text-xs text-foreground/50 mb-4">Our RPC: ${rpc}</div>
      <div class="flex justify-between">
        <div class="flex gap-2">
          <button id="sol-copy-cluster" class="px-3 py-2 rounded border border-border hover:bg-card text-xs">Copy “${cluster}”</button>
          <button id="sol-copy-rpc" class="px-3 py-2 rounded border border-border hover:bg-card text-xs">Copy RPC</button>
        </div>
        <div class="flex gap-2">
          <button id="sol-verify" class="px-3 py-2 rounded bg-secondary text-black font-semibold text-sm">Re-check</button>
          <button id="sol-close" class="px-3 py-2 rounded border border-border hover:bg-card text-sm">Close</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('#sol-close').onclick = close;
  modal.querySelector('#sol-copy-cluster').onclick = async () => { await navigator.clipboard.writeText(cluster); showToast('Cluster name copied', 'success'); };
  modal.querySelector('#sol-copy-rpc').onclick = async () => { await navigator.clipboard.writeText(rpc); showToast('RPC URL copied', 'success'); };
  modal.querySelector('#sol-verify').onclick = async () => {
    try {
      const ok = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestBlockhash', params: [{ commitment: 'processed' }] }) }).then(r => r.ok);
      showToast(ok ? 'RPC is live. If txs fail, switch Phantom to ' + cluster : 'RPC check failed', ok ? 'success' : 'error');
    } catch { showToast('RPC check failed', 'error'); }
  };
}

export function openSolanaEnvDecision() {
  const otherEnv = STATE.env === 'TESTNET' ? 'MAINNET' : 'TESTNET';
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/50"></div>
    <div class="relative max-w-md mx-auto mt-32 p-6 bg-background border border-border rounded-2xl glass">
      <h3 class="text-xl font-bold mb-2">Solana network choice</h3>
      <p class="text-foreground/70 mb-4">Your Solana wallet is connected. SplitMate is currently set to <strong>${STATE.env}</strong>. What would you like to do?</p>
      <div class="space-y-2">
        <button id="sol-switch-env" class="w-full px-4 py-3 rounded-lg bg-primary text-background font-semibold">Switch SplitMate to ${otherEnv}</button>
        <button id="sol-keep-env" class="w-full px-4 py-3 rounded-lg border border-border hover:bg-card">Continue on ${STATE.env} (I will switch in Phantom)</button>
      </div>
      <div class="text-xs text-foreground/60 mt-3">Tip: SplitMate already uses the correct RPC for its ENV. Your wallet just needs to match cluster for a smooth experience.</div>
    </div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();

  modal.querySelector('#sol-switch-env').onclick = () => {
    setEnv(otherEnv); // State call
    updateBadge(); // UI call
    showToast('Environment: ' + otherEnv); // UI call
    if (STATE.selected !== 'SOL') maybeEnforceChain();
    close();
  };

  modal.querySelector('#sol-keep-env').onclick = () => { close(); openSolanaClusterAssist(); };
}

// -------------------- Wallet Connectors --------------------
export async function connectEvm() {
  const loader = $('#loader-evm'); show(loader); // UI call
  try {
    if (!window.ethereum) { showToast('MetaMask not detected', 'error'); return; }
    let accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (!accounts || !accounts.length) { await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] }); accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }); }

    saveEvmAccount(accounts[0] || null); // State call

    renderChips(); setConnectButtonLabel(); updateActiveChainStyle(); hide($('#wallet-modal')); // UI calls
    await maybeEnforceChain();
    showToast('EVM connected', 'success'); // UI call
  } catch (err) { showToast('EVM connect failed', 'error'); } // UI call
  finally { hide(loader); } // UI call
}

export async function connectSol() {
  const loader = $('#loader-sol'); show(loader); // UI call
  try {
    const provider = window.solana && window.solana.isPhantom ? window.solana : null;
    if (!provider) { showToast('Phantom not detected', 'error'); return; }

    const res = await provider.connect();
    saveSolAccount(res.publicKey.toString()); // State call

    renderChips(); setConnectButtonLabel(); updateActiveChainStyle(); hide($('#wallet-modal')); // UI calls
    showToast('Solana connected', 'success'); // UI call
    if (STATE.selected === 'SOL') openSolanaEnvDecision();
  } catch (err) { showToast('Solana connect failed', 'error'); } // UI call
  finally { hide(loader); } // UI call
}

// -------------------- Live Listeners --------------------
export function initWalletListeners() {
  if (window.ethereum) {
    window.ethereum.on?.('chainChanged', (id) => {
      if (id === '0x14a34') { setSelectedChain('EVM_BASE'); setEnv('TESTNET'); }
      else if (id === '0x2105') { setSelectedChain('EVM_BASE'); setEnv('MAINNET'); }
      else if (id === '0xaa36a7') { setSelectedChain('EVM_ETH'); setEnv('TESTNET'); }
      else if (id === '0x1') { setSelectedChain('EVM_ETH'); setEnv('MAINNET'); }
      
      updateBadge(); updateActiveChainStyle(); setConnectButtonLabel(); // UI calls
      showToast('Network changed in wallet'); // UI call
    });
    window.ethereum.on?.('accountsChanged', (accs) => {
      saveEvmAccount((accs && accs.length) ? accs[0] : null); // State call
      renderChips(); setConnectButtonLabel(); updateActiveChainStyle(); // UI calls
    });
  }
  
  if (window.solana && window.solana.isPhantom) {
    const sp = window.solana;
    
    // --- THIS IS THE FIX ---
    // Buggy code was: sp.on?.('connect', ()=>{ saveEvmAccount(...) ...
    
    sp.on?.('connect', () => { 
      saveSolAccount(sp.publicKey?.toString() || STATE.solAccount); 
      renderChips(); 
      setConnectButtonLabel(); 
    });
    
    // --- END OF FIX ---
    
    sp.on?.('disconnect', () => { saveSolAccount(null); renderChips(); setConnectButtonLabel(); }); // State + UI
    sp.on?.('accountChanged', pk => { saveSolAccount(pk ? pk.toString() : null); renderChips(); setConnectButtonLabel(); }); // State + UI
  }
}

// <-- *** THE EXTRA "}" WAS HERE. I REMOVED IT. ***
// /static/js/shared/ui.js
import { STATE } from './state.js'; // We need STATE to read from

// -------------------- DOM Helpers --------------------
export const $ = (q, root = document) => root.querySelector(q);
export const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));
export const show = el => el && el.classList.remove('hidden');
export const hide = el => el && el.classList.add('hidden');
export const toggle = el => el && el.classList.toggle('hidden');
export const on = (el, ev, fn) => { if (el) el.addEventListener(ev, fn); };

// -------------------- DOM Elements --------------------
export const badgeText = $('#badge-text'), badgeDot = $('#badge-dot');
export const chainTrigger = $('#chain-trigger'), chainMenu = $('#chain-menu'), chainSelected = $('#chain-selected'), chainIcon = $('#chain-icon');
export const connectTrigger = $('#connect-trigger');
export const chipEvm = $('#chip-evm'), chipSol = $('#chip-sol'), chipEvmText = $('#chip-evm-text'), chipSolText = $('#chip-sol-text');
export const createGuard = $('#create-guard'), clusterHint = $('#cluster-hint'), errorBanner = $('#error-banner');

// Modals
export const walletModal = $('#wallet-modal'), walletModalClose = $('#wallet-modal-close');
export const manageModal = $('#manage-modal'), manageModalClose = $('#manage-modal-close');
export const manageSummary = $('#manage-summary');
export const evmAssist = $('#evm-assist');
export const networkModal = $('#network-modal');

// Drawer (Mobile)
export const drawer = $('#drawer'), drawerBackdrop = $('#drawer-backdrop');

// -------------------- UI Functions --------------------

// Toast (restyled)
const toast = $('#toast');
let toastTimer = null;
export function showToast(msg, type = 'info', ms = 2500) {
  if (!toast) return;
  const cls = type === 'error' ? 'border-red-500/40 bg-red-900/25' : type === 'success' ? 'border-green-500/40 bg-green-900/15' : 'border-border bg-background/70';
  toast.innerHTML = `<div class="animate-in px-4 py-3 rounded-xl border ${cls} glass text-sm">${msg}</div>`;
  show(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hide(toast), ms);
}

// Address shortener
export const short = a => a && a.length > 12 ? a.slice(0, 6) + '…' + a.slice(-4) : a;

// Update ENV badge
export function updateBadge() {
  if (!badgeText || !badgeDot) return;
  badgeText.textContent = STATE.env;
  badgeDot.className = 'chip-dot ' + (STATE.env === 'TESTNET' ? 'bg-yellow-400' : 'bg-green-400');
}

// Update "Connect" / "Manage" button
export function setConnectButtonLabel() {
  if (!connectTrigger) return;
  // Label is "Manage" if *either* wallet is connected
  const label = (STATE.evmAccount || STATE.solAccount) ? 'Manage Wallet' : 'Connect Wallet';
  $('#connect-label').textContent = label;
}

// Update EVM/SOL account chips
export function renderChips() {
  // This function just updates the *text*
  // The show/hide logic is now in updateActiveChainStyle
  if (chipEvm && STATE.evmAccount) {
    chipEvmText.textContent = short(STATE.evmAccount);
  }
  if (chipSol && STATE.solAccount) {
    chipSolText.textContent = short(STATE.solAccount);
  }
  // Call updateActiveChainStyle to make sure the right chip is visible
  updateActiveChainStyle();
}

// --- *** THIS FUNCTION IS UPDATED *** ---
// Update chain icon, labels, and chip visibility
export function updateActiveChainStyle() {
  const lbl = STATE.selected === 'EVM_BASE' ? 'Base / ETH' : STATE.selected === 'EVM_ETH' ? 'Ethereum / ETH' : 'Solana / SOL';
  chainSelected && (chainSelected.textContent = lbl);

  if (STATE.selected === 'SOL') {
    // --- SOLANA SELECTED ---
    chainIcon && (chainIcon.className = 'fa-brands fa-sourcetree rotate-90');
    hide(chipEvm); // Hide EVM chip
    
    // Show SOL chip *only if* it's connected
    if (STATE.solAccount) { show(chipSol); } else { hide(chipSol); }

    // Update the guard on the create-bill page
    createGuard && (createGuard.innerHTML = 'Solana selected. Solana bill creation is coming soon.');
    show(createGuard);
    show(clusterHint);

  } else {
    // --- EVM SELECTED (Base or ETH) ---
    chainIcon && (chainIcon.className = 'fa-brands fa-ethereum');
    hide(chipSol); // Hide SOL chip

    // Show EVM chip *only if* it's connected
    if (STATE.evmAccount) { show(chipEvm); } else { hide(chipEvm); }
    
    // Update the guard on the create-bill page
    if (!STATE.evmAccount) {
      createGuard && (createGuard.innerHTML = 'EVM selected: please connect an EVM wallet to create a bill.');
      show(createGuard);
    } else {
      hide(createGuard);
    }
    hide(clusterHint);
  }
}

// Simple hash-based router
export function navigate(hash) {
  const pages = $$('.page-section');
  const id = (hash || '#dashboard').replace('#', '');
  pages.forEach(p => p.classList.add('hidden'));
  const t = document.getElementById(id);
  if (t) t.classList.remove('hidden');

  // Update sidebar
  $$('.sidebar-link').forEach(a => {
    const act = a.getAttribute('href') === '#' + id;
    a.classList.toggle('bg-card', act);
    a.classList.toggle('text-primary', act);
  });
  // Update mobile nav
  $$('.mobile-tab').forEach(a => {
    const act = a.getAttribute('href') === '#' + id;
    a.classList.toggle('text-primary', act);
  });
}
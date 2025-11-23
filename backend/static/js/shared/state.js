// /static/js/shared/state.js

// The global state, now initialized ENTIRELY from localStorage
export const STATE = {
  env: localStorage.getItem('env') || 'TESTNET',            // TESTNET | MAINNET
  selected: localStorage.getItem('selected') || 'EVM_BASE', // EVM_BASE | EVM_ETH | SOL
  evmAccount: localStorage.getItem('evmAccount') || null,
  solAccount: localStorage.getItem('solAccount') || null
};

// --- Helper functions to update state and localStorage ---

export function setEnv(env) {
  STATE.env = env;
  localStorage.setItem('env', env);
  // Note: We'll call ui.updateBadge() from the main script
}

export function setSelectedChain(chain) {
  STATE.selected = chain;
  localStorage.setItem('selected', chain);
  // Note: We'll call ui.updateActiveChainStyle() from the main script
}

export function saveEvmAccount(account) {
  STATE.evmAccount = account;
  if (account) {
    localStorage.setItem('evmAccount', account);
  } else {
    localStorage.removeItem('evmAccount');
  }
  // Note: We'll call ui.renderChips() from the main script
}

export function saveSolAccount(account) {
  STATE.solAccount = account;
  if (account) {
    localStorage.setItem('solAccount', account);
  } else {
    localStorage.removeItem('solAccount');
  }
  // Note: We'll call ui.renderChips() from the main script
}
// /static/js/pages/profile.js

import { $, show, hide, showToast, short } from '../shared/ui.js';
import { STATE } from '../shared/state.js'; 
import { SPLITMATE_ABI, SPLITMATE_ADDRESS_MAP, NETWORKS } from '../shared/config.js'; 

const idInput = $('#mate-id');
const btnCheck = $('#btn-check-id');
const resultBox = $('#id-result');
const btnRegister = $('#btn-register-id');
const solanaAlert = $('#id-solana-alert');
const registrationBox = $('#id-registration-box');
const chipEvmText = $('#chip-evm-text');

let availableID = null;
let currentFee = '0'; 

// --- 1. WRITE Contract (Connected Wallet) ---
export async function getEvmContract() {
  if (!window.ethereum) throw new Error('Wallet not found');
  const web3 = new Web3(window.ethereum);
  const currentChainId = await web3.eth.getChainId();
  const chainIdHex = '0x' + currentChainId.toString(16);
  const contractAddress = SPLITMATE_ADDRESS_MAP[chainIdHex];

  if (!contractAddress) throw new Error('Contract not deployed on this network');
  return new web3.eth.Contract(SPLITMATE_ABI, contractAddress);
}

// --- 2. READ Contract (Universal Resolver - Always ETH Sepolia) ---
export function getResolverContract() {
    const rpcUrl = NETWORKS.EVM_ETH.TESTNET.rpc; 
    const readOnlyWeb3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
    const ethSepoliaAddress = SPLITMATE_ADDRESS_MAP["0xaa36a7"]; 
    return new readOnlyWeb3.eth.Contract(SPLITMATE_ABI, ethSepoliaAddress);
}

// --- 3. ID Lookup ---
export async function lookupIdForCurrentAccount() {
    if (!STATE.evmAccount) return null;
    try {
        const contract = getResolverContract();
        const id = await contract.methods.resolveAddress(STATE.evmAccount).call();
        return id.length > 0 ? id + ".mate" : null;
    } catch (e) {
        return null; 
    }
}

export function updateProfileUI() {
    if (STATE.selected === 'SOL') {
        show(solanaAlert); hide(registrationBox);
    } else {
        hide(solanaAlert); show(registrationBox);
    }
}

async function updateDisplayName(account) {
    if (!account) {
        chipEvmText.textContent = short(STATE.evmAccount); 
        return;
    }
    const registeredId = await lookupIdForCurrentAccount();
    if (chipEvmText) {
        chipEvmText.textContent = registeredId || short(account);
    }
}

async function checkAvailability() {
  if (STATE.selected === 'SOL') return; 
  const id = idInput.value.trim().toLowerCase();
  hide(btnRegister); availableID = null;
  
  if (!id) { hide(resultBox); return; }
  if (id.length < 3 || id.includes('.')) { showToast('Invalid ID format', 'error'); return; }

  btnCheck.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
  btnCheck.disabled = true;
  
  try {
    const contract = getResolverContract(); // Universal check
    const address = await contract.methods.resolveId(id).call();

    if (address !== '0x0000000000000000000000000000000000000000') {
        resultBox.className = 'p-4 rounded-lg text-sm bg-red-900/20 border border-red-500/40 text-red-300';
        resultBox.innerHTML = `<i class="fa-solid fa-times-circle mr-2"></i> <strong>${id}.mate</strong> is taken.`;
        show(resultBox);
    } else {
        const web3 = new Web3(window.ethereum);
        const chainId = await web3.eth.getChainId();
        
        resultBox.className = 'p-4 rounded-lg text-sm bg-green-900/20 border border-green-500/40 text-green-300';
        resultBox.innerHTML = `<i class="fa-solid fa-check-circle mr-2"></i> <strong>${id}.mate</strong> is available!`;
        show(resultBox);

        if (chainId === 11155111) { // Only allow register on Sepolia
             const writeContract = await getEvmContract();
             currentFee = await writeContract.methods.registrationFee().call();
             const feeInEth = Web3.utils.fromWei(currentFee, 'ether');
             btnRegister.innerHTML = `<i class="fa-solid fa-check"></i> Register for ${feeInEth} ETH`;
             availableID = id;
             show(btnRegister);
        } else {
             btnRegister.innerHTML = `Switch to Eth Sepolia to Register`;
             btnRegister.onclick = async () => {
                await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] });
             };
             show(btnRegister);
        }
    }
  } catch (err) { showToast(err.message, 'error'); } 
  finally { btnCheck.innerHTML = 'Check Availability'; btnCheck.disabled = false; }
}

async function registerID() {
  if (!availableID) return;
  btnRegister.disabled = true;
  try {
    const contract = await getEvmContract();
    await contract.methods.register(availableID).send({ from: STATE.evmAccount, value: currentFee })
      .on('receipt', () => { showToast(`Registered ${availableID}.mate!`, 'success'); updateDisplayName(STATE.evmAccount); });
    idInput.value = ''; hide(resultBox); hide(btnRegister); availableID = null;
  } catch (err) { showToast(err.message, 'error'); } 
  finally { btnRegister.disabled = false; }
}

export function initProfile() {
  updateProfileUI();
  lookupIdForCurrentAccount().then(id => { if(id && chipEvmText) chipEvmText.textContent = id; });
  btnCheck?.addEventListener('click', checkAvailability);
  btnRegister?.addEventListener('click', registerID);
  idInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkAvailability(); });
}
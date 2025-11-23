// /static/js/pages/create-bill.js

import { $, showToast, short } from '../shared/ui.js';
import { STATE } from '../shared/state.js';
import { NETWORKS, SPLITMATE_ABI, SPLITMATE_ADDRESS_MAP } from '../shared/config.js';
import { maybeEnforceChain } from '../shared/wallet.js'; 
import { getEvmContract, getResolverContract } from './profile.js'; // Universal Resolver

let currentStep = 1;
const wizardState = { name: '', chain: 'base_eth', total: 0, receiver: '', receiverName: '', participants: [] };

const steps = [ $('#wizard-step-1'), $('#wizard-step-2'), $('#wizard-step-3'), $('#wizard-step-4') ];
const btnBack = $('#wizard-btn-back');
const btnNext = $('#wizard-btn-next');
const btnSubmit = $('#wizard-btn-submit');
const progressBar = $('#wizard-progress');
const stepTitle = $('#wizard-step-title');
const stepCount = $('#wizard-step-count');
const participantInput = $('#participant-addr');
const btnAddParticipant = $('#btn-add-participant');
const participantList = $('#participant-list');
const btnSplitEven = $('#btn-split-even');

const titles = ['Step 1: Bill Details', 'Step 2: Receiver', 'Step 3: Participants', 'Step 4: Review & Initiate'];

function updateWizardUI() {
  progressBar.style.width = `${(currentStep / 4) * 100}%`;
  stepTitle.textContent = titles[currentStep - 1];
  stepCount.textContent = `Step ${currentStep} of 4`;
  steps.forEach((step, index) => { step.classList.toggle('hidden', index !== (currentStep - 1)); });
  btnBack.disabled = (currentStep === 1);
  btnNext.classList.toggle('hidden', currentStep === 4);
  btnSubmit.classList.toggle('hidden', currentStep !== 4);

  if (currentStep === 4) {
    const total = parseFloat(wizardState.total) || 0;
    const pListHtml = wizardState.participants.map(p => 
        `<div class="flex justify-between text-xs text-foreground/60">
            <span>${p.name || short(p.address)}</span>
            <span>$${((total * p.share)/100).toFixed(2)} (${p.share}%)</span>
         </div>`).join('');
    
    $('#review-summary').innerHTML = `
      <div class="flex justify-between"><span class="text-foreground/70">Event:</span> <strong>${wizardState.name}</strong></div>
      <div class="flex justify-between"><span class="text-foreground/70">Paying To:</span> <strong>${wizardState.receiverName || short(wizardState.receiver)}</strong></div>
      <div class="flex justify-between text-xl mt-2 font-bold text-white"><span>Total:</span> <span>$${total.toFixed(2)}</span></div>
      <div class="border-t border-border my-3"></div>
      <div class="text-sm font-semibold mb-2">Split Breakdown:</div>
      <div class="space-y-1 pl-2 border-l-2 border-primary/30">${pListHtml}</div>`;
    $('#review-chain-name').textContent = NETWORKS[STATE.selected]?.[STATE.env]?.name || 'Chain';
  }
}

async function nextStep() {
  if (currentStep < 4) {
    if (currentStep === 1) {
      if (!$('#bill-name').value) { showToast('Enter bill name', 'error'); return; }
      if (parseFloat($('#bill-total').value) <= 0) { showToast('Enter total > 0', 'error'); return; }
      wizardState.name = $('#bill-name').value;
      wizardState.total = $('#bill-total').value;
      wizardState.chain = $('#bill-chain').value;
    } 
    else if (currentStep === 2) {
      const input = $('#receiver-addr').value.trim();
      if (!input) { showToast('Enter receiver address', 'error'); return; }
      
      if (input.toLowerCase().endsWith('.mate')) {
          const originalText = btnNext.innerHTML;
          btnNext.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resolving...';
          btnNext.disabled = true;
          try {
             // Universal Lookup
             const contract = getResolverContract();
             const resolvedAddr = await contract.methods.resolveId(input.toLowerCase().split('.mate')[0]).call();
             if (resolvedAddr === '0x0000000000000000000000000000000000000000') {
                 showToast(`ID "${input}" not found.`, 'error');
                 btnNext.innerHTML = originalText; btnNext.disabled = false; return;
             }
             wizardState.receiver = resolvedAddr; 
             wizardState.receiverName = input;
             showToast(`Resolved to ${short(resolvedAddr)}`, 'success');
          } catch (e) { showToast('Error resolving ID', 'error'); btnNext.innerHTML = originalText; btnNext.disabled = false; return; }
          btnNext.innerHTML = originalText; btnNext.disabled = false;
      } else {
          if (!Web3.utils.isAddress(input)) { showToast('Invalid address', 'error'); return; }
          wizardState.receiver = input;
          wizardState.receiverName = '';
      }
    }
    // Auto-add Creator on step 3
    else if (currentStep === 2 || (currentStep === 3 && wizardState.participants.length === 0)) {
         // Check if step 3 logic needs to run:
    }
    
    // Handle transition to Step 3
    if (currentStep === 2) {
        const creator = STATE.evmAccount;
        if (wizardState.participants.length === 0 && creator) {
            let creatorName = "You (Creator)";
            try {
               const contract = getResolverContract();
               const myId = await contract.methods.resolveAddress(creator).call();
               if(myId) creatorName = myId + ".mate (You)";
            } catch(e) {}
            wizardState.participants.push({ address: creator, name: creatorName, share: 100 });
            renderParticipantList();
        }
    }
    else if (currentStep === 3) {
        if (wizardState.participants.length === 0) { showToast('Add at least one participant', 'error'); return; }
        splitEvenly();
    }
    currentStep++;
    updateWizardUI();
  }
}

function prevStep() { if (currentStep > 1) { currentStep--; updateWizardUI(); } }

async function submitBill() {
  if (!STATE.evmAccount || !window.ethereum) { showToast('Connect EVM wallet', 'error'); return; }
  btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
  btnSubmit.disabled = true;

  try {
    await maybeEnforceChain();
    const web3 = new Web3(window.ethereum);
    const chainId = await web3.eth.getChainId();
    const configChainId = NETWORKS[STATE.selected][STATE.env].chainId;
    
    if (('0x'+chainId.toString(16)).toLowerCase() !== configChainId.toLowerCase()) throw new Error('Wrong network');
    
    const contractAddress = SPLITMATE_ADDRESS_MAP[('0x'+chainId.toString(16)).toLowerCase()];
    if (!contractAddress) throw new Error('Unsupported chain');

    const contract = new web3.eth.Contract(SPLITMATE_ABI, contractAddress);
    const totalInWei = web3.utils.toWei(wizardState.total, 'ether');
    const participantAddresses = wizardState.participants.map(p => p.address);
    
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sign in Wallet...';

    await contract.methods.createBill(wizardState.name, wizardState.receiver, totalInWei, participantAddresses)
    .send({ from: STATE.evmAccount })
    .on('receipt', (receipt) => {
      showToast('Bill Created Successfully!', 'success');
      currentStep = 1; wizardState.participants = []; wizardState.receiver = ''; wizardState.receiverName = '';
      renderParticipantList(); updateWizardUI();
      setTimeout(() => window.location.hash = '#dashboard', 1000);
    });
  } catch (err) { showToast(err.message || "Transaction Failed", 'error'); } 
  finally { btnSubmit.innerHTML = 'Initiate Split'; btnSubmit.disabled = false; }
}

function renderParticipantList() {
  if (!participantList) return;
  participantList.innerHTML = wizardState.participants.map((p, index) => `
    <div class="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border animate-in">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs"><i class="fa-solid fa-user"></i></div>
        <div style="overflow:hidden;"><div class="text-sm font-semibold truncate w-32" title="${p.name || p.address}">${p.name || short(p.address)}</div><div class="text-xs text-foreground/50 font-mono">${short(p.address)}</div></div>
      </div>
      <div class="flex items-center gap-3"><span class="text-sm font-bold text-secondary">${p.share}%</span><button class="btn-remove-participant text-foreground/40 hover:text-red-400 transition-colors" data-index="${index}"><i class="fa-solid fa-xmark"></i></button></div>
    </div>`).join('');
}

async function addParticipant() {
  const input = participantInput.value.trim();
  if (!input) return;
  let address = input; let name = null; const originalBtnText = btnAddParticipant.innerHTML;

  try {
    if (input.toLowerCase().endsWith('.mate')) {
        btnAddParticipant.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        name = input.toLowerCase();
        const contract = getResolverContract(); // Universal Lookup
        address = await contract.methods.resolveId(name.split('.mate')[0]).call();
        if (address === '0x0000000000000000000000000000000000000000') { showToast('ID not found', 'error'); btnAddParticipant.innerHTML = originalBtnText; return; }
    } else if (!Web3.utils.isAddress(input)) { showToast('Invalid address', 'error'); return; }

    if (wizardState.participants.find(p => p.address.toLowerCase() === address.toLowerCase())) { showToast('Already added', 'error'); btnAddParticipant.innerHTML = originalBtnText; return; }
    
    wizardState.participants.push({ address: address, name: name, share: 0 });
    splitEvenly(); renderParticipantList(); participantInput.value = '';
  } catch (err) { showToast('Error adding participant', 'error'); } finally { btnAddParticipant.innerHTML = originalBtnText; }
}

function removeParticipant(index) { wizardState.participants.splice(index, 1); splitEvenly(); renderParticipantList(); }
function splitEvenly() {
  const count = wizardState.participants.length; if (count === 0) return;
  const share = Math.floor(100 / count); 
  wizardState.participants.forEach(p => { p.share = share; });
  let totalShares = share * count;
  if (totalShares < 100) wizardState.participants[0].share += (100 - totalShares);
}

export function initCreateBill() {
  btnNext?.addEventListener('click', nextStep); btnBack?.addEventListener('click', prevStep); btnSubmit?.addEventListener('click', submitBill);
  btnAddParticipant?.addEventListener('click', addParticipant);
  participantInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addParticipant(); } });
  participantList?.addEventListener('click', (e) => { const btn = e.target.closest('.btn-remove-participant'); if (btn) removeParticipant(parseInt(btn.dataset.index)); });
  btnSplitEven?.addEventListener('click', () => { splitEvenly(); renderParticipantList(); });
  updateWizardUI();
}
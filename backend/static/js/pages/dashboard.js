// /static/js/pages/dashboard.js

import { $, show, hide, short, showToast } from '../shared/ui.js';
import { STATE } from '../shared/state.js';
import { SPLITMATE_ABI, SPLITMATE_ADDRESS_MAP, NETWORKS } from '../shared/config.js';
import { getEvmContract } from './profile.js'; // Use for writing

const dashboardContainer = $('#dashboard-bills-container');
const dashboardMsg = $('#dashboard-msg');
const statOwed = $('#stat-owed');
const statOwe = $('#stat-owe');
const statNet = $('#stat-net');

// Helper for read-only fetch
function getReadOnlyWeb3(rpcUrl) { return new Web3(new Web3.providers.HttpProvider(rpcUrl)); }

export async function loadDashboard() {
    if (!dashboardContainer || !STATE.evmAccount) return;
    dashboardContainer.innerHTML = `<div class="text-center p-8 text-foreground/50"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i><br>Syncing chains...</div>`;
    hide(dashboardMsg);

    try {
        const user = STATE.evmAccount.toLowerCase();
        const allBills = [];
        const chainsToScan = [
            { name: 'Base Sepolia', rpc: NETWORKS.EVM_BASE.TESTNET.rpc, address: SPLITMATE_ADDRESS_MAP["0x14a34"], id: '0x14a34' },
            { name: 'Eth Sepolia', rpc: NETWORKS.EVM_ETH.TESTNET.rpc, address: SPLITMATE_ADDRESS_MAP["0xaa36a7"], id: '0xaa36a7' }
        ];

        const promises = chainsToScan.map(async (chain) => {
            try {
                if (!chain.address) return [];
                const web3 = getReadOnlyWeb3(chain.rpc);
                const contract = new web3.eth.Contract(SPLITMATE_ABI, chain.address);
                // Safe block range
                const currentBlock = await web3.eth.getBlockNumber();
                const startBlock = Math.max(0, Number(currentBlock) - 50000); 

                const events = await contract.getPastEvents('BillCreated', { fromBlock: startBlock, toBlock: 'latest' });
                const contributions = await contract.getPastEvents('Contribution', { fromBlock: startBlock, toBlock: 'latest' });
                
                // Check payment status
                return events.map(e => ({
                    ...e.returnValues,
                    chainName: chain.name, 
                    chainId: chain.id,
                    contractAddress: chain.address,
                    paidEvents: contributions.filter(c => c.returnValues.billId === e.returnValues.billId)
                }));
            } catch (e) { console.warn(`Fetch failed ${chain.name}`, e); return []; }
        });

        const results = await Promise.all(promises);
        results.forEach(chainBills => allBills.push(...chainBills));

        const myBills = allBills.filter(d => 
            d.creator.toLowerCase() === user || 
            d.receiver.toLowerCase() === user || 
            d.participants.map(p => p.toLowerCase()).includes(user)
        );

        if (myBills.length === 0) {
            dashboardContainer.innerHTML = ''; show(dashboardMsg); dashboardMsg.textContent = "No bills found."; resetStats();
        } else {
            renderBills(myBills, user); calculateStats(myBills, user);
        }

    } catch (err) { console.error(err); dashboardContainer.innerHTML = `<div class="text-red-400 text-center">Sync failed.</div>`; }
}

function renderBills(bills, user) {
    dashboardContainer.innerHTML = bills.map(d => {
        const totalEth = parseFloat(Web3.utils.fromWei(d.totalAmount, 'ether'));
        const perPersonEth = parseFloat(Web3.utils.fromWei(d.amountOwedPerPerson, 'ether'));
        const billId = d.billId;
        const iHavePaid = d.paidEvents.some(pe => pe.returnValues.participant.toLowerCase() === user);
        const isFullyCollected = d.paidEvents.length >= d.participants.length;

        let roleBadge = d.creator.toLowerCase() === user ? 'Creator' : d.receiver.toLowerCase() === user ? 'Merchant' : 'Participant';
        let roleColor = roleBadge === 'Creator' ? 'text-purple-400 bg-purple-400/10 border-purple-400/20' : roleBadge === 'Merchant' ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        let networkBadge = `<span class="text-[10px] bg-white/10 px-2 py-0.5 rounded text-foreground/60 border border-white/5">${d.chainName}</span>`;
        let actionSection = '';

        if (roleBadge === 'Merchant') {
            actionSection = `<div class="mt-4 pt-3 border-t border-border/40 text-xs text-center text-foreground/50">Waiting for settlement</div>`;
        } else {
            // Creator or Participant needs to pay share
            let payBtn = iHavePaid 
                ? `<button disabled class="flex-1 bg-green-500/20 text-green-400 border border-green-500/50 py-2 rounded-lg text-sm font-semibold cursor-not-allowed"><i class="fa-solid fa-check mr-1"></i> Paid</button>`
                : `<button onclick="window.payBill('${billId}', '${perPersonEth}', '${d.chainId}')" class="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/50 py-2 rounded-lg text-sm font-semibold transition-colors">Pay My Share</button>`;
            
            // Creator can settle
            let settleBtn = '';
            if (roleBadge === 'Creator') {
                settleBtn = isFullyCollected 
                    ? `<button onclick="window.finalizeBill('${billId}', '${d.chainId}')" class="flex-1 bg-secondary hover:bg-secondary/90 text-black py-2 rounded-lg text-sm font-bold transition-colors">Finalize Payout</button>`
                    : `<button disabled class="flex-1 bg-card border border-border py-2 rounded-lg text-sm font-semibold opacity-50 cursor-not-allowed">Waiting...</button>`;
            }
            
            actionSection = `<div class="mt-4 flex gap-2">${payBtn}${settleBtn}</div>`;
        }

        return `
        <div class="p-5 rounded-xl border border-border glass hover:border-primary/30 transition-all">
            <div class="flex justify-between items-start mb-2">
                <div><div class="flex items-center gap-2"><div class="font-bold text-lg">${d.name}</div>${networkBadge}</div><div class="text-xs text-foreground/50">ID: #${billId} • ${roleBadge}</div></div>
                <div class="text-right"><div class="font-mono font-bold text-lg">$${totalEth.toFixed(4)}</div><div class="text-xs text-foreground/50">Share: $${perPersonEth.toFixed(4)}</div></div>
            </div>
            ${actionSection}
        </div>`;
    }).reverse().join('');
}

function calculateStats(bills, user) { /* ... (Same as before) ... */ }
function resetStats() { /* ... */ }

// Window functions
window.payBill = async (billId, amount, targetChainId) => {
    try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetChainId }] });
        const web3 = new Web3(window.ethereum);
        const address = SPLITMATE_ADDRESS_MAP[targetChainId];
        const contract = new web3.eth.Contract(SPLITMATE_ABI, address);
        await contract.methods.contribute(billId).send({ from: STATE.evmAccount, value: Web3.utils.toWei(amount.toString(), 'ether') });
        showToast("Payment Successful!", "success"); loadDashboard();
    } catch(e) { showToast(e.message, "error"); }
};

window.finalizeBill = async (billId, targetChainId) => {
    try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetChainId }] });
        const web3 = new Web3(window.ethereum);
        const address = SPLITMATE_ADDRESS_MAP[targetChainId];
        const contract = new web3.eth.Contract(SPLITMATE_ABI, address);
        await contract.methods.finalize(billId).send({ from: STATE.evmAccount });
        showToast("Payout Finalized!", "success"); loadDashboard();
    } catch(e) { showToast(e.message, "error"); }
};
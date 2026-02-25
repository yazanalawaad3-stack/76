/* transfer_supabase.js
   A simplified withdrawal handler using Supabase.  It replaces the
   localStorage‑only implementation and instead uses LuxApp to fetch
   the user balance and send withdrawal requests.  The UI remains
   largely unchanged: users can enter an amount and a BEP20 address,
   click MAX to autofill their balance, and click Transfer to submit
   a withdrawal.  Minimum amount and fee are enforced client‑side.
*/
(function () {
  'use strict';
  // DOM helpers
  const $ = (id) => document.getElementById(id);
  const balanceHint = $('balanceHint');
  const minHint = $('minHint');
  const unitPill = $('unitPill');
  const availableLine = $('availableLine');
  const minimumLine = $('minimumLine');
  const minValue = $('minValue');
  const feeValue = $('feeValue');
  const receivedValue = $('receivedValue');
  const errorBox = $('errorBox');
  const statusText = $('statusText');
  const transferBtn = $('transferBtn');
  const amountInput = $('amount');
  const addressInput = $('addressInput');
  const maxBtn = $('maxBtn');

  // Configuration
  const MIN_AMOUNT = 20;
  const FEE_RATE = 0.05;

  // State
  let availableBalance = 0;

  /**
   * Format a number to two decimals and append unit
   *
   * @param {number} v
   * @returns {string}
   */
  function formatAmt(v) {
    const n = Number(v);
    return (Number.isFinite(n) ? n.toFixed(2) : '0.00');
  }

  function updateUI() {
    // Update hints and balance lines
    const balTxt = formatAmt(availableBalance);
    balanceHint.textContent = `Available ${balTxt} USDT`;
    availableLine.innerHTML = `Available <b>${balTxt}</b> USDT`;
    minHint.textContent = `Minimum ${MIN_AMOUNT} USDT`;
    minimumLine.innerHTML = `Minimum <b>${MIN_AMOUNT}</b> USDT`;
    minValue.textContent = `${MIN_AMOUNT} USDT`;
    unitPill.textContent = 'USDT';
    updateCalc();
  }

  /**
   * Recalculate fee and received amounts based on input
   */
  function updateCalc() {
    const amt = Number(amountInput.value.replace(/,/g, '.'));
    if (!Number.isFinite(amt)) {
      feeValue.textContent = '0.00 USDT';
      receivedValue.textContent = '0.00 USDT';
      return;
    }
    const fee = Math.max(0, amt * FEE_RATE);
    const received = Math.max(0, amt - fee);
    feeValue.textContent = `${formatAmt(fee)} USDT`;
    receivedValue.textContent = `${formatAmt(received)} USDT`;
  }

  /**
   * Validate the address (simple BEP20 address check)
   *
   * @param {string} addr
   * @returns {boolean}
   */
  function isValidAddress(addr) {
    return /^0x[a-fA-F0-9]{40}$/.test(String(addr || '').trim());
  }

  /**
   * Load the user’s available balance from Supabase
   */
  async function loadBalance() {
    if (!window.LuxApp || !window.LuxApp.fetchCurrentUserData) return;
    try {
      const { user } = await window.LuxApp.fetchCurrentUserData();
      availableBalance = Number(user?.real_balance) || 0;
      updateUI();
    } catch (err) {
      console.error(err);
      statusText.textContent = 'Error loading balance';
    }
  }

  /**
   * Send a withdrawal request via Supabase
   */
  async function submitWithdrawal() {
    const amtStr = amountInput.value.replace(/,/g, '.');
    const amt = Number(amtStr);
    const addr = addressInput.value.trim();
    // Clear previous error
    errorBox.style.display = 'none';
    errorBox.textContent = '';
    statusText.textContent = 'Processing…';
    // Basic validations
    if (!isValidAddress(addr)) {
      errorBox.style.display = 'block';
      errorBox.textContent = 'Invalid wallet address.';
      statusText.textContent = 'Ready';
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      errorBox.style.display = 'block';
      errorBox.textContent = 'Enter a valid amount.';
      statusText.textContent = 'Ready';
      return;
    }
    if (amt < MIN_AMOUNT) {
      errorBox.style.display = 'block';
      errorBox.textContent = `Minimum withdrawal is ${MIN_AMOUNT} USDT.`;
      statusText.textContent = 'Ready';
      return;
    }
    if (amt > availableBalance) {
      errorBox.style.display = 'block';
      errorBox.textContent = 'Insufficient balance.';
      statusText.textContent = 'Ready';
      return;
    }
    transferBtn.disabled = true;
    try {
      await window.LuxApp.requestWithdraw({ amount: amt, address: addr, network: 'BEP20' });
      statusText.textContent = 'Withdrawal submitted';
      // Reload balance
      await loadBalance();
      amountInput.value = '';
      updateCalc();
    } catch (err) {
      console.error(err);
      errorBox.style.display = 'block';
      errorBox.textContent = err.message || 'Withdrawal failed';
      statusText.textContent = 'Ready';
    } finally {
      transferBtn.disabled = false;
    }
  }

  // Attach event listeners
  if (amountInput) {
    amountInput.addEventListener('input', () => {
      updateCalc();
      // Enable or disable the transfer button based on form validity
      const amt = Number(amountInput.value.replace(/,/g, '.'));
      transferBtn.disabled = !(isValidAddress(addressInput.value) && Number.isFinite(amt) && amt >= MIN_AMOUNT && amt <= availableBalance);
    });
  }
  if (addressInput) {
    addressInput.addEventListener('input', () => {
      const amt = Number(amountInput.value.replace(/,/g, '.'));
      transferBtn.disabled = !(isValidAddress(addressInput.value) && Number.isFinite(amt) && amt >= MIN_AMOUNT && amt <= availableBalance);
    });
  }
  if (maxBtn) {
    maxBtn.addEventListener('click', () => {
      amountInput.value = formatAmt(availableBalance);
      updateCalc();
      transferBtn.disabled = !(isValidAddress(addressInput.value) && availableBalance >= MIN_AMOUNT);
    });
  }
  if (transferBtn) {
    transferBtn.addEventListener('click', submitWithdrawal);
  }

  // Load balance on page ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBalance);
  } else {
    loadBalance();
  }
})();
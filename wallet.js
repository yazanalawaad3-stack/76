/* wallet.js
   Prepared for future Supabase integration.
   Demo deposit address uses localStorage only.
*/
(function () {
  "use strict";

  // Select DOM elements once
  const qs = (sel, el = document) => el.querySelector(sel);
  const toastEl = qs('#luxToast');
  const toastText = qs('#toastText');
  let toastTimer = null;

  /**
   * Show a small temporary toast message.
   *
   * @param {string} msg
   */
  function toast(msg) {
    if (!toastEl || !toastText) return;
    toastText.textContent = String(msg || '');
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1400);
  }

  /**
   * Copy text to clipboard with fallback for insecure contexts.
   *
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async function safeCopy(text) {
    try {
      await navigator.clipboard.writeText(String(text));
      return true;
    } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = String(text);
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return !!ok;
      } catch (_) {
        return false;
      }
    }
  }

  // DOM refs
  const addrEl = qs('#walletAddressText');
  const canvas = qs('#qrCanvas');
  const qrImg = qs('#qrImg');
  const copyBtn = qs('#copyAddressBtn');
  const refreshBtn = qs('#walletRefreshBtn');

  /**
   * Toggle loading state for the refresh button
   *
   * @param {boolean} isLoading
   */
  function setLoading(isLoading) {
    if (!refreshBtn) return;
    refreshBtn.classList.toggle('is-loading', !!isLoading);
    refreshBtn.disabled = !!isLoading;
  }

  /**
   * Flash the address pill to indicate it changed
   */
  function flashAddress() {
    const pill = qs('.lux-address-pill');
    if (!pill) return;
    pill.classList.add('is-flash');
    setTimeout(() => pill.classList.remove('is-flash'), 450);
  }

  /**
   * Render a QR code for the current address using qr.js if
   * available; otherwise fallback to a remote QR service.
   */
  function renderQR() {
    const address = String(addrEl?.textContent || '').trim();
    if (!address) return;
    const canCanvas = !!(window.QRCode && window.QRCode.toCanvas && canvas);
    if (canCanvas) {
      if (qrImg) qrImg.style.display = 'none';
      if (canvas) canvas.style.display = 'block';
      window.QRCode.toCanvas(canvas, address, { width: 220, margin: 1 }, (err) => {
        if (err) {
          if (qrImg) {
            canvas.style.display = 'none';
            qrImg.style.display = 'block';
            qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(address);
          }
        }
      });
    } else if (qrImg) {
      if (canvas) canvas.style.display = 'none';
      qrImg.style.display = 'block';
      qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(address);
    }
  }

  /**
   * Update the address display and regenerate its QR
   *
   * @param {string} newAddress
   */
  function setAddress(newAddress) {
    if (!addrEl) return;
    addrEl.textContent = String(newAddress || '').trim();
    renderQR();
  }

  /**
   * Fetch the deposit address for the current user from Supabase via
   * LuxApp.  Defaults to the BEP20 network.  On success the UI is
   * updated; on error a toast is shown and the old address remains.
   */
  async function loadAddress() {
    if (!window.LuxApp || !window.LuxApp.getDepositAddress) return;
    setLoading(true);
    try {
      const addr = await window.LuxApp.getDepositAddress('BEP20');
      if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) {
        setAddress(addr);
        flashAddress();
      } else {
        toast('Invalid address');
      }
    } catch (err) {
      console.error(err);
      toast('Failed to load address');
    } finally {
      setTimeout(() => setLoading(false), 400);
    }
  }

  // Copy and refresh event handlers
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const address = String(addrEl?.textContent || '').trim();
      if (!address) return toast('No address');
      const ok = await safeCopy(address);
      toast(ok ? 'Address copied' : 'Copy failed');
    });
  }
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadAddress();
    });
  }
  [canvas, qrImg].filter(Boolean).forEach((el) => {
    el.addEventListener('click', async () => {
      const address = String(addrEl?.textContent || '').trim();
      if (!address) return;
      const ok = await safeCopy(address);
      toast(ok ? 'Copied' : 'Copy failed');
    });
  });

  // Auto load the address on page ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAddress);
  } else {
    loadAddress();
  }

  window.addEventListener("load", () => {
    initAddress();
    renderQR();
  });
})();
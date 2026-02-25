/* wallet.js
   Prepared for future Supabase integration.
   Demo deposit address uses localStorage only.
*/
(function () {
  "use strict";

  const KEYS = {
    USER_ID: "user_id_demo",
    WALLET_ADDR: "wallet_usdt_bep20_address_demo"
  };

  const qs = (s, el = document) => el.querySelector(s);

  const toastEl = qs("#luxToast");
  const toastText = qs("#toastText");
  let toastTimer = null;

  function toast(msg) {
    if (!toastEl || !toastText) return;
    toastText.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1400);
  }

  async function safeCopy(text) {
    try {
      await navigator.clipboard.writeText(String(text));
      return true;
    } catch (_) {
      try {
        const ta = document.createElement("textarea");
        ta.value = String(text);
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return !!ok;
      } catch (_) {
        return false;
      }
    }
  }

  function gen8() {
    const min = 10000000;
    const max = 99999999;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
  }

  function ensureUserId() {
    let id = localStorage.getItem(KEYS.USER_ID);
    if (!id || !/^\d{8}$/.test(id)) {
      id = gen8();
      localStorage.setItem(KEYS.USER_ID, id);
    }
    return id;
  }

  function bytesToHex(bytes) {
    const hex = [];
    for (let i = 0; i < bytes.length; i++) {
      hex.push(bytes[i].toString(16).padStart(2, "0"));
    }
    return hex.join("");
  }

  function genDemoEvmAddress() {
    const b = new Uint8Array(20);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(b);
    } else {
      for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    }
    return "0x" + bytesToHex(b);
  }

  function ensureWalletAddress() {
    ensureUserId();

    let addr = localStorage.getItem(KEYS.WALLET_ADDR);
    if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) return addr;

    addr = genDemoEvmAddress();
    localStorage.setItem(KEYS.WALLET_ADDR, addr);
    return addr;
  }

  const addrEl = qs("#walletAddressText");
  const canvas = qs("#qrCanvas");
  const qrImg = qs("#qrImg");
  const copyBtn = qs("#copyAddressBtn");
  const refreshBtn = qs("#walletRefreshBtn");

  function setLoading(isLoading) {
    if (!refreshBtn) return;
    refreshBtn.classList.toggle("is-loading", !!isLoading);
    refreshBtn.disabled = !!isLoading;
  }

  function flashAddress() {
    const pill = qs(".lux-address-pill");
    if (!pill) return;
    pill.classList.add("is-flash");
    setTimeout(() => pill.classList.remove("is-flash"), 450);
  }

  function renderQR() {
    const address = String(addrEl?.textContent || "").trim();
    if (!address) return;

    const canCanvas = !!(window.QRCode && window.QRCode.toCanvas && canvas);

    if (canCanvas) {
      if (qrImg) qrImg.style.display = "none";
      if (canvas) canvas.style.display = "block";
      window.QRCode.toCanvas(canvas, address, { width: 220, margin: 1 }, (err) => {
        if (err) {
          if (qrImg) {
            canvas.style.display = "none";
            qrImg.style.display = "block";
            qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(address);
          }
        }
      });
      return;
    }

    if (qrImg) {
      if (canvas) canvas.style.display = "none";
      qrImg.style.display = "block";
      qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(address);
    }
  }

  function setAddress(newAddress) {
    if (!addrEl) return;
    addrEl.textContent = String(newAddress || "").trim();
    renderQR();
  }

  async function fetchAddressFromFutureAPI() {
    const url = "./api/deposit-address.json?currency=USDT&network=BEP20&_=" + Date.now();
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.address ? String(data.address) : null;
  }

  function initAddress() {
    const addr = ensureWalletAddress();
    setAddress(addr);
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const address = String(addrEl?.textContent || "").trim();
      if (!address) return toast("No address");
      const ok = await safeCopy(address);
      toast(ok ? "Address copied" : "Copy failed");
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      setLoading(true);
      try {
        let address = null;
        try {
          address = await fetchAddressFromFutureAPI();
        } catch (_) {}

        if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
          localStorage.setItem(KEYS.WALLET_ADDR, address);
          setAddress(address);
          flashAddress();
          toast("Address updated");
        } else {
          initAddress();
          flashAddress();
          toast("Refreshed");
        }
      } finally {
        setTimeout(() => setLoading(false), 450);
      }
    });
  }

  [canvas, qrImg].filter(Boolean).forEach((el) => {
    el.addEventListener("click", async () => {
      const address = String(addrEl?.textContent || "").trim();
      if (!address) return;
      const ok = await safeCopy(address);
      toast(ok ? "Copied" : "Copy failed");
    });
  });

  window.addEventListener("load", () => {
    initAddress();
    renderQR();
  });
})();
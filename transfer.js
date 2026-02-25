/* transfer.js
   Prepared for future Supabase integration.
   Demo state uses localStorage only.
*/
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const KEYS = {
    PROFILE: "profile_demo",
    LAST_DEPOSIT_AT: "last_deposit_at_demo",
    LAST_WITHDRAW_AT: "last_withdraw_at_demo",
    ADDRESSES: "transfer_saved_addresses_v1",
    WITHDRAWALS: "withdrawals_demo_v1"
  };

  const RULES = {
    minAmount: 20,
    feeRate: 0.05,
    lockDays: 3,
    payoutDays: 5
  };

  const state = {
    balances: { USDT: 0.00 }
  };

  function now() { return Date.now(); }

  function safeParse(raw, fallback) {
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }

  function readStore(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return safeParse(raw, fallback);
  }

  function writeStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function format2(n) {
    const x = Number(n);
    return Number.isFinite(x) ? x.toFixed(2) : "0.00";
  }

  function isValidBep20Address(addr) {
    const a = String(addr || "").trim();
    return /^0x[a-fA-F0-9]{40}$/.test(a);
  }

  function loadProfile() {
    const p0 = readStore(KEYS.PROFILE, { balance: 0, level: "V0", frozen: false });
    const balance = Number(p0.balance);
    return {
      balance: Number.isFinite(balance) ? balance : 0,
      level: typeof p0.level === "string" ? p0.level : "V0",
      frozen: Boolean(p0.frozen)
    };
  }

  function saveProfile(p) {
    writeStore(KEYS.PROFILE, p);
  }

  function loadAddresses() {
    const list = readStore(KEYS.ADDRESSES, []);
    return Array.isArray(list) ? list.filter(x => typeof x === "string") : [];
  }

  function saveAddresses(list) {
    writeStore(KEYS.ADDRESSES, list);
  }

  function loadWithdrawals() {
    const list = readStore(KEYS.WITHDRAWALS, []);
    return Array.isArray(list) ? list : [];
  }

  function saveWithdrawals(list) {
    writeStore(KEYS.WITHDRAWALS, list);
  }

  function normalizeWithdrawals(list) {
    const out = [];
    for (const x of list) {
      if (!x || typeof x !== "object") continue;
      const createdAt = Number(x.createdAt) || 0;
      const availableAt = Number(x.availableAt) || 0;
      const status = (x.status === "paid" || x.status === "pending" || x.status === "canceled") ? x.status : "pending";
      out.push({
        id: String(x.id || ""),
        amount: Number(x.amount) || 0,
        fee: Number(x.fee) || 0,
        received: Number(x.received) || 0,
        address: String(x.address || ""),
        createdAt,
        availableAt,
        status
      });
    }
    return out;
  }

  function rollPayouts() {
    const list0 = normalizeWithdrawals(loadWithdrawals());
    let changed = false;
    const t = now();
    for (const w of list0) {
      if (w.status === "pending" && w.availableAt > 0 && t >= w.availableAt) {
        w.status = "paid";
        changed = true;
      }
    }
    if (changed) saveWithdrawals(list0);
    return list0;
  }

  function daysToMs(d) { return d * 24 * 60 * 60 * 1000; }

  function msLeftUntilAllowed() {
    const lastDepositAt = Number(localStorage.getItem(KEYS.LAST_DEPOSIT_AT)) || 0;
    const lastWithdrawAt = Number(localStorage.getItem(KEYS.LAST_WITHDRAW_AT)) || 0;
    const gate = Math.max(lastDepositAt, lastWithdrawAt);
    if (!gate) return 0;
    const unlockAt = gate + daysToMs(RULES.lockDays);
    return Math.max(0, unlockAt - now());
  }

  function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return hh + ":" + mm + ":" + ss;
  }

  function parseAmount() {
    const raw = $("amount").value.trim().replace(/,/g, ".");
    const num = Number(raw);
    return Number.isFinite(num) ? num : NaN;
  }

  function currentCurrency() { return $("currency").value; }
  function currentNetwork() { return $("network").value; }

  function calcFee(amt) {
    return Math.max(0, Number(amt) * RULES.feeRate);
  }

  function updateHeader() {
    const c = currentCurrency();
    const bal = state.balances[c] ?? 0;

    $("balanceHint").textContent = `Available ${format2(bal)} ${c}`;
    $("unitPill").textContent = c;

    $("minHint").textContent = `Minimum ${RULES.minAmount} ${c}`;
    $("availableLine").innerHTML = `Available <b>${format2(bal)}</b> ${c}`;
    $("minimumLine").innerHTML = `Minimum <b>${RULES.minAmount}</b> ${c}`;
    $("minValue").textContent = `${RULES.minAmount} ${c}`;

    const list = loadAddresses();
    $("addressCount").textContent = `${list.length} saved`;
  }

  function setStatus(text) {
    $("statusText").textContent = text;
  }

  function setError(err) {
    const box = $("errorBox");
    if (!err) {
      box.style.display = "none";
      box.textContent = "";
      return;
    }
    box.style.display = "block";
    box.textContent = err;
  }

  function validate() {
    rollPayouts();

    const c = currentCurrency();
    const addr = $("addressInput").value.trim();
    const bal = state.balances[c] ?? 0;
    const amt = parseAmount();

    let err = "";

    // Gate conditions
    const lockLeft = msLeftUntilAllowed();
    if (lockLeft > 0) {
      err = `Withdrawals locked. Try again in ${formatDuration(lockLeft)}.`;
    } else if (!isValidBep20Address(addr)) {
      err = "Invalid wallet address.";
    } else if (!Number.isFinite(amt) || amt <= 0) {
      err = "Enter a valid amount.";
    } else if (amt < RULES.minAmount) {
      err = `Amount must be at least ${RULES.minAmount} ${c}.`;
    } else if (amt > bal) {
      err = "Insufficient balance.";
    }

    const fee = Number.isFinite(amt) ? calcFee(amt) : 0;
    const recv = Math.max(0, (Number.isFinite(amt) ? amt : 0) - fee);

    $("feeValue").textContent = `${format2(fee)} ${c}`;
    $("receivedValue").textContent = `${format2(recv)} ${c}`;

    const ok = err === "";
    $("transferBtn").disabled = !ok;

    if (ok) {
      setError("");
      setStatus("Ready");
    } else {
      setError(err);
      setStatus("Check details");
    }

    return ok;
  }

  function setMax() {
    const c = currentCurrency();
    const bal = state.balances[c] ?? 0;
    $("amount").value = format2(bal);
    validate();
  }

  function openAddressDialog() {
    $("addrValue").value = $("addressInput").value.trim();
    $("addrNote").textContent = "Stored in localStorage";
    $("addressDialog").showModal();
    setTimeout(() => $("addrValue").focus(), 50);
  }

  function saveAddressFromDialog() {
    const value = $("addrValue").value.trim();
    if (!isValidBep20Address(value)) {
      $("addrNote").textContent = "Invalid BEP-20 address.";
      return;
    }

    const list = loadAddresses();
    if (!list.includes(value)) {
      list.unshift(value);
      saveAddresses(list.slice(0, 25));
    }

    $("addressInput").value = value;
    $("addressDialog").close();
    updateHeader();
    validate();
    setStatus("Address saved");
  }

  function createWithdrawalRecord(amount, fee, received, address) {
    const createdAt = now();
    const availableAt = createdAt + daysToMs(RULES.payoutDays);
    const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ("wd_" + createdAt + "_" + Math.floor(Math.random() * 1e6));

    return {
      id,
      amount,
      fee,
      received,
      address,
      createdAt,
      availableAt,
      status: "pending"
    };
  }

  function submitWithdrawal() {
    if (!validate()) return;

    const c = currentCurrency();
    const amt = parseAmount();
    const fee = calcFee(amt);
    const recv = Math.max(0, amt - fee);
    const address = $("addressInput").value.trim();

    $("transferBtn").disabled = true;
    setStatus("Processing...");
    setError("");

    setTimeout(() => {
      // Deduct full amount from balance at request time
      const profile = loadProfile();
      const nextBalance = Math.max(0, Number(profile.balance) - amt);
      saveProfile({ ...profile, balance: nextBalance });

      state.balances[c] = nextBalance;

      // Save last withdraw timestamp for 3-day rule
      localStorage.setItem(KEYS.LAST_WITHDRAW_AT, String(now()));

      // Record withdrawal
      const list = normalizeWithdrawals(loadWithdrawals());
      list.unshift(createWithdrawalRecord(amt, fee, recv, address));
      saveWithdrawals(list.slice(0, 200));

      updateHeader();

      $("amount").value = "";
      $("feeValue").textContent = `0.00 ${c}`;
      $("receivedValue").textContent = `0.00 ${c}`;

      const eta = new Date(now() + daysToMs(RULES.payoutDays));
      const etaText = eta.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });

      setStatus(`Withdrawal submitted. Arrives after 5 days (${etaText}).`);
      validate();
    }, 700);
  }

  function initBalanceFromProfile() {
    const p = loadProfile();
    state.balances.USDT = Number(p.balance) || 0;
  }

  function init() {
    updateHeader();
    initBalanceFromProfile();
    updateHeader();
    validate();

    $("amount").addEventListener("input", validate);
    $("addressInput").addEventListener("input", validate);

    $("maxBtn").addEventListener("click", setMax);
    $("transferBtn").addEventListener("click", submitWithdrawal);

    $("addAddressBtn").addEventListener("click", openAddressDialog);
    $("saveAddrBtn").addEventListener("click", (e) => { e.preventDefault(); saveAddressFromDialog(); });

    $("backBtn").addEventListener("click", () => { window.location.href = "myassets.html"; });

    // Keep original menu behavior target untouched (if exists)
    $("menuBtn").addEventListener("click", () => { setStatus("History (demo)"); });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && document.activeElement === $("amount")) {
        e.preventDefault();
        submitWithdrawal();
      }
    });

    // React to updates from other pages
    window.addEventListener("storage", (e) => {
      if (!e) return;
      if (e.key === KEYS.PROFILE || e.key === KEYS.LAST_DEPOSIT_AT || e.key === KEYS.LAST_WITHDRAW_AT) {
        initBalanceFromProfile();
        updateHeader();
        validate();
      }
    });

    // Refresh countdown gate every second (validation message updates)
    setInterval(() => {
      const lockLeft = msLeftUntilAllowed();
      if (lockLeft > 0) validate();
    }, 1000);
  }

  init();
})();
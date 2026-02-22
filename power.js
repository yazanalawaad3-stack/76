(() => {
  const qs = (s, el = document) => el.querySelector(s);

  const toastEl = qs('#luxToast');
  const toastText = qs('#toastText');
  let toastTimer = null;
  function toast(msg) {
    toastText.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  function getBalance() {
    const stored = localStorage.getItem('lux_balance');
    const n = parseFloat(stored);
    return (!Number.isNaN(n) && n >= 0) ? n : 0;
  }
  function setBalance(v) {
    localStorage.setItem('lux_balance', String(Math.max(0, Number(v || 0))));
  }

  function fmt(amount) {
    return Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Positions stored locally (demo)
  // { id, plan, principal, dailyRate, days, startAt, endAt, credited }
  const POS_KEY = 'lux_power_positions';

  function loadPositions() {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function savePositions(arr) {
    localStorage.setItem(POS_KEY, JSON.stringify(arr || []));
  }

  function calc(plan, principal) {
    const p = Math.max(0, Number(principal || 0));
    const daily = p * plan.dailyRate;
    const profit = daily * plan.days;
    const total = p + profit;
    return { daily, profit, total };
  }

  const plans = {
    A: { key: 'A', title: 'Plan A (15 Days)', days: 15, dailyRate: 0.02, min: 250, max: 1000 },
    B: { key: 'B', title: 'Plan B (30 Days)', days: 30, dailyRate: 0.03, min: 1000, max: 2000 },
  };

  function creditMatured() {
    const now = Date.now();
    const pos = loadPositions();
    let balance = getBalance();
    let changed = false;

    for (const p of pos) {
      if (p.credited) continue;
      const end = new Date(p.endAt).getTime();
      if (!Number.isNaN(end) && now >= end) {
        // credit principal + full profit at maturity
        const plan = plans[p.plan];
        const { total } = calc(plan, p.principal);
        balance += total;
        p.credited = true;
        changed = true;
      }
    }

    if (changed) {
      setBalance(balance);
      savePositions(pos);
      toast('Matured positions credited ✅');
    }
  }

  function lockedTotal(pos) {
    // Locked funds are principals of non-credited positions
    return pos.filter(p => !p.credited).reduce((s, p) => s + Number(p.principal || 0), 0);
  }

  function refreshHeader() {
    const pos = loadPositions();
    const locked = lockedTotal(pos);
    qs('#powerAvail').textContent = `${fmt(getBalance())} USDT`;
    qs('#powerLocked').textContent = `${fmt(locked)} USDT`;
  }

  function row(p) {
    const plan = plans[p.plan];
    const now = Date.now();
    const start = new Date(p.startAt);
    const end = new Date(p.endAt);
    const total = calc(plan, p.principal).total;

    const status = p.credited ? 'Completed' : (now >= end.getTime() ? 'Ready' : 'Active');
    const dot = p.credited ? 'var(--muted2)' : 'var(--good)';
    const timeLeftMs = Math.max(0, end.getTime() - now);
    const daysLeft = Math.ceil(timeLeftMs / 86400000);

    return `
      <div class="lux-address-pill" style="justify-content:space-between;gap:10px;">
        <div style="display:flex;flex-direction:column;gap:2px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:8px;height:8px;border-radius:999px;background:${dot};display:inline-block;"></span>
            <span style="font-weight:800;">${plan.title}</span>
          </div>
          <div style="color:var(--muted);font-size:12px;">
            Principal: ${fmt(p.principal)} • Maturity: ${fmt(total)} • End: ${end.toLocaleDateString('en-US')}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <span class="lux-badge" style="${p.credited ? 'opacity:.7;' : ''}">${status}</span>
          ${p.credited ? '' : `<span style="color:var(--muted);font-size:12px;">${daysLeft}d left</span>`}
        </div>
      </div>
    `;
  }

  function renderPositions() {
    const list = qs('#positionsList');
    const empty = qs('#positionsEmpty');
    const pos = loadPositions();

    qs('#posCount').textContent = String(pos.filter(p => !p.credited).length);

    const active = pos
      .slice()
      .sort((a,b) => (a.credited === b.credited) ? (b.endAt || '').localeCompare(a.endAt || '') : (a.credited ? 1 : -1));

    list.innerHTML = active.map(row).join('');
    empty.style.display = active.length ? 'none' : '';
  }

  function bindPlan(plan, amountInputId, dailyId, profitId, totalId, btnId) {
    const amountEl = qs('#' + amountInputId);
    function refresh() {
      const v = parseFloat(amountEl.value || '0');
      const { daily, profit, total } = calc(plan, v);
      qs('#' + dailyId).textContent = fmt(daily);
      qs('#' + profitId).textContent = fmt(profit);
      qs('#' + totalId).textContent = fmt(total);
    }
    amountEl.addEventListener('input', refresh);
    refresh();

    qs('#' + btnId).addEventListener('click', () => {
      const v = parseFloat(amountEl.value || '0');
      if (Number.isNaN(v) || v <= 0) return toast('Enter an amount');
      if (v < plan.min) return toast(`Minimum is ${plan.min} USDT`);
      if (v > plan.max) return toast(`Maximum is ${plan.max} USDT`);

      const bal = getBalance();
      if (v > bal) return toast('Insufficient balance');

      // Deduct and create position
      setBalance(bal - v);

      const now = new Date();
      const end = new Date(now.getTime() + plan.days * 86400000);

      const pos = loadPositions();
      pos.push({
        id: String(Date.now()) + '-' + plan.key,
        plan: plan.key,
        principal: Number(v),
        dailyRate: plan.dailyRate,
        days: plan.days,
        startAt: now.toISOString(),
        endAt: end.toISOString(),
        credited: false
      });
      savePositions(pos);

      toast('Investment started ✅');
      amountEl.value = '';
      refresh();
      refreshHeader();
      renderPositions();
    });
  }

  function init() {
    // Demo convenience: if balance not set, seed with 0
    if (localStorage.getItem('lux_balance') === null) setBalance(0);

    creditMatured();
    refreshHeader();
    renderPositions();

    bindPlan(plans.A, 'plan1Amount', 'plan1Daily', 'plan1Profit', 'plan1Total', 'plan1InvestBtn');
    bindPlan(plans.B, 'plan2Amount', 'plan2Daily', 'plan2Profit', 'plan2Total', 'plan2InvestBtn');

    // Refresh credits on focus
    window.addEventListener('focus', () => {
      creditMatured();
      refreshHeader();
      renderPositions();
    });
  }

  init();
})();
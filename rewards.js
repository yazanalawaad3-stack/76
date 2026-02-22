(() => {
  /*
    Rewards page logic
    Allows claiming a daily bonus and a lucky bonus. Each reward can be
    claimed once per day. Rewards increase the demonstration balance stored
    in localStorage. Team rewards are not implemented in this demo.
  */
  const qs = (s, el = document) => el.querySelector(s);

  const toastEl = qs('#luxToast');
  const toastText = qs('#toastText');
  let toastTimer = null;
  function toast(msg) {
    toastText.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1700);
  }

  function getBalance() {
    const stored = localStorage.getItem('lux_balance');
    const n = parseFloat(stored);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  }
  function setBalance(v) {
    localStorage.setItem('lux_balance', String(v));
  }

  // Generic once-per-day check for a key. If the key has a timestamp less than
  // 24h ago, return false. Otherwise return true. The key will be updated
  // when the reward is claimed.
  function canClaim(key) {
    const ts = localStorage.getItem(key);
    if (!ts) return true;
    const last = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - last.getTime();
    return diff >= 86400000;
  }
  function markClaimed(key) {
    localStorage.setItem(key, new Date().toISOString());
  }

  function fmt(amount) {
    // Format numbers using the en-US locale for consistent decimal and
    // thousands separators across browsers and locales.
    return Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function init() {
    const dailyBtn = qs('#dailyClaim');
    const luckyBtn = qs('#luckyClaim');
    // Daily reward: fixed small bonus
    const dailyReward = 3; // 3 USDT
    if (!canClaim('lux_daily_reward')) {
      dailyBtn.disabled = true;
      dailyBtn.textContent = 'Claimed';
      dailyBtn.style.opacity = '0.5';
    }
    dailyBtn?.addEventListener('click', () => {
      if (!canClaim('lux_daily_reward')) {
        toast('Daily reward already claimed');
        return;
      }
      const bal = getBalance();
      const newBal = bal + dailyReward;
      setBalance(newBal);
      markClaimed('lux_daily_reward');
      dailyBtn.disabled = true;
      dailyBtn.textContent = 'Claimed';
      dailyBtn.style.opacity = '0.5';
      toast(`Received ${fmt(dailyReward)} USDT`);
    });
    // Lucky reward: random between 0 and 8 USDT
    if (!canClaim('lux_lucky_reward')) {
      luckyBtn.disabled = true;
      luckyBtn.textContent = 'Try Tomorrow';
      luckyBtn.style.opacity = '0.5';
    }
    luckyBtn?.addEventListener('click', () => {
      if (!canClaim('lux_lucky_reward')) {
        toast('Lucky bonus already claimed');
        return;
      }
      const reward = Math.floor(Math.random() * 9); // 0-8
      const bal = getBalance();
      setBalance(bal + reward);
      markClaimed('lux_lucky_reward');
      luckyBtn.disabled = true;
      luckyBtn.textContent = 'Try Tomorrow';
      luckyBtn.style.opacity = '0.5';
      toast(reward > 0 ? `You won ${fmt(reward)} USDT` : 'Better luck next time');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
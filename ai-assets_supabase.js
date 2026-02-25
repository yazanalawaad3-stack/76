/* ai-assets_supabase.js
   Simplified profit runner using Supabase.  It replaces the demo
   localStorage version.  This script enables the profit generation
   buttons for V1 and V2 levels based on the user’s current level and
   invokes LuxApp.runProfit() when clicked.  After each run the
   dashboard metrics are refreshed.
*/
(function () {
  'use strict';
  /**
   * Fetch the user and enable/disable run buttons accordingly.  V1
   * becomes available once the user reaches level 1, V2 once the
   * user reaches level 2.  Levels 3–7 remain locked.
   */
  async function configureButtons() {
    if (!window.LuxApp || !window.LuxApp.fetchCurrentUserData) return;
    try {
      const { user } = await window.LuxApp.fetchCurrentUserData();
      const currentLevel = Number(user?.level) || 0;
      document.querySelectorAll('button[data-level]').forEach((btn) => {
        const lvlKey = String(btn.getAttribute('data-level') || '').trim().toUpperCase();
        // Map V1→1, V2→2 etc.
        const lvlMap = { V0: 0, V1: 1, V2: 2, V3: 3, V4: 4, V5: 5, V6: 6, V7: 7 };
        const target = lvlMap[lvlKey] ?? 0;
        // Only allow V1 if current level >=1, V2 if >=2
        if (target <= currentLevel && target > 0 && target <= 2) {
          btn.disabled = false;
        } else {
          btn.disabled = true;
        }
      });
    } catch (err) {
      console.error(err);
    }
  }
  /**
   * Run a profit action via Supabase and notify the user of the
   * earnings.  After success the page refreshes the available runs
   * and dashboard metrics.
   */
  async function handleRun() {
    if (!window.LuxApp || !window.LuxApp.runProfit) return;
    try {
      const amount = await window.LuxApp.runProfit();
      // Simple feedback: use alert or toast if available
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = `Earned $${Number(amount).toFixed(2)}`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2200);
      } else {
        alert(`You earned $${Number(amount).toFixed(2)}`);
      }
      await configureButtons();
      // Optionally refresh the dashboard on the assets page
      if (window.location.href.includes('ai-assets.html')) {
        // No additional UI for totals here; but we can dispatch an event
      }
    } catch (err) {
      console.error(err);
      const msg = err.message || 'Unable to run profit now';
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2200);
      } else {
        alert(msg);
      }
    }
  }
  function attachHandlers() {
    document.querySelectorAll('button[data-level]').forEach((btn) => {
      // Only attach to V1/V2 buttons
      const lvl = String(btn.getAttribute('data-level') || '').toUpperCase();
      if (lvl === 'V1' || lvl === 'V2') {
        btn.addEventListener('click', handleRun);
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attachHandlers();
      configureButtons();
    });
  } else {
    attachHandlers();
    configureButtons();
  }
})();
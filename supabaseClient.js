/* supabaseClient.js
   Centralised helper for interacting with Supabase.  This file
   initialises the Supabase client, provides basic hashing, and
   exposes convenience functions for registering, logging in, fetching
   user data, handling deposits/withdrawals and running daily profit
   actions.  To activate Supabase in your app you must set
   SUPABASE_URL and SUPABASE_ANON_KEY to the values from your
   Supabase project.  These functions return Promises so they can
   easily be used with async/await in your page scripts.  No Arabic
   commentary is present in this file to preserve code clarity.
*/

(function () {
  'use strict';

  // Supabase configuration for your project.  These values are set
  // temporarily for development.  When deploying your own instance
  // replace them with your own API credentials.  See the project
  // dashboard under "Settings → API" for the correct values.
  const SUPABASE_URL = 'https://lcwppbfjzhyyskdbzahp.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjd3BwYmZqemh5eXNrZGJ6YWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODYwMDksImV4cCI6MjA4NzU2MjAwOX0.PWyYHrvyqP2jeCKsumbBwiyMfGVNXYpWnOQFwlmpp9Q';

  // Initialise the Supabase client.  This requires that the
  // @supabase/supabase-js library is loaded on the page via a
  // <script> tag.  If it is not available a warning is logged.
  const supabase = (window.supabase && typeof window.supabase.createClient === 'function')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
  if (!supabase) {
    console.warn('Supabase client was not initialised. Make sure the supabase-js script is loaded and SUPABASE_URL/ANON_KEY are configured.');
  }

  /**
   * Hashes a plain text password using SHA‑256.  This helper uses
   * the browser’s Crypto API to avoid external dependencies.  The
   * returned string is a hexadecimal representation of the hash.
   *
   * @param {string} password
   * @returns {Promise<string>}
   */
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password || '');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generates a random 7‑character invite code consisting of
   * uppercase Latin letters.  While the database enforces
   * uniqueness, callers should retry if a duplicate occurs.
   *
   * @returns {string}
   */
  function genInviteCode() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let out = '';
    for (let i = 0; i < 7; i++) {
      out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return out;
  }

  /**
   * Reads the current logged‑in user’s ID from localStorage.  See
   * setCurrentUser() for details on what keys are written.  Returns
   * null if no user is stored.
   *
   * @returns {string|null}
   */
  function getCurrentUserId() {
    const id = localStorage.getItem('user_id');
    return id || null;
  }

  /**
   * Persists user identification details to localStorage.  The
   * application uses this to remember the logged in user across
   * sessions.  It stores the raw UUID (`id`) and the 8‑digit
   * `user_code` separately.  Always call this after a successful
   * registration or login.
   *
   * @param {Object} user
   */
  function setCurrentUser(user) {
    if (!user) return;
    if (user.id) {
      localStorage.setItem('user_id', user.id);
    }
    if (user.user_code) {
      localStorage.setItem('user_code', String(user.user_code));
    }
    if (user.invite_code) {
      localStorage.setItem('invite_code', String(user.invite_code));
    }
  }

  /**
   * Performs the user registration flow.  This function
   * communicates with Supabase to create a new row in the `users`
   * table, generate a unique referral code, issue the signup bonus via
   * the ledger and return the created user.  It handles all
   * necessary hashing and error propagation.  If an invite code is
   * provided it will be recorded as the `referred_by` value.
   *
   * @param {Object} opts
   * @param {string} opts.phone
   * @param {string} opts.password
   * @param {string} [opts.inviteCode]
   * @returns {Promise<Object>}
   */
  async function registerUser({ phone, password, inviteCode }) {
    if (!supabase) throw new Error('Supabase client not initialised');
    // Hash the password client‑side.  In a real application you
    // should never store plain passwords in the database.
    const passwordHash = await hashPassword(password);
    // Request an 8‑digit user_code from the database via RPC.
    const { data: codeData, error: codeErr } = await supabase.rpc('generate_random_code');
    if (codeErr) throw codeErr;
    const userCode = codeData;
    // Create a unique invite code.  We attempt to insert the user
    // repeatedly until Supabase accepts the code.  This loop avoids
    // collisions on the invite_code unique constraint.
    let newUser = null;
    let invite = genInviteCode();
    let attempt = 0;
    const maxAttempts = 5;
    while (attempt < maxAttempts && !newUser) {
      const { data, error } = await supabase.from('users').insert({
        phone: phone,
        password_hash: passwordHash,
        user_code: userCode,
        invite_code: invite,
        referred_by: inviteCode || null
      }).select().single();
      if (error) {
        // If the insert failed because of a duplicate invite code try again.
        if (String(error.message || '').toLowerCase().includes('duplicate') && attempt < maxAttempts - 1) {
          invite = genInviteCode();
          attempt++;
          continue;
        }
        throw error;
      }
      newUser = data;
    }
    if (!newUser) throw new Error('Unable to register user');
    // Insert the signup bonus into the ledger.  We do this after
    // creation so the trigger updates the real_balance.
    const { error: ledgerErr } = await supabase.from('ledger').insert({
      user_id: newUser.id,
      entry_type: 'signup_bonus',
      amount: 4.00,
      description: 'Signup bonus'
    });
    if (ledgerErr) throw ledgerErr;
    return newUser;
  }

  /**
   * Logs a user in by verifying their phone and hashed password.  On
   * success the user object is returned.  If the credentials do not
   * match any record an exception is thrown.  This function does not
   * manage sessions — localStorage is used externally to persist
   * identity.
   *
   * @param {Object} opts
   * @param {string} opts.phone
   * @param {string} opts.password
   * @returns {Promise<Object>}
   */
  async function loginUser({ phone, password }) {
    if (!supabase) throw new Error('Supabase client not initialised');
    const passwordHash = await hashPassword(password);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .eq('password_hash', passwordHash)
      .single();
    if (error || !data) {
      throw new Error('Invalid phone or password');
    }
    return data;
  }

  /**
   * Fetches the current user along with computed income statistics.
   * Today’s and total profits as well as team bonuses are derived
   * from the ledger table on the fly.  The returned object has the
   * shape { user, todayIncome, totalIncome, teamIncome,
   * teamTotalIncome }.
   *
   * @returns {Promise<Object>}
   */
  async function fetchCurrentUserData() {
    if (!supabase) throw new Error('Supabase client not initialised');
    const userId = getCurrentUserId();
    if (!userId) throw new Error('No user logged in');
    const { data: user, error: userErr } = await supabase.from('users').select('*').eq('id', userId).single();
    if (userErr || !user) throw userErr || new Error('User not found');
    // Pull all ledger entries for this user.  In a production
    // environment you might filter server‑side instead to reduce
    // bandwidth.
    const { data: ledgerEntries, error: ledgerErr } = await supabase.from('ledger')
      .select('entry_type, amount, created_at')
      .eq('user_id', userId);
    if (ledgerErr) throw ledgerErr;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let todayIncome = 0;
    let totalIncome = 0;
    let teamIncome = 0;
    let teamTotalIncome = 0;
    ledgerEntries.forEach((row) => {
      const created = row.created_at ? new Date(row.created_at) : null;
      if (row.entry_type === 'profit') {
        totalIncome += Number(row.amount);
        if (created && created >= startOfToday) {
          todayIncome += Number(row.amount);
        }
      } else if (row.entry_type === 'team_bonus') {
        teamTotalIncome += Number(row.amount);
        if (created && created >= startOfToday) {
          teamIncome += Number(row.amount);
        }
      }
    });
    return { user, todayIncome, totalIncome, teamIncome, teamTotalIncome };
  }

  /**
   * Returns (and if necessary creates) a deposit address for the
   * current user on the specified network.  When no address exists a
   * random hexadecimal string is generated and stored in
   * `wallet_addresses`.  Note that this function does not interact
   * with any blockchain provider — for real systems you would
   * integrate with an on‑chain address management API instead.
   *
   * @param {string} [network='BEP20']
   * @returns {Promise<string>}
   */
  async function getDepositAddress(network = 'BEP20') {
    if (!supabase) throw new Error('Supabase client not initialised');
    const userId = getCurrentUserId();
    if (!userId) throw new Error('No user logged in');
    const { data: existing, error: err1 } = await supabase
      .from('wallet_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('network', network)
      .single();
    if (existing && !err1) {
      return existing.address;
    }
    // Generate a pseudo address (42 hex characters with 0x prefix)
    const randomHex = () => {
      let h = '0x';
      const chars = '0123456789abcdef';
      for (let i = 0; i < 40; i++) {
        h += chars[Math.floor(Math.random() * chars.length)];
      }
      return h;
    };
    const addr = randomHex();
    const { data: inserted, error: err2 } = await supabase.from('wallet_addresses').insert({
      user_id: userId,
      network: network,
      address: addr
    }).select().single();
    if (err2 || !inserted) throw err2 || new Error('Failed to create address');
    return inserted.address;
  }

  /**
   * Requests a withdrawal on behalf of the current user.  This
   * function enforces the minimum amount (20 USDT) and applies the
   * configured fee (5%).  It inserts ledger entries to debit the
   * user’s balance and create a `withdrawal` record with status
   * 'pending'.  The calling page should enforce the three‑day waiting
   * period — that logic is left to the UI layer.
   *
   * @param {Object} opts
   * @param {number} opts.amount
   * @param {string} opts.address
   * @param {string} [opts.network='BEP20']
   * @returns {Promise<Object>}
   */
  async function requestWithdraw({ amount, address, network = 'BEP20' }) {
    if (!supabase) throw new Error('Supabase client not initialised');
    const userId = getCurrentUserId();
    if (!userId) throw new Error('No user logged in');
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) throw new Error('Invalid amount');
    // Minimum withdrawal amount is enforced by the schema (level
    // constraints) but we check here for UI convenience.
    if (amt < 20) throw new Error('Minimum withdrawal is 20 USDT');
    const feeRate = 0.05;
    const fee = Number((amt * feeRate).toFixed(2));
    const net = Number((amt - fee).toFixed(2));
    // Insert the withdrawal request
    const { data: withdrawal, error: wErr } = await supabase.from('withdrawals').insert({
      user_id: userId,
      network: network,
      address: address,
      amount: amt,
      fee: fee,
      net_amount: net
    }).select().single();
    if (wErr || !withdrawal) throw wErr || new Error('Failed to create withdrawal');
    // Insert ledger entries: withdrawal (negative) and fee (negative)
    const { error: ledgerErr } = await supabase.from('ledger').insert([
      {
        user_id: userId,
        entry_type: 'withdrawal',
        amount: amt,
        description: 'User withdrawal',
        related_id: withdrawal.id
      },
      {
        user_id: userId,
        entry_type: 'withdrawal_fee',
        amount: fee,
        description: 'Withdrawal fee',
        related_id: withdrawal.id
      }
    ]);
    if (ledgerErr) throw ledgerErr;
    return withdrawal;
  }

  /**
   * Runs a single profit action for the current user.  It validates
   * that the user has not exceeded their daily run limit, calculates
   * the per‑run profit using the user’s current level, inserts
   * rows into user_activity and the ledger, and allocates team
   * bonuses up the referral chain.  Returns the profit amount.
   *
   * @returns {Promise<number>}
   */
  async function runProfit() {
    if (!supabase) throw new Error('Supabase client not initialised');
    const userId = getCurrentUserId();
    if (!userId) throw new Error('No user logged in');
    // Fetch user and level
    const { data: user, error: userErr } = await supabase.from('users').select('*').eq('id', userId).single();
    if (userErr || !user) throw userErr || new Error('User not found');
    const levelId = user.level || 0;
    const { data: level, error: levelErr } = await supabase.from('levels').select('*').eq('level', levelId).single();
    if (levelErr || !level) throw levelErr || new Error('Level configuration missing');
    // Determine how many runs have been made today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const { data: runs, error: runsErr } = await supabase.from('user_activity')
      .select('id, run_date, created_at')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString());
    if (runsErr) throw runsErr;
    const runsCount = runs ? runs.length : 0;
    const allowedRuns = level.daily_clicks || 0;
    if (allowedRuns === 0) throw new Error('Your current level does not support profit runs');
    if (runsCount >= allowedRuns) throw new Error('Daily run limit reached');
    // Compute per‑run profit: total daily percentage / number of runs
    const pct = Number(level.profit_percentage || 0);
    const amount = Number(user.real_balance);
    const perRunProfit = Number(((amount * (pct / 100)) / allowedRuns).toFixed(2));
    if (perRunProfit <= 0) throw new Error('No balance available to generate profit');
    // Insert user activity
    const { data: activity, error: actErr } = await supabase.from('user_activity').insert({
      user_id: userId,
      level: levelId,
      run_date: startOfDay.toISOString().slice(0, 10),
      run_count: 1,
      profit: perRunProfit
    }).select().single();
    if (actErr || !activity) throw actErr || new Error('Failed to record activity');
    // Insert ledger entry for the profit
    const { error: ledgerErr } = await supabase.from('ledger').insert({
      user_id: userId,
      entry_type: 'profit',
      amount: perRunProfit,
      description: `Profit run ${runsCount + 1}`,
      related_id: activity.id
    });
    if (ledgerErr) throw ledgerErr;
    // Allocate team bonuses up to the configured network depth
    const depth = level.network_depth || 0;
    if (depth > 0) {
      // Ascend the referral chain.  The `referred_by` field stores
      // the invite code of the direct inviter.  We need to find the
      // user associated with that code and repeat for each level.
      let currentInvite = user.referred_by;
      for (let gen = 1; gen <= depth && currentInvite; gen++) {
        const { data: inviter, error: invErr } = await supabase.from('users')
          .select('id, invite_code, referred_by')
          .eq('invite_code', currentInvite)
          .single();
        if (invErr || !inviter) break;
        // Determine bonus percentage by generation
        let bonusPct = 0;
        if (gen === 1) bonusPct = 0.20; // 20%
        else if (gen === 2) bonusPct = 0.04; // 4%
        else if (gen === 3) bonusPct = 0.02; // 2%
        else if (gen === 4) bonusPct = 0.01; // 1%
        if (bonusPct > 0) {
          const bonusAmt = Number((perRunProfit * bonusPct).toFixed(2));
          // Insert a team_bonus row
          const { data: tb, error: tbErr } = await supabase.from('team_bonus').insert({
            user_id: inviter.id,
            from_user_id: userId,
            generation: gen,
            amount: bonusAmt,
            activity_id: activity.id
          }).select().single();
          if (!tbErr && tb) {
            // Credit the inviter via the ledger
            await supabase.from('ledger').insert({
              user_id: inviter.id,
              entry_type: 'team_bonus',
              amount: bonusAmt,
              description: `Team bonus from generation ${gen}`,
              related_id: activity.id
            });
          }
        }
        currentInvite = inviter.referred_by || null;
      }
    }
    return perRunProfit;
  }

  // Expose the helpers on a global object.  Page scripts can call
  // window.LuxApp.registerUser(), etc.  This avoids polluting the
  // global namespace with many individual functions.
  window.LuxApp = {
    supabase,
    hashPassword,
    genInviteCode,
    getCurrentUserId,
    setCurrentUser,
    registerUser,
    loginUser,
    fetchCurrentUserData,
    getDepositAddress,
    requestWithdraw,
    runProfit
  };
})();

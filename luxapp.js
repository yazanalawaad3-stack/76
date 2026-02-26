(function () {
  "use strict";

  var SUPABASE_URL = "https://lcwppbfjzhyyskdbzahp.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjd3BwYmZqemh5eXNrZGJ6YWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODYwMDksImV4cCI6MjA4NzU2MjAwOX0.PWyYHrvyqP2jeCKsumbBwiyMfGVNXYpWnOQFwlmpp9Q";

  function assertDeps() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase client not loaded");
    }
    if (!window.bcrypt) {
      throw new Error("bcryptjs not loaded");
    }
  }

  function getClient() {
    assertDeps();
    if (!window.__sbClient) {
      window.__sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return window.__sbClient;
  }

  function normalizeInvite(code) {
    return String(code || "").trim().toUpperCase();
  }

  function normalizePhone(phone) {
    return String(phone || "").trim();
  }

  function isValidInviteFormat(code) {
    return /^[A-Z]{7}$/.test(code);
  }

  async function findReferrerByInvite(inviteCode) {
    var sb = getClient();
    var code = normalizeInvite(inviteCode);
    var q = sb.from("users").select("id").eq("invitation_code", code).limit(1);
    var res = await q;
    if (res.error) throw new Error(res.error.message || "Invite lookup failed");
    if (!res.data || res.data.length === 0) return null;
    return res.data[0];
  }

  async function userExistsByPhone(phone) {
    var sb = getClient();
    var p = normalizePhone(phone);
    var res = await sb.from("users").select("id").eq("phone_number", p).limit(1);
    if (res.error) throw new Error(res.error.message || "Phone lookup failed");
    return Array.isArray(res.data) && res.data.length > 0;
  }

  async function insertUserRow(params) {
    var sb = getClient();
    var res = await sb
      .from("users")
      .insert({
        phone_number: params.phone,
        password_hash: params.password_hash,
        referral_id: params.referral_id,
        membership_level: 0,
        bonus_awarded: true
      })
      .select("id, display_id, phone_number, invitation_code, membership_level")
      .single();

    if (res.error) throw new Error(res.error.message || "User insert failed");
    return res.data;
  }

  async function ensureBalanceAndBonus(userId, bonusAmount) {
    var sb = getClient();

    var resBal = await sb
      .from("user_balances")
      .insert({ user_id: userId, balance: bonusAmount })
      .select("user_id, balance")
      .single();

    if (resBal.error) throw new Error(resBal.error.message || "Balance insert failed");

    var resLed = await sb
      .from("ledger")
      .insert({
        user_id: userId,
        type: "registration_bonus",
        amount: bonusAmount,
        description: "Signup bonus",
        balance_after: bonusAmount
      });

    if (resLed.error) throw new Error(resLed.error.message || "Ledger insert failed");

    return { balance: resBal.data.balance };
  }

  async function registerUser(input) {
    var phone = normalizePhone(input && input.phone);
    var password = String(input && input.password || "").trim();
    var inviteCode = normalizeInvite(input && input.inviteCode);

    if (!phone) throw new Error("Phone is required");
    if (!password || password.length < 6) throw new Error("Password is invalid");
    if (!inviteCode) throw new Error("Invite code is required");
    if (!isValidInviteFormat(inviteCode)) throw new Error("Invite code format is invalid");

    var exists = await userExistsByPhone(phone);
    if (exists) throw new Error("Phone already registered");

    var ref = await findReferrerByInvite(inviteCode);
    if (!ref) throw new Error("Invite code not found");

    var salt = window.bcrypt.genSaltSync(10);
    var hash = window.bcrypt.hashSync(password, salt);

    var user = await insertUserRow({
      phone: phone,
      password_hash: hash,
      referral_id: ref.id
    });

    await ensureBalanceAndBonus(user.id, 4.0);

    return user;
  }

  function setCurrentUser(user) {
    try {
      localStorage.setItem("lux_current_user", JSON.stringify(user || null));
    } catch (e) {}
  }

  function getCurrentUser() {
    try {
      var raw = localStorage.getItem("lux_current_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  window.LuxApp = {
    client: getClient,
    registerUser: registerUser,
    setCurrentUser: setCurrentUser,
    getCurrentUser: getCurrentUser
  };
})();
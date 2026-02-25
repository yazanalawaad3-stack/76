/* Register page behavior
   - Keeps existing UI/HTML/CSS unchanged
   - Validates: confirm password, captcha match, invite code (basic)
   - Phone number is collected but NOT verified
   - Prepared for future Supabase integration (stub)
*/

(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function safeTrim(v) {
    return (v || "").toString().trim();
  }

  function showError(message) {
    // Minimal UI impact: use alert for now
    alert(message);
  }

  function showSuccess(message) {
    alert(message);
  }

  // Toggle password visibility for any password input with eye icon
  function setupPasswordToggles() {
    document.querySelectorAll(".toggle-password").forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        var targetId = this.getAttribute("data-target");
        var input = $(targetId);
        if (!input) return;

        if (input.type === "password") {
          input.type = "text";
          this.innerHTML =
            '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 5c-5 0-9.27 3.11-11 7.5 1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5zm0 12c-3.33 0-6.21-2.05-7.54-5 1.33-2.95 4.21-5 7.54-5 3.33 0 6.21 2.05 7.54 5-1.33 2.95-4.21 5-7.54 5z"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="2"/></svg>';
        } else {
          input.type = "password";
          this.innerHTML =
            '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 5c-5 0-9.27 3.11-11 7.5 1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5zm0 12c-3.33 0-6.21-2.05-7.54-5 1.33-2.95 4.21-5 7.54-5 3.33 0 6.21 2.05 7.54 5-1.33 2.95-4.21 5-7.54 5z"/><circle cx="12" cy="12" r="3"/></svg>';
        }
      });
    });
  }

  // Generate a random 4-digit captcha and refresh on click
  function generateCaptcha() {
    var digits = Math.floor(1000 + Math.random() * 9000);
    var el = $("captchaImage");
    if (el) el.textContent = String(digits);
  }

  // Enable register button only when agreement checkbox is ticked
  function setupAgreementToggle() {
    var agreeBox = $("agree");
    var submitBtn = $("submitBtn");
    if (!agreeBox || !submitBtn) return;

    function toggleSubmit() {
      submitBtn.disabled = !agreeBox.checked;
    }

    agreeBox.addEventListener("change", toggleSubmit);
    toggleSubmit();
  }

  // Initialize international phone input after the library script loads
  function initPhoneInput() {
    if (!window.intlTelInput) {
      setTimeout(initPhoneInput, 100);
      return;
    }

    var phoneField = $("phone");
    if (!phoneField) return;

    window.__itiRegister = window.intlTelInput(phoneField, {
      initialCountry: "auto",
      separateDialCode: true,
      utilsScript:
        "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
      geoIpLookup: function (callback) {
        fetch("https://ipapi.co/json/")
          .then(function (resp) {
            return resp.json();
          })
          .then(function (data) {
            if (data && data.country_code) {
              callback(String(data.country_code).toLowerCase());
            } else {
              callback("lb");
            }
          })
          .catch(function () {
            callback("lb");
          });
      },
    });
  }

  // Basic invite code validation placeholder (no server check yet)
  function validateInviteCode(inviteCode) {
    // Requirement: validate invite code only (no phone verification).
    // For now: require non-empty and min length. Replace with DB check later.
    var code = safeTrim(inviteCode);
    if (!code) return { ok: false, reason: "Invite code is required." };
    if (code.length < 4)
      return { ok: false, reason: "Invite code is too short." };
    return { ok: true };
  }

  function getPhoneE164OrRaw() {
    var phoneInput = $("phone");
    if (!phoneInput) return "";

    try {
      if (window.__itiRegister && window.__itiRegister.getNumber) {
        var n = window.__itiRegister.getNumber();
        return safeTrim(n) || safeTrim(phoneInput.value);
      }
    } catch (e) {}

    return safeTrim(phoneInput.value);
  }

  function validateCaptcha(inputValue) {
    var entered = safeTrim(inputValue);
    var shown = safeTrim(($("captchaImage") || {}).textContent);
    if (!entered) return { ok: false, reason: "Captcha is required." };
    if (!shown) return { ok: false, reason: "Captcha is not ready. Refresh it." };
    if (entered !== shown) return { ok: false, reason: "Captcha is incorrect." };
    return { ok: true };
  }

  function validatePasswords(pass, confirm) {
    var p = safeTrim(pass);
    var c = safeTrim(confirm);
    if (!p) return { ok: false, reason: "Password is required." };
    if (p.length < 6)
      return { ok: false, reason: "Password must be at least 6 characters." };
    if (p !== c) return { ok: false, reason: "Passwords do not match." };
    return { ok: true };
  }

  // Future Supabase integration (stub)
  async function saveRegistrationToSupabase(payload) {
    // TODO: integrate later:
    // 1) Include supabase-js
    // 2) Initialize client:
    //    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    // 3) Insert into a table (e.g. "users_pending"):
    //    await supabase.from("users_pending").insert(payload)
    // For now we just return a resolved response.
    return { ok: true, data: payload };
  }

  function setupFormSubmit() {
    var form = document.querySelector("form");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      var phone = getPhoneE164OrRaw();
      var password = safeTrim(($("password") || {}).value);
      var confirm = safeTrim(($("confirm") || {}).value);
      var invite = safeTrim(($("invite") || {}).value);
      var captcha = safeTrim(($("captcha") || {}).value);

      var pwCheck = validatePasswords(password, confirm);
      if (!pwCheck.ok) return showError(pwCheck.reason);

      var capCheck = validateCaptcha(captcha);
      if (!capCheck.ok) {
        generateCaptcha();
        return showError(capCheck.reason);
      }

      var inviteCheck = validateInviteCode(invite);
      if (!inviteCheck.ok) return showError(inviteCheck.reason);

      var payload = {
        phone: phone,
        password: password,
        invite_code: invite,
        created_at: new Date().toISOString(),
      };

      // Expose payload for debugging / future wiring
      window.__registerPayload = payload;

      var btn = $("submitBtn");
      if (btn) btn.disabled = true;

      try {
        var res = await saveRegistrationToSupabase(payload);
        if (!res || res.ok !== true) {
          if (btn) btn.disabled = false;
          generateCaptcha();
          return showError("Registration failed. Try again.");
        }

        showSuccess("Registered (prepared). You can now connect Supabase.");
        form.reset();
        setupAgreementToggle();
        generateCaptcha();
      } catch (err) {
        if (btn) btn.disabled = false;
        generateCaptcha();
        showError("Unexpected error. Try again.");
      }
    });
  }

  function boot() {
    var cap = $("captchaImage");
    if (cap) cap.addEventListener("click", generateCaptcha);

    generateCaptcha();
    setupAgreementToggle();
    setupPasswordToggles();
    initPhoneInput();
    setupFormSubmit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

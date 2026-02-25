/* Configuration */
const SUPABASE_URL = "https://rbydkgzxwjomvepbgwbh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieWRrZ3p4d2pvbXZlcGJnd2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Nzg1MjAsImV4cCI6MjA4NzU1NDUyMH0.nfnyB5FfPVFYAkFXhCSjxqXJGuu6RdRgxjbWygFeRLg";

/* Redirect after success */
const REDIRECT_TO = "myassets.html";

/* UI helpers */
function setError(msg) {
  const el = document.getElementById("formError");
  if (!el) return;
  el.textContent = msg || "";
  el.style.display = msg ? "block" : "none";
}

function setLoading(isLoading) {
  const btn = document.getElementById("submitBtn");
  if (!btn) return;
  btn.disabled = isLoading || !document.getElementById("agree")?.checked;
  btn.textContent = isLoading ? "Registering..." : "Register";
}

function random4Digit() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/* Password toggles */
function setupPasswordToggles() {
  document.querySelectorAll(".toggle-password").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const targetId = toggle.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;

      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";

      toggle.innerHTML = isHidden
        ? '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 5c-5 0-9.27 3.11-11 7.5 1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5zm0 12c-3.33 0-6.21-2.05-7.54-5 1.33-2.95 4.21-5 7.54-5 3.33 0 6.21 2.05 7.54 5-1.33 2.95-4.21 5-7.54 5z"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="2"/></svg>'
        : '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 5c-5 0-9.27 3.11-11 7.5 1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5zm0 12c-3.33 0-6.21-2.05-7.54-5 1.33-2.95 4.21-5 7.54-5 3.33 0 6.21 2.05 7.54 5-1.33 2.95-4.21 5-7.54 5z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  });
}

/* Intl tel input */
function initPhoneInput() {
  const phoneField = document.querySelector("#phone");
  if (!phoneField) return null;

  if (!window.intlTelInput) {
    setTimeout(initPhoneInput, 100);
    return null;
  }

  const iti = window.intlTelInput(phoneField, {
    initialCountry: "auto",
    separateDialCode: true,
    utilsScript:
      "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
    geoIpLookup: (callback) => {
      fetch("https://ipapi.co/json/")
        .then((resp) => resp.json())
        .then((data) => {
          callback((data?.country_code || "lb").toLowerCase());
        })
        .catch(() => callback("lb"));
    },
  });

  return iti;
}

/* Captcha */
function setupCaptcha() {
  const img = document.getElementById("captchaImage");
  const input = document.getElementById("captcha");
  if (!img || !input) return;

  const refresh = () => {
    img.textContent = random4Digit();
    input.value = "";
  };

  img.addEventListener("click", refresh);
  refresh();
}

/* Agreement */
function setupAgreement() {
  const agreeBox = document.getElementById("agree");
  const submitBtn = document.getElementById("submitBtn");
  if (!agreeBox || !submitBtn) return;

  const toggleSubmit = () => {
    if (submitBtn.dataset.loading === "1") return;
    submitBtn.disabled = !agreeBox.checked;
  };

  agreeBox.addEventListener("change", toggleSubmit);
  toggleSubmit();
}

/* Validate invite code exists */
async function validateInviteCode(supabase, code) {
  const trimmed = (code || "").trim();
  if (!trimmed) return true;

  const { data, error } = await supabase
    .from("profiles")
    .select("invite_code")
    .eq("invite_code", trimmed)
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data.length === 1;
}

/* Main register handler */
async function handleRegister(e, iti) {
  e.preventDefault();
  setError("");

  const phoneEl = document.getElementById("phone");
  const passEl = document.getElementById("password");
  const confirmEl = document.getElementById("confirm");
  const inviteEl = document.getElementById("invite");
  const captchaEl = document.getElementById("captcha");
  const captchaImg = document.getElementById("captchaImage");

  const phoneRaw = phoneEl?.value?.trim() || "";
  const password = passEl?.value || "";
  const confirm = confirmEl?.value || "";
  const invite = inviteEl?.value?.trim() || "";
  const captcha = captchaEl?.value?.trim() || "";
  const captchaExpected = captchaImg?.textContent?.trim() || "";

  if (!captcha || captcha !== captchaExpected) {
    setError("Captcha is incorrect.");
    return;
  }

  if (password.length < 6) {
    setError("Password must be at least 6 characters.");
    return;
  }

  if (password !== confirm) {
    setError("Passwords do not match.");
    return;
  }

  const phoneE164 = iti?.getNumber ? iti.getNumber() : phoneRaw;
  if (!phoneE164 || phoneE164.length < 6) {
    setError("Phone number is invalid.");
    return;
  }

  if (SUPABASE_URL === "YOUR_SUPABASE_URL" || SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY") {
    setError("Supabase config is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in register.js.");
    return;
  }

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  setLoading(true);
  document.getElementById("submitBtn").dataset.loading = "1";

  try {
    const ok = await validateInviteCode(supabase, invite);
    if (!ok) {
      setError("Invite code is invalid.");
      return;
    }

    const email = `${phoneE164.replace(/\D/g, "")}@local.invalid`;

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) throw signUpError;

    const userId = signUpData?.user?.id;
    if (!userId) {
      setError("Registration succeeded, but user id is missing.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: userId,
      phone: phoneE164,
      referred_by_code: invite || null,
    });

    if (profileError) throw profileError;

    window.location.href = REDIRECT_TO;
  } catch (err) {
    const msg = err?.message || "Registration failed.";
    setError(msg);
  } finally {
    setLoading(false);
    document.getElementById("submitBtn").dataset.loading = "0";
  }
}

/* Boot */
window.addEventListener("load", () => {
  setupPasswordToggles();
  setupCaptcha();
  setupAgreement();

  const iti = initPhoneInput();

  const form = document.querySelector("form");
  if (form) {
    form.addEventListener("submit", (e) => handleRegister(e, iti));
  }
});

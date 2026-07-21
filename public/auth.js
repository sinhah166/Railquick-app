// auth.js
// Supabase Authentication Logic for RailQuick

const SUPABASE_URL = "https://czibjqgtafvdivompfin.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JypP4hTbuBTbwsejs6rmmw_zev1g28Y";
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Ensure state is up to date on load
document.addEventListener("DOMContentLoaded", async () => {
  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    updateAuthState(session);

    supabaseClient.auth.onAuthStateChange((event, session) => {
      updateAuthState(session);
    });
  }
});

function updateAuthState(session) {
  const authBtnText = document.getElementById("sidebar-auth-text");
  const authBtnIcon = document.getElementById("sidebar-auth-icon");
  
  if (session && session.user) {
    if (typeof appState !== 'undefined') appState.user = session.user;
    
    if (authBtnText) authBtnText.innerText = "Logout";
    if (authBtnIcon) authBtnIcon.innerText = "logout";
    
    const displayName = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
    const profileNameEl = document.getElementById("display-name") || document.querySelector("#page-account .text-xl.font-black");
    if (profileNameEl) profileNameEl.innerText = displayName;
    
    const profilePhoneEl = document.getElementById("display-phone") || document.querySelector("#page-account .text-sm.text-gray-500");
    if (profilePhoneEl) profilePhoneEl.innerText = session.user.email;
    
  } else {
    if (typeof appState !== 'undefined') appState.user = null;
    
    if (authBtnText) authBtnText.innerText = "Login";
    if (authBtnIcon) authBtnIcon.innerText = "login";
    
    const profileNameEl = document.getElementById("display-name") || document.querySelector("#page-account .text-xl.font-black");
    if (profileNameEl) profileNameEl.innerText = "Guest User";
    
    const profilePhoneEl = document.getElementById("display-phone") || document.querySelector("#page-account .text-sm.text-gray-500");
    if (profilePhoneEl) profilePhoneEl.innerText = "Not logged in";
  }
}

window.handleSidebarAuthClick = function() {
  if (typeof appState !== 'undefined' && appState.user) {
    signOut();
  } else {
    openAuthModal();
  }
};

window.openAuthModal = function() {
  document.getElementById("modal-auth").classList.remove("hidden");
  switchAuthTab('login');
  document.getElementById("auth-error-msg").classList.add("hidden");
  document.getElementById("auth-success-msg").classList.add("hidden");
};

window.closeAuthModal = function() {
  document.getElementById("modal-auth").classList.add("hidden");
};

window.switchAuthTab = function(tab) {
  const loginForm = document.getElementById("auth-login-form");
  const signupForm = document.getElementById("auth-signup-form");
  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");
  
  document.getElementById("auth-error-msg").classList.add("hidden");
  document.getElementById("auth-success-msg").classList.add("hidden");

  if (tab === 'login') {
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
    tabLogin.className = "flex-1 py-2 text-sm font-bold rounded-lg bg-white shadow-sm text-primary transition-all";
    tabSignup.className = "flex-1 py-2 text-sm font-bold rounded-lg text-slate-500 hover:text-slate-700 transition-all";
  } else {
    loginForm.classList.add("hidden");
    signupForm.classList.remove("hidden");
    tabSignup.className = "flex-1 py-2 text-sm font-bold rounded-lg bg-white shadow-sm text-primary transition-all";
    tabLogin.className = "flex-1 py-2 text-sm font-bold rounded-lg text-slate-500 hover:text-slate-700 transition-all";
  }
};

function showAuthError(msg) {
  const errEl = document.getElementById("auth-error-msg");
  errEl.innerText = msg;
  errEl.classList.remove("hidden");
  document.getElementById("auth-success-msg").classList.add("hidden");
}

function showAuthSuccess(msg) {
  const succEl = document.getElementById("auth-success-msg");
  succEl.innerText = msg;
  succEl.classList.remove("hidden");
  document.getElementById("auth-error-msg").classList.add("hidden");
}

window.sendLoginOTP = async function() {
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  if (!email) return showAuthError("Enter a valid email address.");
  
  const btn = document.getElementById("login-send-otp-btn");
  btn.innerText = 'Sending...';
  btn.disabled = true;
  
  try {
    const { data, error } = await sendEmailOTP(email);
    if (error) throw error;
    
    document.getElementById("login-step-1").classList.add("hidden");
    document.getElementById("login-step-2").classList.remove("hidden");
    showAuthSuccess("OTP sent to your email!");
    
  } catch (err) {
    showAuthError(err.message || "Failed to send OTP.");
  } finally {
    btn.innerText = 'Send OTP to Email';
    btn.disabled = false;
  }
};

window.verifyLoginOTP = async function() {
  const otp = document.getElementById("login-otp").value.trim();
  if (otp.length !== 6) return showAuthError("Enter a valid 6-digit OTP.");
  
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  
  const btn = document.getElementById("login-verify-otp-btn");
  btn.innerText = 'Verifying...';
  btn.disabled = true;
  
  try {
    const { data, error } = await verifyEmailOTP(email, otp);
    if (error) throw error;
    
    const clerk = window.clerkInstance || window.Clerk;
    let name = 'User';
    if (clerk && clerk.user) {
        name = clerk.user.fullName || clerk.user.firstName || clerk.user.username || name;
    }

    if (typeof appState !== 'undefined') {
      appState.user = {
        name: name,
        email: email,
        phone: '',
        dob: '',
        avatarUrl: clerk?.user?.imageUrl || '',
        avatar: name[0].toUpperCase(),
        provider: 'clerk_email',
        clerkId: clerk?.user?.id || 'clk_' + email,
        loginAt: new Date().toISOString()
      };
      
      const userId = appState.user.clerkId;
      const savedName = localStorage.getItem('railquick_profile_name_' + userId);
      const savedPhone = localStorage.getItem('railquick_profile_phone_' + userId);
      const savedDob = localStorage.getItem('railquick_profile_dob_' + userId);
      
      if (savedName) {
        appState.user.name = savedName;
        name = savedName;
      }
      if (savedPhone) appState.user.phone = savedPhone;
      if (savedDob) appState.user.dob = savedDob;

      localStorage.setItem('railquick_custom_profile_name', appState.user.name);
      localStorage.setItem('railquick_custom_profile_phone', appState.user.phone || '');
      localStorage.setItem('railquick_custom_profile_dob', appState.user.dob || '');

      saveState();
      initAccountPage();
    }
    
    closeAuthModal();
    
    const returnPage = localStorage.getItem('railquick_return_after_login') || 'page-account';
    if (typeof navigateTo === 'function') navigateTo(returnPage);
    
    if (typeof showToast === "function") showToast("Logged in successfully!", "success");
    
  } catch (err) {
    showAuthError(err.message || "Invalid or expired OTP.");
  } finally {
    btn.innerText = 'Verify & Log In';
    btn.disabled = false;
  }
};

window.sendSignupOTP = async function() {
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const btn = document.getElementById("signup-send-otp-btn");
  
  if (!name || !email) return showAuthError("Please enter your name and email.");
  
  btn.innerText = 'Sending...';
  btn.disabled = true;
  
  try {
    const { data, error } = await sendEmailOTP(email);
    if (error) throw error;
    
    document.getElementById("signup-step-1").classList.add("hidden");
    document.getElementById("signup-step-2").classList.remove("hidden");
    showAuthSuccess("OTP sent to your email!");
    
  } catch (err) {
    showAuthError(err.message || "Failed to send OTP.");
  } finally {
    btn.innerText = 'Send OTP to Email';
    btn.disabled = false;
  }
};

window.verifySignupOTP = async function() {
  const otp = document.getElementById("signup-otp").value.trim();
  if (otp.length !== 6) return showAuthError("Enter a valid 6-digit OTP.");
  
  const email = document.getElementById("signup-email").value.trim().toLowerCase();
  const name = document.getElementById("signup-name").value.trim();
  const btn = document.getElementById("signup-verify-otp-btn");
  
  btn.innerText = 'Verifying...';
  btn.disabled = true;
  
  try {
    const { data, error } = await verifyEmailOTP(email, otp);
    if (error) throw error;
    
    // Successfully verified, set state in app.js
    if (typeof appState !== 'undefined') {
      appState.user = {
        name: name,
        email: email,
        phone: '',
        dob: '',
        avatarUrl: '',
        avatar: name[0].toUpperCase(),
        provider: 'supabase',
        clerkId: 'sb_' + email,
        loginAt: new Date().toISOString()
      };
      
      const userId = appState.user.clerkId;
      const savedName = localStorage.getItem('railquick_profile_name_' + userId);
      const savedPhone = localStorage.getItem('railquick_profile_phone_' + userId);
      const savedDob = localStorage.getItem('railquick_profile_dob_' + userId);
      
      if (savedName) {
        appState.user.name = savedName;
        name = savedName;
      }
      if (savedPhone) appState.user.phone = savedPhone;
      if (savedDob) appState.user.dob = savedDob;

      localStorage.setItem('railquick_custom_profile_name', appState.user.name);
      localStorage.setItem('railquick_custom_profile_phone', appState.user.phone || '');
      localStorage.setItem('railquick_custom_profile_dob', appState.user.dob || '');

      saveState();
      initAccountPage();
    }
    
    closeAuthModal();
    if (typeof showToast === "function") showToast(`Welcome, ${name}! 🎉`, 'success');
    
  } catch (err) {
    showAuthError(err.message || "Invalid or expired OTP");
    btn.innerText = 'Verify & Create Account';
    btn.disabled = false;
  }
};

window.loginWithGoogle = async function() {
  if (typeof googleSignIn === 'function') {
    googleSignIn();
  }
};

window.sendEmailOTP = async function(email) {
  const clerk = window.clerkInstance || window.Clerk;
  if (!clerk) return { error: { message: "Auth service not ready" } };
  
  try {
    try {
      await clerk.client.signIn.create({ identifier: email, strategy: "email_code" });
      return { data: {}, error: null };
    } catch (e) {
      if (e.errors && (e.errors[0].code === 'form_identifier_not_found' || e.errors[0].code === 'session_exists')) {
        try { await clerk.client.signUp.create({ emailAddress: email }); } catch(err) {}
        await clerk.client.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        return { data: {}, error: null };
      }
      throw e;
    }
  } catch (e) {
    let msg = e.errors?.[0]?.longMessage || e.message || "Failed to send OTP";
    return { data: null, error: { message: msg } };
  }
};

window.verifyEmailOTP = async function(email, token) {
  const clerk = window.clerkInstance || window.Clerk;
  if (!clerk) return { error: { message: "Auth service not ready" } };
  
  try {
    if (clerk.client.signIn.status === "needs_first_factor") {
      const attempt = await clerk.client.signIn.attemptFirstFactor({ strategy: "email_code", code: token });
      if (attempt.status === "complete") {
        await clerk.setActive({ session: attempt.createdSessionId });
        return { data: { user: { email } }, error: null };
      }
      return { data: null, error: { message: "Verification failed" } };
    } else {
      const attempt = await clerk.client.signUp.attemptEmailAddressVerification({ code: token });
      if (attempt.status === "complete") {
        await clerk.setActive({ session: attempt.createdSessionId });
        return { data: { user: { email } }, error: null };
      }
      return { data: null, error: { message: "Verification failed" } };
    }
  } catch (e) {
    let msg = e.errors?.[0]?.longMessage || e.message || "Invalid OTP";
    return { data: null, error: { message: msg } };
  }
};

// Override the old signOut from app.js if any
window.signOut = async function() {
  if (confirm("Are you sure you want to log out?")) {
    
    // Sign out from Supabase
    if (window.supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    
    // Sign out from Clerk
    const clerk = window.clerkInstance || window.Clerk;
    if (clerk && clerk.user) {
      await clerk.signOut();
    }
    
    // Clear local state
    if (typeof appState !== 'undefined') {
      appState.user = null;
      localStorage.removeItem('railquick_custom_profile_name');
      localStorage.removeItem('railquick_custom_profile_phone');
      localStorage.removeItem('railquick_custom_profile_dob');
      saveState(); // assuming saveState() exists in app.js
    }
    
    // Reset manual UI elements
    const dName = document.getElementById('display-profile-name');
    const dDetails = document.getElementById('display-profile-details');
    if (dName) dName.innerText = 'Guest User';
    if (dDetails) dDetails.innerText = 'Not logged in';
    
    // Refresh Account Page UI
    if (typeof initAccountPage === 'function') {
      initAccountPage();
    }
    
    updateAuthState(null);
    
    if (typeof showToast === "function") showToast("Logged out successfully", "info");
  }
};

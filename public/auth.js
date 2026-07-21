// auth.js
// Supabase Authentication Logic for RailQuick (Unified seamless flow)

const SUPABASE_URL = "https://czibjqgtafvdivompfin.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JypP4hTbuBTbwsejs6rmmw_zev1g28Y";
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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
    
    const displayName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || "User";
    const profileNameEl = document.getElementById("display-profile-name");
    if (profileNameEl) profileNameEl.innerText = displayName;
    
    const profilePhoneEl = document.getElementById("display-profile-details");
    if (profilePhoneEl) profilePhoneEl.innerText = session.user.email;
    
  } else {
    if (typeof appState !== 'undefined') appState.user = null;
    
    if (authBtnText) authBtnText.innerText = "Login";
    if (authBtnIcon) authBtnIcon.innerText = "login";
    
    const profileNameEl = document.getElementById("display-profile-name");
    if (profileNameEl) profileNameEl.innerText = "Guest User";
    
    const profilePhoneEl = document.getElementById("display-profile-details");
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
  // Reset fields
  document.getElementById("auth-step-1").classList.remove("hidden");
  if(document.getElementById("auth-step-2")) document.getElementById("auth-step-2").classList.add("hidden");
  document.getElementById("auth-error-msg").classList.add("hidden");
  document.getElementById("auth-success-msg").classList.add("hidden");
};

window.closeAuthModal = function() {
  document.getElementById("modal-auth").classList.add("hidden");
};

// Kept for compatibility if called from elsewhere
window.switchAuthTab = function(tab) {
  // We unified the modal, so this doesn't need to do anything anymore
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

window.loginWithGoogle = async function() {
  if (!supabaseClient) return showAuthError("Auth service not initialized");
  try {
    // This will redirect the user to Google login and then back to our app
    await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  } catch (err) {
    showAuthError("Google Login Failed: " + err.message);
  }
};

window.sendAuthOTP = async function() {
  const name = document.getElementById("auth-name").value.trim();
  const email = document.getElementById("auth-email").value.trim().toLowerCase();
  
  if (!email) return showAuthError("Please enter a valid email address.");
  
  const btn = document.getElementById("auth-send-otp-btn");
  btn.innerText = 'Sending...';
  btn.disabled = true;
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithOtp({
      email: email,
      options: {
        data: {
          full_name: name || undefined
        }
      }
    });
    
    if (error) throw error;
    
    document.getElementById("auth-step-1").classList.add("hidden");
    document.getElementById("auth-step-2").classList.remove("hidden");
    showAuthSuccess("OTP sent to your email!");
    
  } catch (err) {
    showAuthError(err.message || "Failed to send OTP.");
  } finally {
    btn.innerText = 'Send OTP to Email';
    btn.disabled = false;
  }
};

window.verifyAuthOTP = async function() {
  const otp = document.getElementById("auth-otp").value.trim();
  if (otp.length !== 6) return showAuthError("Enter a valid 6-digit OTP.");
  
  const email = document.getElementById("auth-email").value.trim().toLowerCase();
  
  const btn = document.getElementById("auth-verify-otp-btn");
  btn.innerText = 'Verifying...';
  btn.disabled = true;
  
  try {
    const { data, error } = await supabaseClient.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'email'
    });
    
    if (error) throw error;
    
    // Auth state will automatically update via onAuthStateChange
    
    closeAuthModal();
    
    if (typeof initAccountPage === 'function') initAccountPage();
    
    const returnPage = localStorage.getItem('railquick_return_after_login') || 'page-account';
    if (typeof navigateTo === 'function') navigateTo(returnPage);
    
    if (typeof showToast === "function") showToast("Logged in successfully!", "success");
    
  } catch (err) {
    showAuthError(err.message || "Invalid or expired OTP.");
  } finally {
    btn.innerText = 'Verify & Continue';
    btn.disabled = false;
  }
};

window.signOut = async function() {
  if (confirm("Are you sure you want to log out?")) {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    
    // Clear local state manually just in case
    if (typeof appState !== 'undefined') {
      appState.user = null;
      if(typeof saveState === 'function') saveState();
    }
    
    // Reset manual UI elements
    const dName = document.getElementById('display-profile-name');
    const dDetails = document.getElementById('display-profile-details');
    if (dName) dName.innerText = 'Guest User';
    if (dDetails) dDetails.innerText = 'Not logged in';
    
    if (typeof initAccountPage === 'function') {
      initAccountPage();
    }
    
    updateAuthState(null);
    
    if (typeof showToast === "function") showToast("Logged out successfully", "info");
  }
};

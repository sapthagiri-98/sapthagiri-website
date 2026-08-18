/* =========================================================================
   whatsapp-connect.js
   Meta WhatsApp Business App Coexistence Onboarding
   ========================================================================= */
(function () {
  "use strict";

  var APP_ID = "2972537683097915";
  var CONFIG_ID = "1670939950666179";

  var state = {
    code: null,
    wabaId: null,
    phoneId: null,
    businessId: null
  };

  injectCss();
  initSDK();

  window.addEventListener("DOMContentLoaded", function () {
    render();
  });

  function render() {
    var view = document.getElementById("view") || document.body;
    var container = document.createElement("div");
    container.className = "wa-wrap";
    container.innerHTML =
      '<div class="wa-head">' +
        '<div><span class="wa-chip">COEXISTENCE ONBOARDING</span>' +
        '<h1>Connect WhatsApp Business App</h1>' +
        '<p>Connect your existing WhatsApp Business number to the Cloud API without losing your mobile chat history.</p></div>' +
      '</div>' +
      '<div class="wa-card">' +
        '<div class="wa-status" id="waStatus">' +
          '<div class="wa-status-icon"><i class="material-icons">link</i></div>' +
          '<div><b>Ready to Connect</b><span>Click below to generate your QR / Access code</span></div>' +
        '</div>' +
        '<button class="wa-connect" id="waConnect">Connect Existing WhatsApp Number</button>' +
        '<div class="wa-note"><span>Keep your phone nearby. When Meta shows the QR / Access Code on screen, open WhatsApp Business on your phone &gt; Settings &gt; Account &gt; Business Platform to scan.</span></div>' +
        '<div id="waResult"></div>' +
      '</div>' +
      '<div class="wa-steps">' +
        '<div><b>1</b><span>Click Connect to open Meta popup</span></div>' +
        '<div><b>2</b><span>Select your Business & existing number</span></div>' +
        '<div><b>3</b><span>Scan the QR code with your mobile app</span></div>' +
        '<div><b>4</b><span>Finish setup & obtain Phone Number ID</span></div>' +
      '</div>';

    view.appendChild(container);

    var btn = document.getElementById("waConnect");
    if (btn) btn.onclick = launchWhatsAppCoexistence;
  }

  function setStatus(title, detail, cls) {
    var el = document.getElementById("waStatus");
    if (!el) return;
    el.className = "wa-status " + (cls || "");
    el.innerHTML =
      '<div class="wa-status-icon">●</div>' +
      '<div><b>' + escapeHtml(title) + '</b><span>' + escapeHtml(detail) + '</span></div>';
  }

  function showResult(html) {
    var el = document.getElementById("waResult");
    if (el) el.innerHTML = html;
  }

  function launchWhatsAppCoexistence() {
    var btn = document.getElementById("waConnect");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Opening Meta...";
    }

    if (!window.FB) {
      setStatus("Meta SDK not loaded", "Please refresh the page and try again.", "err");
      resetButton();
      return;
    }

    var loginOptions = {
      response_type: "code",
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: "whatsapp_business_app_onboarding",
        sessionInfoVersion: "3"
      }
    };

    if (CONFIG_ID && CONFIG_ID.trim() !== "") {
      loginOptions.config_id = CONFIG_ID;
    } else {
      loginOptions.scope = "whatsapp_business_management,whatsapp_business_messaging";
    }

    window.FB.login(function (response) {
      if (response && response.authResponse && response.authResponse.code) {
        state.code = response.authResponse.code;
        setStatus("Connection Approved", "Meta setup finished successfully.", "ok");
        displayDetails();
      } else {
        setStatus("Setup Cancelled", "No connection was made or window was closed.", "err");
        resetButton();
      }
    }, loginOptions);
  }

  function displayDetails() {
    showResult(
      '<div class="wa-result ok">' +
        '<div class="wa-result-title"> Connection Complete</div>' +
        '<div class="wa-grid">' +
          '<div><small>WABA ID</small><b>' + escapeHtml(state.wabaId || "Check Meta Developer Dashboard") + '</b></div>' +
          '<div><small>Phone Number ID</small><b>' + escapeHtml(state.phoneId || "Check Meta Developer Dashboard") + '</b></div>' +
        '</div>' +
      '</div>'
    );
    resetButton();
  }

  function resetButton() {
    var btn = document.getElementById("waConnect");
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = "Connect Existing WhatsApp Number";
  }

  function initSDK() {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: APP_ID,
        cookie: true,
        xfbml: false,
        version: "v20.0"
      });
    };

    (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    })(document, "script", "facebook-jssdk");
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com") return;

    var data;
    try { data = typeof event.data === "string" ? JSON.parse(event.data) : event.data; }
    catch (e) { return; }

    if (!data || data.type !== "WA_EMBEDDED_SIGNUP") return;

    if (data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" || data.event === "FINISH") {
      state.wabaId = (data.data && data.data.waba_id) || state.wabaId;
      state.phoneId = (data.data && data.data.phone_number_id) || state.phoneId;
      state.businessId = (data.data && data.data.business_id) || state.businessId;
      displayDetails();
    } else if (data.event === "ERROR") {
      setStatus("Meta Reported an Error", (data.data && (data.data.error_message || data.data.error)) || "Onboarding failed.", "err");
      resetButton();
    }
  });

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  function injectCss() {
    var css =
      ".wa-wrap{max-width:760px;margin:30px auto;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;padding:0 15px}" +
      ".wa-chip{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.5px;color:#166534;background:#dcfce7;padding:4px 10px;border-radius:999px;margin-bottom:8px}" +
      ".wa-head h1{font-size:24px;margin:0 0 6px;color:#0f172a}" +
      ".wa-head p{font-size:14px;color:#64748b;margin:0 0 20px}" +
      ".wa-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.05)}" +
      ".wa-status{display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:10px;margin-bottom:18px}" +
      ".wa-status-icon{font-size:18px;color:#64748b}" +
      ".wa-status b{display:block;font-size:14px;color:#0f172a}" +
      ".wa-status span{display:block;font-size:12px;color:#64748b;margin-top:2px}" +
      ".wa-status.ok{border-color:#bbf7d0;background:#f0fdf4}.wa-status.ok .wa-status-icon{color:#16a34a}" +
      ".wa-status.err{border-color:#fecaca;background:#fef2f2}.wa-status.err .wa-status-icon{color:#dc2626}" +
      ".wa-connect{width:100%;border:0;border-radius:10px;padding:14px;background:#16a34a;color:#fff;font-size:15px;font-weight:700;cursor:pointer}" +
      ".wa-connect:hover{background:#15803d}.wa-connect:disabled{opacity:.6;cursor:wait}" +
      ".wa-note{font-size:12px;color:#64748b;margin-top:14px;line-height:1.4}" +
      ".wa-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:20px}" +
      ".wa-steps>div{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;font-size:12px;color:#475569}" +
      ".wa-steps b{display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%;background:#e2e8f0;margin-bottom:6px}" +
      ".wa-result{margin-top:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px}" +
      ".wa-result-title{font-weight:700;color:#166534;margin-bottom:10px}" +
      ".wa-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}" +
      ".wa-grid>div{background:#fff;border:1px solid #bbf7d0;border-radius:8px;padding:10px}" +
      ".wa-grid small{display:block;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase}" +
      ".wa-grid b{font-family:monospace;font-size:13px;color:#0f172a;margin-top:4px;display:block}";
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);
  }
})();

/* =========================================================================
   whatsapp-connect.js
   One-time Meta WhatsApp Business App Coexistence onboarding.
   Uses the Facebook JS SDK + the Meta Embedded Signup configuration created
   in Facebook Login for Business.
   ========================================================================= */
(function () {
  "use strict";

  var P = window.Portal;
  var CONFIG = P.CONFIG;
  var session = P.bootPage("dashboard");
  if (!session) return;

  if (session.role !== "Management") {
    location.replace("dashboard.html");
    return;
  }

  // Meta Embedded Signup identifiers.
  // Keep these explicit here so the Facebook JS SDK cannot silently
  // receive an undefined config_id from config.js.
  var APP_ID = "2972537683097915";
  var CONFIG_ID = "1670939950666179";
  var ONBOARD_URL = CONFIG.SUPABASE_WA_ONBOARD_BASE;
  var state = {
    code: null,
    wabaId: null,
    phoneId: null,
    businessId: null
  };

  injectCss();
  render();

  window.launchWhatsAppCoexistence = launchWhatsAppCoexistence;

  function render() {
    document.getElementById("view") && (document.getElementById("view").innerHTML =
      '<div class="wa-wrap">' +
        '<div class="wa-head">' +
          '<div><span class="wa-chip">ONE-TIME SETUP</span>' +
          '<h1>Connect WhatsApp Business</h1>' +
          '<p>Connect the school\u2019s existing WhatsApp Business number to Cloud API while keeping the WhatsApp Business app active.</p></div>' +
        '</div>' +

        '<div class="wa-card">' +
          '<div class="wa-status" id="waStatus">' +
            '<div class="wa-status-icon"><i class="material-icons">link</i></div>' +
            '<div><b>Ready to connect</b><span>Number: +91 93811 18421</span></div>' +
          '</div>' +
          '<button class="wa-connect" id="waConnect"><i class="material-icons">link</i> Connect WhatsApp Business</button>' +
          '<div class="wa-note"><i class="material-icons">info</i><span>Keep the phone with <b>+91 93811 18421</b> nearby. Meta will ask you to confirm the existing WhatsApp Business app.</span></div>' +
          '<div id="waResult"></div>' +
        '</div>' +

        '<div class="wa-steps">' +
          '<div><b>1</b><span>Start Meta onboarding</span></div>' +
          '<div><b>2</b><span>Choose the existing WhatsApp Business app number</span></div>' +
          '<div><b>3</b><span>Complete the QR / verification step on the phone</span></div>' +
          '<div><b>4</b><span>Cloud API receives the connected WABA</span></div>' +
        '</div>' +
      '</div>'
    );

    var btn = document.getElementById("waConnect");
    if (btn) btn.onclick = launchWhatsAppCoexistence;
  }

  function setStatus(title, detail, icon, cls) {
    var el = document.getElementById("waStatus");
    if (!el) return;
    el.className = "wa-status " + (cls || "");
    el.innerHTML =
      '<div class="wa-status-icon"><i class="material-icons">' + icon + '</i></div>' +
      '<div><b>' + P.esc(title) + '</b><span>' + P.esc(detail) + '</span></div>';
  }

  function showResult(html) {
    var el = document.getElementById("waResult");
    if (el) el.innerHTML = html;
  }

  function launchWhatsAppCoexistence() {
    var btn = document.getElementById("waConnect");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="material-icons">sync</i> Opening Meta\u2026';
    }

    if (!window.FB) {
      setStatus("Meta SDK not loaded", "Refresh the page and try again.", "error", "err");
      resetButton();
      return;
    }

    if (!APP_ID || !CONFIG_ID) {
      setStatus("Meta configuration missing", "APP_ID or Embedded Signup config_id is missing.", "error", "err");
      resetButton();
      return;
    }

    window.FB.login(function (response) {
      if (response && response.authResponse && response.authResponse.code) {
        state.code = response.authResponse.code;
        setStatus("Meta onboarding completed", "Finishing the Cloud API connection\u2026", "sync", "working");
        finishOnboarding();
      } else {
        setStatus("Setup cancelled", "No connection was made.", "cancel", "err");
        resetButton();
      }
    }, {
      config_id: CONFIG_ID,
      response_type: "code",
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: "whatsapp_business_app_onboarding",
        sessionInfoVersion: "3"
      }
    });
  }

  function finishOnboarding() {
    fetch(ONBOARD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (CONFIG.SUPABASE_ANON || ""),
        "apikey": CONFIG.SUPABASE_ANON || ""
      },
      body: JSON.stringify({
        code: state.code,
        waba_id: state.wabaId || null,
        phone_number_id: state.phoneId || null
      })
    })
    .then(function (r) {
      return r.text().then(function (t) {
        var d;
        try { d = JSON.parse(t); } catch (e) { throw new Error("Invalid onboarding response: " + t.slice(0, 180)); }
        if (!r.ok || !d.ok) throw new Error(d.error || "Meta onboarding failed.");
        return d.data;
      });
    })
    .then(function (d) {
      state.wabaId = d.waba_id || state.wabaId;
      state.phoneId = d.phone_number_id || state.phoneId;
      state.businessId = d.business_id || state.businessId;

      setStatus("WhatsApp connected", "+91 93811 18421 is now onboarded for Cloud API.", "check_circle", "ok");
      showResult(
        '<div class="wa-result ok">' +
          '<div class="wa-result-title"><i class="material-icons">check_circle</i> Connection successful</div>' +
          '<div class="wa-grid">' +
            '<div><small>WABA ID</small><b>' + P.esc(state.wabaId || "Not returned") + '</b></div>' +
            '<div><small>Phone Number ID</small><b>' + P.esc(state.phoneId || "Not returned") + '</b></div>' +
          '</div>' +
          '<div class="wa-token-note"><b>One final backend step:</b> copy the Business Token returned by this setup into Supabase secret <code>WHATSAPP_ACCESS_TOKEN</code>, and set <code>WHATSAPP_PHONE_NUMBER_ID</code> to the Phone Number ID above.</div>' +
          (d.access_token ? '<div class="wa-token"><small>BUSINESS TOKEN — copy once, then store it in Supabase Secrets</small><textarea id="waToken" readonly>' + P.esc(d.access_token) + '</textarea><button id="copyWaToken">Copy token</button></div>' : '') +
        '</div>'
      );
      var copy = document.getElementById("copyWaToken");
      if (copy) copy.onclick = function () {
        var t = document.getElementById("waToken");
        if (!t) return;
        navigator.clipboard.writeText(t.value).then(function () {
          copy.textContent = "Copied";
          setTimeout(function () { copy.textContent = "Copy token"; }, 1500);
        });
      };
      resetButton();
    })
    .catch(function (e) {
      setStatus("Connection failed", e.message || String(e), "error", "err");
      resetButton();
    });
  }

  function resetButton() {
    var btn = document.getElementById("waConnect");
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = '<i class="material-icons">link</i> Connect WhatsApp Business';
  }

  window.fbAsyncInit = function () {
    window.FB.init({
      appId: APP_ID,
      cookie: true,
      xfbml: false,
      version: "v26.0"
    });
  };

  window.addEventListener("message", function (event) {
    if (event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com") return;

    var data;
    try { data = typeof event.data === "string" ? JSON.parse(event.data) : event.data; }
    catch (e) { return; }

    if (!data || data.type !== "WA_EMBEDDED_SIGNUP") return;

    if (data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" || data.event === "FINISH") {
      state.wabaId = data.data && data.data.waba_id || state.wabaId;
      state.phoneId = data.data && data.data.phone_number_id || state.phoneId;
      state.businessId = data.data && data.data.business_id || state.businessId;
    } else if (data.event === "ERROR") {
      setStatus("Meta reported an error", (data.data && (data.data.error_message || data.data.error)) || "Onboarding failed.", "error", "err");
      resetButton();
    }
  });

  function injectCss() {
    var css =
      ".wa-wrap{max-width:900px;margin:0 auto;padding-bottom:30px}" +
      ".wa-head{margin-bottom:18px}.wa-chip{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.8px;color:var(--maroon);background:var(--primary-light);padding:5px 10px;border-radius:999px}" +
      ".wa-head h1{font-family:var(--head);font-size:25px;color:var(--maroon);margin:8px 0 4px}.wa-head p{color:var(--text-muted);font-size:13.5px;max-width:720px}" +
      ".wa-card{background:#fff;border:1px solid var(--border);border-radius:18px;padding:20px;box-shadow:var(--shadow-sm)}" +
      ".wa-status{display:flex;align-items:center;gap:13px;padding:14px;border:1px solid #e5e7eb;background:#f8fafc;border-radius:13px;margin-bottom:16px}.wa-status-icon{width:42px;height:42px;border-radius:12px;background:#eef2f7;color:var(--maroon);display:flex;align-items:center;justify-content:center}.wa-status b{display:block;color:var(--text-main);font-size:14px}.wa-status span{display:block;color:var(--text-muted);font-size:12px;margin-top:2px}.wa-status.ok{border-color:#bbf7d0;background:#f0fdf4}.wa-status.ok .wa-status-icon{background:#dcfce7;color:#15803d}.wa-status.err{border-color:#fecaca;background:#fef2f2}.wa-status.err .wa-status-icon{background:#fee2e2;color:#b91c1c}.wa-status.working{border-color:#bfdbfe;background:#eff6ff}.wa-status.working .wa-status-icon{background:#dbeafe;color:#2563eb}" +
      ".wa-connect{width:100%;border:0;border-radius:12px;padding:13px 18px;background:#166534;color:#fff;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}.wa-connect:hover{background:#14532d}.wa-connect:disabled{opacity:.65;cursor:wait}" +
      ".wa-note{display:flex;gap:8px;align-items:flex-start;color:var(--text-muted);font-size:12px;margin-top:12px}.wa-note i{font-size:17px;color:#64748b}.wa-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.wa-steps>div{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px;font-size:11.5px;color:var(--text-muted)}.wa-steps b{display:inline-flex;width:23px;height:23px;border-radius:50%;background:var(--primary-light);color:var(--maroon);align-items:center;justify-content:center;margin-bottom:7px}.wa-steps span{display:block;line-height:1.35}" +
      ".wa-result{margin-top:15px;border-radius:13px;padding:14px}.wa-result.ok{background:#f0fdf4;border:1px solid #bbf7d0}.wa-result-title{font-weight:800;color:#166534;display:flex;gap:7px;align-items:center}.wa-result-title i{font-size:19px}.wa-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.wa-grid>div{background:#fff;border:1px solid #dcfce7;border-radius:9px;padding:9px}.wa-grid small,.wa-token small{display:block;color:#64748b;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.4px}.wa-grid b{display:block;margin-top:3px;font-family:monospace;font-size:12px;word-break:break-all}.wa-token-note{font-size:12px;color:#166534;margin-top:12px;line-height:1.5}.wa-token-note code{background:#dcfce7;padding:2px 4px;border-radius:4px}.wa-token{margin-top:12px}.wa-token textarea{width:100%;height:85px;margin-top:6px;border:1px solid #d1d5db;border-radius:8px;padding:8px;font:11px monospace;resize:vertical}.wa-token button{margin-top:7px;border:1px solid #166534;background:#fff;color:#166534;border-radius:8px;padding:7px 11px;font-weight:800;cursor:pointer}" +
      "@media(max-width:700px){.wa-steps{grid-template-columns:1fr 1fr}.wa-grid{grid-template-columns:1fr}}";
    var st = document.createElement("style");
    st.id = "wa-connect-css";
    st.textContent = css;
    document.head.appendChild(st);
  }
})();

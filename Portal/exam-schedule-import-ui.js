/* =========================================================================
   exam-schedule-import-ui.js — Examination Schedule Excel Import Wizard UI
   Part of Sapthagiri High School ERP Examination Management.

   Workflow:
   Step 1: Upload Workbook (.xlsx, .xls)
           Automatically detects class sheets (6, 7, 8, 9, 10).
           Ignores Column F onwards (no automatic syllabus assignment).
   Step 2: Class Selection Prompt ("Which classes schedule do you want to update?")
           User selects target classes with quick Select/Clear All toggles.
   Step 3: Discrepancy & Comparison Review
           - Discrepancy table comparing Old DB Date/Marks vs New Excel Date/Marks.
           - Newly added exams table (CT-5, CT-6, FA-3) marked Pending Syllabus.
           - Unchanged examinations collapsible section.
   Step 4: Confirm & Safe Import Execution
           - Batch update modified schedules via examBulkSaveSchedule.
           - Create new exams via createAdminExam (ready for teacher syllabus mapping).
   ========================================================================= */
(function (root) {
  "use strict";

  var P = (typeof window !== 'undefined' && window.Portal) ? window.Portal : {};
  var esc = P.esc || function (s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var Parser = (typeof window !== 'undefined' && window.ExamScheduleImportParser)
    ? window.ExamScheduleImportParser
    : (typeof globalThis !== 'undefined' && globalThis.ExamScheduleImportParser ? globalThis.ExamScheduleImportParser : null);

  var IMPORT_STATE = {
    file: null,
    workbook: null,
    parseRes: null,
    selectedClasses: {}, // className -> boolean
    reconciliation: null,
    selectedNew: {},      // index -> boolean
    selectedChanged: {},  // index -> boolean
    isImporting: false
  };

  // Inject Scoped Styles for Import Wizard
  function ensureStyles() {
    if (document.getElementById("exImportWizardStyles")) return;
    var style = document.createElement("style");
    style.id = "exImportWizardStyles";
    style.textContent = `
      .ex-wiz-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 1300; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(2px); }
      .ex-wiz-modal { background: #fff; width: 100%; max-width: 960px; max-height: 92vh; border-radius: 14px; box-shadow: 0 16px 36px rgba(0,0,0,0.22); display: flex; flex-direction: column; overflow: hidden; animation: exWizPop 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
      @keyframes exWizPop { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      .ex-wiz-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; background: #fafafa; border-bottom: 1px solid var(--border, #e2e8f0); }
      .ex-wiz-title { font-size: 17px; font-weight: 700; color: var(--maroon, #7f1d1d); display: flex; align-items: center; gap: 8px; margin: 0; }
      .ex-wiz-close { background: none; border: none; font-size: 24px; line-height: 1; cursor: pointer; color: #64748b; padding: 4px 8px; border-radius: 6px; }
      .ex-wiz-close:hover { background: #e2e8f0; color: #0f172a; }
      .ex-wiz-body { padding: 20px 22px; overflow-y: auto; flex: 1; }
      .ex-wiz-footer { padding: 14px 22px; background: #fafafa; border-top: 1px solid var(--border, #e2e8f0); display: flex; justify-content: space-between; align-items: center; }

      /* Dropzone */
      .ex-dropzone { border: 2px dashed #cbd5e1; border-radius: 12px; padding: 34px 20px; text-align: center; background: #f8fafc; cursor: pointer; transition: all 0.2s; }
      .ex-dropzone:hover, .ex-dropzone.dragover { border-color: var(--maroon, #7f1d1d); background: #fdf2f2; }
      .ex-dropzone i { font-size: 46px; color: var(--maroon, #7f1d1d); margin-bottom: 8px; }
      .ex-dropzone p { margin: 4px 0; color: #475569; font-size: 14.5px; }
      .ex-dropzone .sub { font-size: 12px; color: #94a3b8; }

      /* Class Selection Step */
      .ex-class-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 16px; }
      .ex-class-card { border: 2px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; background: #fff; cursor: pointer; display: flex; align-items: flex-start; gap: 12px; transition: all 0.15s ease; user-select: none; }
      .ex-class-card:hover { border-color: #cbd5e1; background: #f8fafc; }
      .ex-class-card.selected { border-color: var(--maroon, #7f1d1d); background: #fdf2f2; }
      .ex-class-card input[type="checkbox"] { margin-top: 2px; width: 18px; height: 18px; accent-color: var(--maroon, #7f1d1d); cursor: pointer; }
      .ex-class-card-content { flex: 1; }
      .ex-class-card-title { display: flex; align-items: center; gap: 8px; font-size: 14.5px; color: #0f172a; margin-bottom: 4px; }
      .ex-class-sheet-badge { font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #e2e8f0; color: #475569; }
      .ex-class-card.selected .ex-class-sheet-badge { background: #fee2e2; color: var(--maroon, #7f1d1d); }
      .ex-class-card-count { font-size: 12px; color: #64748b; }
      .ex-quick-btn { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer; }
      .ex-quick-btn:hover { background: #e2e8f0; color: #0f172a; }

      /* Summary KPI Cards */
      .ex-wiz-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 18px; }
      .ex-wiz-kpi { border: 1px solid var(--border, #e2e8f0); border-radius: 10px; padding: 12px 14px; text-align: center; background: #fff; }
      .ex-wiz-kpi .val { font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.1; }
      .ex-wiz-kpi .lbl { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-top: 4px; letter-spacing: 0.5px; }
      .ex-wiz-kpi.green { border-left: 4px solid #16a34a; }
      .ex-wiz-kpi.green .val { color: #16a34a; }
      .ex-wiz-kpi.amber { border-left: 4px solid #f59e0b; }
      .ex-wiz-kpi.amber .val { color: #d97706; }
      .ex-wiz-kpi.blue { border-left: 4px solid #3b82f6; }
      .ex-wiz-kpi.blue .val { color: #2563eb; }
      .ex-wiz-kpi.red { border-left: 4px solid #ef4444; }
      .ex-wiz-kpi.red .val { color: #dc2626; }

      /* Section Accordions / Tables */
      .ex-review-section { margin-bottom: 20px; }
      .ex-review-section h4 { font-size: 14px; font-weight: 700; margin: 0 0 8px; display: flex; align-items: center; justify-content: space-between; }
      .ex-diff-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px; }
      .ex-diff-table th, .ex-diff-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
      .ex-diff-table th { background: #f8fafc; font-weight: 700; color: #475569; font-size: 11.5px; text-transform: uppercase; }
      .ex-diff-old { text-decoration: line-through; color: #ef4444; background: #fee2e2; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; font-weight: 600; display: inline-block; }
      .ex-diff-new { color: #16a34a; background: #dcfce7; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-family: monospace; font-size: 12px; display: inline-block; }
      .ex-diff-arrow { color: #94a3b8; font-weight: bold; margin: 0 6px; }
      .ex-new-badge { display: inline-block; padding: 2px 6px; font-size: 10.5px; font-weight: 800; border-radius: 4px; background: #dcfce7; color: #166534; border: 1px solid #86efac; margin-right: 6px; text-transform: uppercase; letter-spacing: 0.5px; }

      /* Unchanged Collapsible */
      .ex-unchanged-details { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; background: #f8fafc; margin-top: 10px; }
      .ex-unchanged-details summary { font-size: 13px; font-weight: 600; color: #475569; cursor: pointer; user-select: none; }
      .ex-unchanged-details[open] summary { margin-bottom: 10px; }

      /* Warnings List */
      .ex-wiz-warning { background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 12.5px; color: #92400e; }
      .ex-wiz-error { background: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: 12.5px; color: #991b1b; }
      .ex-tablewrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #e2e8f0; border-radius: 8px; }
    `;
    document.head.appendChild(style);
  }

  // Open the Excel Schedule Import Wizard Modal
  function openImportWizard(onComplete) {
    ensureStyles();

    // Reset state
    IMPORT_STATE.file = null;
    IMPORT_STATE.workbook = null;
    IMPORT_STATE.parseRes = null;
    IMPORT_STATE.selectedClasses = {};
    IMPORT_STATE.reconciliation = null;
    IMPORT_STATE.selectedNew = {};
    IMPORT_STATE.selectedChanged = {};
    IMPORT_STATE.isImporting = false;

    var existingModal = document.getElementById("exImportWizardModal");
    if (existingModal) existingModal.remove();

    var overlay = document.createElement("div");
    overlay.className = "ex-wiz-overlay";
    overlay.id = "exImportWizardModal";
    overlay.innerHTML = `
      <div class="ex-wiz-modal">
        <div class="ex-wiz-header">
          <div class="ex-wiz-title">
            <i class="material-icons">upload_file</i>
            <span>Import Examination Schedule from Excel</span>
          </div>
          <button class="ex-wiz-close" id="exWizClose">&times;</button>
        </div>
        <div class="ex-wiz-body" id="exWizBody">
          <!-- Step 1: Upload Form -->
          <div id="exWizStepUpload">
            <p style="margin-top:0;font-size:13.5px;color:#475569;">
              Upload the examination schedule workbook (e.g. <b>Class Tests Schedule.xlsx</b>).
              Individual class sheets (<b>6, 7, 8, 9, 10</b>) are auto-detected.
              Column F onwards (syllabus) is ignored so teachers can map lessons interactively.
            </p>

            <div class="ex-dropzone" id="exWizDropzone">
              <i class="material-icons">cloud_upload</i>
              <p><b>Click to browse</b> or drag and drop your Excel schedule (.xlsx, .xls)</p>
              <div class="sub">Auto-detects class sheets: 6, 7, 8, 9, 10 · Supports CT 1–8, FA 1–4, and SA 1–2</div>
              <input type="file" id="exWizFileInput" accept=".xlsx,.xls" style="display:none;">
            </div>

            <div id="exWizLoading" style="display:none;text-align:center;padding:24px;">
              <div class="ex-loading"><i class="material-icons">sync</i><div>Reading workbook and detecting class sheets…</div></div>
            </div>
          </div>

          <!-- Step 2: Class Selection Prompt (populated dynamically) -->
          <div id="exWizStepClassSelect" style="display:none;"></div>

          <!-- Step 3: Discrepancy & Comparison Review (populated dynamically) -->
          <div id="exWizStepReview" style="display:none;"></div>
        </div>
        <div class="ex-wiz-footer" id="exWizFooter">
          <button class="ex-abtn" id="exWizCancel">Cancel</button>
          <div id="exWizActionBtns" style="display:flex;gap:8px;"></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event handlers
    var closeBtn = document.getElementById("exWizClose");
    var cancelBtn = document.getElementById("exWizCancel");
    var dropzone = document.getElementById("exWizDropzone");
    var fileInput = document.getElementById("exWizFileInput");

    function closeModal() {
      overlay.remove();
    }

    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);

    dropzone.addEventListener("click", function () {
      fileInput.click();
    });

    dropzone.addEventListener("dragover", function (e) {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", function () {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", function (e) {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        handleFileSelected(e.dataTransfer.files[0], onComplete);
      }
    });

    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files.length) {
        handleFileSelected(fileInput.files[0], onComplete);
      }
    });
  }

  // Handle file selection and parsing
  function handleFileSelected(file, onComplete) {
    if (!file) return;
    IMPORT_STATE.file = file;

    var dropzone = document.getElementById("exWizDropzone");
    var loadingEl = document.getElementById("exWizLoading");

    dropzone.style.display = "none";
    loadingEl.style.display = "block";

    // Ensure parser
    Parser = window.ExamScheduleImportParser || (typeof globalThis !== 'undefined' ? globalThis.ExamScheduleImportParser : null);
    if (!Parser) {
      alert("ExamScheduleImportParser is not loaded.");
      dropzone.style.display = "block";
      loadingEl.style.display = "none";
      return;
    }

    Parser.loadSheetJS().then(function (XLSX) {
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var data = new Uint8Array(e.target.result);
          var workbook = XLSX.read(data, { type: "array" });
          IMPORT_STATE.workbook = workbook;

          // Parse records identifying class directly from sheet names (6, 7, 8, 9, 10)
          var parseRes = Parser.parseScheduleWorkbook(workbook);
          IMPORT_STATE.parseRes = parseRes;

          if (!parseRes || !parseRes.classSheetsFound || parseRes.classSheetsFound.length === 0) {
            alert("No recognized class sheets found in workbook. Expected sheets named 6, 7, 8, 9, or 10.");
            dropzone.style.display = "block";
            loadingEl.style.display = "none";
            return;
          }

          // Initialize selected classes (all selected by default)
          IMPORT_STATE.selectedClasses = {};
          parseRes.classSheetsFound.forEach(function (c) {
            IMPORT_STATE.selectedClasses[c.className] = true;
          });

          // Transition to Step 2: Class Selection Prompt
          renderClassSelectionStage(onComplete);

        } catch (err) {
          alert("Error parsing Excel workbook: " + (err.message || err));
          dropzone.style.display = "block";
          loadingEl.style.display = "none";
        }
      };
      reader.readAsArrayBuffer(file);
    }).catch(function (err) {
      alert("Failed to load SheetJS library: " + (err.message || err));
      dropzone.style.display = "block";
      loadingEl.style.display = "none";
    });
  }

  // Step 2: Class Selection Prompt ("Which classes schedule do you want to update?")
  function renderClassSelectionStage(onComplete) {
    var stepUpload = document.getElementById("exWizStepUpload");
    var stepClassSelect = document.getElementById("exWizStepClassSelect");
    var stepReview = document.getElementById("exWizStepReview");
    var actionBtns = document.getElementById("exWizActionBtns");

    stepUpload.style.display = "none";
    stepReview.style.display = "none";
    stepClassSelect.style.display = "block";

    var parseRes = IMPORT_STATE.parseRes;
    var classSheets = (parseRes && parseRes.classSheetsFound) || [];

    var html = `
      <div style="margin-bottom:16px;">
        <h3 style="margin:0 0 6px;font-size:16px;font-weight:700;color:var(--maroon,#7f1d1d);display:flex;align-items:center;gap:8px;">
          <i class="material-icons">filter_alt</i> Which classes schedule do you want to update?
        </h3>
        <p style="margin:0;font-size:13px;color:#64748b;">
          The uploaded file <b>${esc(IMPORT_STATE.file.name)}</b> contains examination schedules for the classes below.
          Select the classes you wish to analyze and update in the database:
        </p>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:13px;color:#475569;">Detected <b>${classSheets.length} class sheets</b>:</span>
        <div style="display:flex;gap:8px;">
          <button type="button" class="ex-quick-btn" id="exWizSelectAllClasses">Select All</button>
          <button type="button" class="ex-quick-btn" id="exWizClearAllClasses">Clear All</button>
        </div>
      </div>

      <div class="ex-class-grid" id="exClassGrid">
        ${classSheets.map(function (c) {
          var isChecked = !!IMPORT_STATE.selectedClasses[c.className];
          return `
            <label class="ex-class-card ${isChecked ? 'selected' : ''}" data-cls="${esc(c.className)}">
              <input type="checkbox" class="ex-cls-chk" value="${esc(c.className)}" ${isChecked ? 'checked' : ''}>
              <div class="ex-class-card-content">
                <div class="ex-class-card-title">
                  <i class="material-icons" style="font-size:18px;color:var(--maroon,#7f1d1d);">school</i>
                  <b>${esc(c.className)}</b>
                  <span class="ex-class-sheet-badge">Sheet: ${esc(c.sheetName)}</span>
                </div>
                <div class="ex-class-card-count">${c.count} examinations found</div>
              </div>
            </label>
          `;
        }).join("")}
      </div>
    `;

    if (parseRes && parseRes.unrecognizedSheets && parseRes.unrecognizedSheets.length > 0) {
      html += `
        <div class="ex-wiz-warning" style="margin-top:10px;">
          <b>Note:</b> The following sheet(s) did not match class names (6, 7, 8, 9, 10) and were ignored:
          <ul style="margin:4px 0 0;padding-left:18px;">
            ${parseRes.unrecognizedSheets.map(function (u) { return `<li>${esc(u.sheetName)}</li>`; }).join("")}
          </ul>
        </div>
      `;
    }

    stepClassSelect.innerHTML = html;

    // Card toggle wiring
    stepClassSelect.querySelectorAll(".ex-class-card").forEach(function (card) {
      var chk = card.querySelector(".ex-cls-chk");
      chk.addEventListener("change", function () {
        var clsName = chk.value;
        IMPORT_STATE.selectedClasses[clsName] = chk.checked;
        card.classList.toggle("selected", chk.checked);
        updateProceedButtonState();
      });
    });

    // Select / Clear all buttons
    document.getElementById("exWizSelectAllClasses").addEventListener("click", function () {
      stepClassSelect.querySelectorAll(".ex-class-card").forEach(function (card) {
        var chk = card.querySelector(".ex-cls-chk");
        chk.checked = true;
        IMPORT_STATE.selectedClasses[chk.value] = true;
        card.classList.add("selected");
      });
      updateProceedButtonState();
    });

    document.getElementById("exWizClearAllClasses").addEventListener("click", function () {
      stepClassSelect.querySelectorAll(".ex-class-card").forEach(function (card) {
        var chk = card.querySelector(".ex-cls-chk");
        chk.checked = false;
        IMPORT_STATE.selectedClasses[chk.value] = false;
        card.classList.remove("selected");
      });
      updateProceedButtonState();
    });

    // Action buttons
    actionBtns.innerHTML = `
      <button class="btn btn-secondary" id="exWizBackToUpload" style="width:auto;">&larr; Choose Another File</button>
      <button class="btn btn-primary" id="exWizProceedToReview" style="width:auto;padding:9px 18px;font-weight:600;">
        <i class="material-icons" style="font-size:18px;vertical-align:middle;margin-right:4px;">compare_arrows</i>
        Analyze Discrepancies &amp; Review &rarr;
      </button>
    `;

    document.getElementById("exWizBackToUpload").addEventListener("click", function () {
      stepClassSelect.style.display = "none";
      stepUpload.style.display = "block";
      document.getElementById("exWizDropzone").style.display = "block";
      document.getElementById("exWizLoading").style.display = "none";
      actionBtns.innerHTML = "";
    });

    var proceedBtn = document.getElementById("exWizProceedToReview");
    function updateProceedButtonState() {
      var hasAny = Object.keys(IMPORT_STATE.selectedClasses).some(function (k) {
        return IMPORT_STATE.selectedClasses[k];
      });
      proceedBtn.disabled = !hasAny;
    }
    updateProceedButtonState();

    proceedBtn.addEventListener("click", function () {
      analyzeDiscrepancies(onComplete);
    });
  }

  // Trigger reconciliation for chosen classes
  function analyzeDiscrepancies(onComplete) {
    var stepClassSelect = document.getElementById("exWizStepClassSelect");
    var stepReview = document.getElementById("exWizStepReview");
    var actionBtns = document.getElementById("exWizActionBtns");

    var chosenClasses = Object.keys(IMPORT_STATE.selectedClasses).filter(function (k) {
      return IMPORT_STATE.selectedClasses[k];
    });

    if (chosenClasses.length === 0) {
      alert("Please select at least one class to update.");
      return;
    }

    stepClassSelect.style.display = "none";
    stepReview.style.display = "block";
    stepReview.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <i class="material-icons" style="font-size:36px;color:var(--maroon,#7f1d1d);animation:spin 1s infinite linear;">sync</i>
        <div style="margin-top:12px;font-size:14px;color:#475569;font-weight:600;">
          Fetching database schedule &amp; analyzing discrepancies for ${chosenClasses.join(", ")}…
        </div>
      </div>
    `;
    actionBtns.innerHTML = "";

    // Filter parsed records to chosen classes
    var filteredRecords = IMPORT_STATE.parseRes.records.filter(function (rec) {
      return chosenClasses.indexOf(rec.grade) !== -1;
    });

    // Fetch current database schedule for reconciliation
    P.api("examGetScheduleTable", ["", ""], { overlay: false }).then(function (dbRows) {
      // Filter DB rows to chosen classes
      var filteredDbRows = (dbRows || []).filter(function (row) {
        var rowClass = Parser.normalizeClass(row.gradeLabel || row.grade);
        return chosenClasses.indexOf(rowClass) !== -1;
      });

      var recon = Parser.reconcileSchedule(filteredRecords, filteredDbRows);
      IMPORT_STATE.reconciliation = recon;

      // Render Stage 3: Discrepancy & Comparison Review
      renderReviewStage(recon, chosenClasses, onComplete);

    }).catch(function (err) {
      alert("Failed to load existing schedule from database: " + (err.message || err));
      stepReview.style.display = "none";
      stepClassSelect.style.display = "block";
      renderClassSelectionStage(onComplete);
    });
  }

  // Step 3: Discrepancy & Comparison Review Interface
  function renderReviewStage(recon, chosenClasses, onComplete) {
    var stepReview = document.getElementById("exWizStepReview");
    var actionBtns = document.getElementById("exWizActionBtns");

    var s = recon.summary;

    // Reset selection defaults (all checked by default) and index items
    IMPORT_STATE.selectedNew = {};
    recon.newRecords.forEach(function (item, i) {
      item._idx = i;
      IMPORT_STATE.selectedNew[i] = true;
    });

    IMPORT_STATE.selectedChanged = {};
    recon.changedRecords.forEach(function (item, i) {
      item._idx = i;
      IMPORT_STATE.selectedChanged[i] = true;
    });

    var html = "";

    // 1. KPI Cards
    html += `
      <div style="margin-bottom:14px;">
        <span style="font-size:13px;color:#64748b;">
          Analyzing schedule for classes: <b>${esc(chosenClasses.join(", "))}</b>
        </span>
      </div>

      <div class="ex-wiz-kpis">
        <div class="ex-wiz-kpi">
          <div class="val">${s.total}</div>
          <div class="lbl">Total in Excel</div>
        </div>
        <div class="ex-wiz-kpi" style="border-left:4px solid var(--maroon,#7f1d1d);">
          <div class="val" style="font-size:18px;color:var(--maroon,#7f1d1d);">${chosenClasses.length}</div>
          <div class="lbl">Classes Selected</div>
        </div>
        <div class="ex-wiz-kpi amber">
          <div class="val">${s.changedCount}</div>
          <div class="lbl">Discrepancies</div>
        </div>
        <div class="ex-wiz-kpi green">
          <div class="val">${s.newCount}</div>
          <div class="lbl">New Exams</div>
        </div>
        <div class="ex-wiz-kpi blue">
          <div class="val">${s.unchangedCount}</div>
          <div class="lbl">Already Up to Date</div>
        </div>
        ${s.invalidCount > 0 ? `
          <div class="ex-wiz-kpi red">
            <div class="val">${s.invalidCount}</div>
            <div class="lbl">Invalid / Warnings</div>
          </div>
        ` : ""}
      </div>
    `;

    // Row Parsing Errors (if any)
    if (recon.invalidRecords.length > 0) {
      html += '<div class="ex-wiz-error"><b>The following rows could not be parsed and will be skipped:</b><ul style="margin:4px 0 0;padding-left:18px;">';
      recon.invalidRecords.forEach(function (inv) {
        html += '<li>' + esc((inv.errors || []).join('; ') || 'Invalid record') + '</li>';
      });
      html += '</ul></div>';
    }

    // 2. DISCREPANCY COMPARISON TABLE (Old DB vs New Uploaded Excel)
    if (recon.changedRecords.length > 0) {
      html += `
        <div class="ex-review-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <h4 style="margin:0;color:#d97706;display:flex;align-items:center;gap:6px;font-size:14px;">
              <i class="material-icons" style="font-size:18px;">warning_amber</i>
              Discrepancies Between Old Database &amp; New Uploaded Excel (${recon.changedRecords.length})
            </h4>
            <label style="font-size:12.5px;font-weight:600;color:#d97706;cursor:pointer;">
              <input type="checkbox" id="exWizToggleAllChanged" checked> Select All Discrepancies
            </label>
          </div>
          <p style="margin:0 0 10px;font-size:12.5px;color:#64748b;">
            The following existing examinations have date or marks differences between the database and the uploaded file. Check the items you want to update:
          </p>
          <div class="ex-tablewrap">
            <table class="ex-diff-table">
              <thead>
                <tr>
                  <th style="width:36px;text-align:center;">Update</th>
                  <th>Class</th>
                  <th>Exam Name</th>
                  <th>Subject</th>
                  <th style="background:#fef2f2;color:#991b1b;">Old DB Date</th>
                  <th style="background:#f0fdf4;color:#166534;">New Excel Date</th>
                  <th>Old Marks</th>
                  <th>New Marks</th>
                  <th>Discrepancy</th>
                </tr>
              </thead>
              <tbody>
      `;

      recon.changedRecords.forEach(function (item) {
        var rec = item.record;
        var ex = item.existing;
        var isDateDiff = String(ex.date || '').trim() !== String(rec.date || '').trim();
        var isMarksDiff = (ex.marks != null && rec.marks != null && Number(ex.marks) !== Number(rec.marks));
        var diffLabel = isDateDiff && isMarksDiff ? "Date & Marks mismatch" : (isDateDiff ? "Date mismatch" : "Marks mismatch");

        html += `
          <tr>
            <td style="text-align:center;"><input type="checkbox" class="ex-changed-chk" data-idx="${item._idx}" checked></td>
            <td><b>${esc(rec.grade)}</b></td>
            <td><b>${esc(rec.examName)}</b></td>
            <td>${esc(rec.subject)}</td>
            <td style="background:#fef2f2;">
              <span class="ex-diff-old">${esc(ex.date || "Unscheduled")}</span>
            </td>
            <td style="background:#f0fdf4;">
              <span class="ex-diff-new">${esc(rec.date || "Unscheduled")}</span>
              ${rec.day ? `<span style="font-size:11px;color:#166534;margin-left:4px;">(${esc(rec.day)})</span>` : ''}
            </td>
            <td>${ex.marks != null && ex.marks !== '' ? esc(ex.marks) : '-'}</td>
            <td><b>${rec.marks != null && rec.marks !== '' ? esc(rec.marks) : '-'}</b></td>
            <td><span class="ex-status pdate" style="font-size:11px;">${esc(diffLabel)}</span></td>
          </tr>
        `;
      });

      html += '</tbody></table></div></div>';
    } else {
      html += `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;padding:12px 16px;border-radius:8px;margin-bottom:18px;font-size:13px;color:#166534;display:flex;align-items:center;gap:10px;">
          <i class="material-icons" style="font-size:22px;">check_circle</i>
          <div>
            <b>No Date or Marks Discrepancies:</b> All existing examination dates and maximum marks in the database match the uploaded Excel schedule for the selected classes.
          </div>
        </div>
      `;
    }

    // 3. NEWLY ADDED EXAMINATIONS (e.g., CT-5, CT-6, FA-3)
    if (recon.newRecords.length > 0) {
      html += `
        <div class="ex-review-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <h4 style="margin:0;color:#16a34a;display:flex;align-items:center;gap:6px;font-size:14px;">
              <i class="material-icons" style="font-size:18px;">add_circle</i>
              Newly Added Examinations — To Be Created (${recon.newRecords.length})
            </h4>
            <label style="font-size:12.5px;font-weight:600;color:#16a34a;cursor:pointer;">
              <input type="checkbox" id="exWizToggleAllNew" checked> Select All New Exams
            </label>
          </div>
          <p style="margin:0 0 10px;font-size:12.5px;color:#64748b;">
            These examinations do not exist in the database and will be newly added. After import, they will automatically appear in teacher logins under <b>Syllabus required</b> for syllabus mapping.
          </p>
          <div class="ex-tablewrap">
            <table class="ex-diff-table">
              <thead>
                <tr>
                  <th style="width:36px;text-align:center;">Import</th>
                  <th>Class</th>
                  <th>Exam Name</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Max Marks</th>
                  <th>Status Upon Import</th>
                </tr>
              </thead>
              <tbody>
      `;

      recon.newRecords.forEach(function (item) {
        var rec = item.record;
        html += `
          <tr>
            <td style="text-align:center;"><input type="checkbox" class="ex-new-chk" data-idx="${item._idx}" checked></td>
            <td><b>${esc(rec.grade)}</b></td>
            <td>
              <span class="ex-new-badge">NEW EXAM</span>
              <b>${esc(rec.examName)}</b>
            </td>
            <td>${esc(rec.subject)}</td>
            <td>${esc(rec.date || "Unscheduled")}</td>
            <td>${esc(rec.day || "-")}</td>
            <td><b>${esc(rec.marks != null ? rec.marks : "-")}</b></td>
            <td>
              <span class="ex-status psyl">
                <i class="material-icons" style="font-size:12px;vertical-align:middle;">assignment_late</i>
                Pending Syllabus (Ready for Teacher Mapping)
              </span>
            </td>
          </tr>
        `;
      });

      html += '</tbody></table></div></div>';
    } else {
      html += `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 14px;border-radius:8px;margin-bottom:18px;font-size:12.5px;color:#64748b;">
          No new examinations to add in the selected classes.
        </div>
      `;
    }

    // 4. UNCHANGED EXAMINATIONS (Collapsible Details)
    if (recon.unchangedRecords.length > 0) {
      html += `
        <details class="ex-unchanged-details">
          <summary>
            <i class="material-icons" style="font-size:15px;vertical-align:text-bottom;color:#3b82f6;">check_circle</i>
            <b>Unchanged Examinations (${recon.unchangedRecords.length} records matching exactly)</b>
            <span style="font-size:12px;color:#64748b;margin-left:6px;">— Dates and marks match database (untouched)</span>
          </summary>
          <div class="ex-tablewrap" style="margin-top:10px;">
            <table class="ex-diff-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Exam Name</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Max Marks</th>
                  <th>Database Status</th>
                </tr>
              </thead>
              <tbody>
      `;

      recon.unchangedRecords.forEach(function (item) {
        var rec = item.record;
        html += `
          <tr>
            <td>${esc(rec.grade)}</td>
            <td>${esc(rec.examName)}</td>
            <td>${esc(rec.subject)}</td>
            <td>${esc(rec.date || "Unscheduled")}</td>
            <td>${esc(rec.day || "-")}</td>
            <td>${esc(rec.marks != null ? rec.marks : "-")}</td>
            <td><span class="ex-status sched">Already Up to Date</span></td>
          </tr>
        `;
      });

      html += '</tbody></table></div></details>';
    }

    stepReview.innerHTML = html;

    // Toggle All New wiring
    var toggleAllNew = document.getElementById("exWizToggleAllNew");
    if (toggleAllNew) {
      toggleAllNew.addEventListener("change", function () {
        var val = toggleAllNew.checked;
        stepReview.querySelectorAll(".ex-new-chk").forEach(function (cb) {
          cb.checked = val;
          IMPORT_STATE.selectedNew[cb.getAttribute("data-idx")] = val;
        });
        updateConfirmButtonState();
      });
    }

    stepReview.querySelectorAll(".ex-new-chk").forEach(function (cb) {
      cb.addEventListener("change", function () {
        IMPORT_STATE.selectedNew[cb.getAttribute("data-idx")] = cb.checked;
        updateConfirmButtonState();
      });
    });

    // Toggle All Changed wiring
    var toggleAllChanged = document.getElementById("exWizToggleAllChanged");
    if (toggleAllChanged) {
      toggleAllChanged.addEventListener("change", function () {
        var val = toggleAllChanged.checked;
        stepReview.querySelectorAll(".ex-changed-chk").forEach(function (cb) {
          cb.checked = val;
          IMPORT_STATE.selectedChanged[cb.getAttribute("data-idx")] = val;
        });
        updateConfirmButtonState();
      });
    }

    stepReview.querySelectorAll(".ex-changed-chk").forEach(function (cb) {
      cb.addEventListener("change", function () {
        IMPORT_STATE.selectedChanged[cb.getAttribute("data-idx")] = cb.checked;
        updateConfirmButtonState();
      });
    });

    // Action buttons in footer
    actionBtns.innerHTML = `
      <button class="btn btn-secondary" id="exWizBackToClasses" style="width:auto;">&larr; Back to Class Selection</button>
      <button class="btn btn-success" id="exWizConfirmImport" style="width:auto;padding:10px 18px;font-weight:700;">
        <i class="material-icons" style="color:#fff;font-size:18px;vertical-align:middle;margin-right:4px;">done_all</i>
        Confirm and Import Schedule
      </button>
    `;

    document.getElementById("exWizBackToClasses").addEventListener("click", function () {
      renderClassSelectionStage(onComplete);
    });

    var confirmBtn = document.getElementById("exWizConfirmImport");
    function updateConfirmButtonState() {
      var countNew = Object.keys(IMPORT_STATE.selectedNew).filter(function (k) { return IMPORT_STATE.selectedNew[k]; }).length;
      var countChanged = Object.keys(IMPORT_STATE.selectedChanged).filter(function (k) { return IMPORT_STATE.selectedChanged[k]; }).length;
      if (confirmBtn) {
        confirmBtn.disabled = (countNew === 0 && countChanged === 0);
      }
    }
    updateConfirmButtonState();

    confirmBtn.addEventListener("click", function () {
      executeImport(recon, onComplete);
    });
  }

  // Step 4: Confirmation and Safe Import Execution
  function executeImport(recon, onComplete) {
    if (IMPORT_STATE.isImporting) return;
    IMPORT_STATE.isImporting = true;

    var confirmBtn = document.getElementById("exWizConfirmImport");
    var backBtn = document.getElementById("exWizBackToClasses");
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="material-icons" style="color:#fff;animation:spin 1s infinite linear;">sync</i> Importing…';
    }
    if (backBtn) backBtn.disabled = true;

    // Filter approved New and Changed records
    var approvedNew = recon.newRecords.filter(function (item) {
      return !!IMPORT_STATE.selectedNew[item._idx];
    });

    var approvedChanged = recon.changedRecords.filter(function (item) {
      return !!IMPORT_STATE.selectedChanged[item._idx];
    });

    var totalToProcess = approvedNew.length + approvedChanged.length;
    if (totalToProcess === 0) {
      alert("No examinations selected for import.");
      IMPORT_STATE.isImporting = false;
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="material-icons" style="color:#fff;">done_all</i> Confirm and Import Schedule';
      }
      if (backBtn) backBtn.disabled = false;
      return;
    }

    // Step 1: Batch updates for changed records via examBulkSaveSchedule
    var updatePromise = Promise.resolve({ success: true, saved: 0 });
    if (approvedChanged.length > 0) {
      var updates = approvedChanged.map(function (item) {
        return {
          rowId: item.rowId,
          date: item.record.date || "",
          marks: item.record.marks != null ? String(item.record.marks) : ""
        };
      });
      updatePromise = P.api("examBulkSaveSchedule", [updates]);
    }

    // Step 2: Sequential / batched creation of new exams via createAdminExam
    updatePromise.then(function (updateRes) {
      var newPromises = approvedNew.map(function (item) {
        var rec = item.record;
        var payload = {
          examName: rec.examName,
          grade: rec.grade,
          subject: rec.subject,
          date: rec.date || "",
          marks: String(rec.marks || ""),
          lessons: [],
          syllabusText: ""
        };
        return P.api("createAdminExam", [payload]).catch(function (e) {
          return { success: false, error: e.message || e };
        });
      });

      return Promise.all(newPromises).then(function (newResults) {
        var createdCount = newResults.filter(function (r) { return r && r.success; }).length;
        var failedCount = newResults.length - createdCount;
        var savedUpdates = (updateRes && updateRes.saved != null) ? updateRes.saved : approvedChanged.length;

        var msg = "Import successful! Created " + createdCount + " new examination(s)";
        if (approvedChanged.length > 0) {
          msg += " and updated " + savedUpdates + " discrepancy row(s).";
        } else {
          msg += ".";
        }
        if (failedCount > 0) {
          msg += " (" + failedCount + " rows failed to create).";
        }

        // Close modal
        var modal = document.getElementById("exImportWizardModal");
        if (modal) modal.remove();

        if (typeof onComplete === "function") {
          onComplete({
            created: createdCount,
            updated: savedUpdates,
            message: msg
          });
        }
      });
    }).catch(function (err) {
      alert("Error during schedule import: " + (err.message || err));
      IMPORT_STATE.isImporting = false;
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="material-icons" style="color:#fff;">done_all</i> Confirm and Import Schedule';
      }
      if (backBtn) backBtn.disabled = false;
    });
  }

  // Public API
  var api = {
    open: openImportWizard,
    getState: function () { return IMPORT_STATE; }
  };

  root.ExamScheduleImportUI = api;
  if (typeof globalThis !== 'undefined') {
    globalThis.ExamScheduleImportUI = api;
  }

})(typeof window !== 'undefined' ? window : this);

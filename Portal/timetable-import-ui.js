/* =========================================================================
   timetable-import-ui.js — 3-Stage Excel Import Wizard UI
   Stage 1: Upload workbook
   Stage 2: Two-column day selection (Primary | High School)
   Stage 3: Preview & Confirm
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Portal;
  var esc = P.esc;

  // State for the import wizard
  var IMPORT_STATE = {
    step: 1, // 1: upload, 2: select days, 3: preview/confirm
    file: null,
    parseResult: null,
    selectedDays: {}, // { 'Primary': {monday: true, ...}, 'High': {monday: true, ...} }
    classMapping: {}, // excelClass -> dbClass (auto-matched)
    unmatchedClasses: [], // classes that couldn't be auto-matched
    dryRun: true
  };

  // DOM elements
  var $modal = null;
  var $step1 = null;
  var $step2 = null;
  var $step3 = null;

  // Day definitions
  var DAYS = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' }
  ];

  // Target sheet names to detect
  var TARGET_SHEETS = [
    'PS Mon', 'PS Tue', 'PS Wed', 'PS Thu', 'PS Fri', 'PS Sat',
    'HS Mon', 'HS Tue', 'HS Wed', 'HS Thu', 'HS Fri', 'HS Sat'
  ];

  // Create the import wizard modal HTML
  function createImportModal() {
    return `
      <div class="modal-overlay" id="ttImportWizardModal">
        <div class="tt-wizard-modal">
          <!-- Wizard Header -->
          <div class="tt-wizard-header">
            <div class="tt-wizard-title">
              <i class="material-icons" style="vertical-align:middle;margin-right:8px;">upload_file</i>
              <span>Import Timetable from Excel</span>
            </div>
            <button class="tt-wizard-close" data-close="ttImportWizardModal">&times;</button>
          </div>

          <!-- Progress Steps -->
          <div class="tt-wizard-progress" id="ttWizardProgress">
            <div class="tt-wizard-step" data-step="1">
              <div class="tt-wizard-step-circle">1</div>
              <div class="tt-wizard-step-label">Upload</div>
            </div>
            <div class="tt-wizard-step-connector"></div>
            <div class="tt-wizard-step" data-step="2">
              <div class="tt-wizard-step-circle">2</div>
              <div class="tt-wizard-step-label">Select Days</div>
            </div>
            <div class="tt-wizard-step-connector"></div>
            <div class="tt-wizard-step" data-step="3">
              <div class="tt-wizard-step-circle">3</div>
              <div class="tt-wizard-step-label">Preview</div>
            </div>
          </div>

          <!-- Stage 1: File Upload -->
          <div class="tt-wizard-step-content" id="ttStep1" data-step="1">
            <div class="tt-wizard-step-header">
              <h3>Upload Timetable Workbook</h3>
              <p>Select the Excel file (.xlsx, .xls). The 12 required sheets will be auto-detected.</p>
            </div>
            <div class="tt-file-dropzone" id="ttFileDropzone">
              <i class="material-icons">cloud_upload</i>
              <p>Drag & drop Excel file here, or click to browse</p>
              <input type="file" id="ttFileInput" accept=".xlsx,.xls" style="display:none;">
              <button class="btn btn-outline" id="ttBrowseBtn">Browse Files</button>
            </div>
            <div class="tt-file-info" id="ttFileInfo" style="display:none;">
              <div class="tt-file-name"></div>
              <div class="tt-file-size"></div>
            </div>
            <div class="tt-parse-progress" id="ttParseProgress" style="display:none;">
              <div class="tt-progress-bar"><div class="tt-progress-fill"></div></div>
              <p class="tt-progress-text">Parsing workbook...</p>
            </div>
            <div class="tt-detected-summary" id="ttDetectedSummary" style="display:none;"></div>
            <div class="tt-wizard-actions">
              <button class="btn btn-primary" id="ttStep1Next" disabled>Select Days &rarr;</button>
            </div>
          </div>

          <!-- Stage 2: Day Selection (Two-column checklist) -->
          <div class="tt-wizard-step-content" id="ttStep2" data-step="2" style="display:none;">
            <div class="tt-wizard-step-header">
              <h3>Select Timetables to Update</h3>
              <p>Check the days you want to import. Only detected sheets are shown. All detected days are selected by default.</p>
            </div>

            <div class="tt-day-selection">
              <!-- Primary School Column -->
              <div class="tt-campus-column" id="ttPrimaryColumn">
                <div class="tt-campus-header">
                  <h4><i class="material-icons">school</i> Primary School</h4>
                  <div class="tt-campus-actions">
                    <button type="button" class="btn btn-sm btn-outline" id="ttSelectAllPrimary">Select All</button>
                    <button type="button" class="btn btn-sm btn-outline" id="ttClearAllPrimary">Clear All</button>
                  </div>
                </div>
                <div class="tt-day-list" id="ttPrimaryDays"></div>
              </div>

              <!-- High School Column -->
              <div class="tt-campus-column" id="ttHighColumn">
                <div class="tt-campus-header">
                  <h4><i class="material-icons">domain</i> High School</h4>
                  <div class="tt-campus-actions">
                    <button type="button" class="btn btn-sm btn-outline" id="ttSelectAllHigh">Select All</button>
                    <button type="button" class="btn btn-sm btn-outline" id="ttClearAllHigh">Clear All</button>
                  </div>
                </div>
                <div class="tt-day-list" id="ttHighDays"></div>
              </div>
            </div>

            <div class="tt-wizard-actions">
              <button class="btn btn-outline" id="ttStep2Back">&larr; Back</button>
              <button class="btn btn-primary" id="ttStep2Next">Preview & Confirm &rarr;</button>
            </div>
          </div>

          <!-- Stage 3: Preview & Confirm -->
          <div class="tt-wizard-step-content" id="ttStep3" data-step="3" style="display:none;">
            <div class="tt-wizard-step-header">
              <h3>Preview & Confirm Import</h3>
              <p>Review the parsed timetable before saving.</p>
            </div>

            <div class="tt-confirm-summary" id="ttConfirmSummary"></div>

            <div class="tt-confirm-options">
              <label class="tt-checkbox-label">
                <input type="checkbox" id="ttDryRun" checked>
                <span>Dry run first (preview changes without saving)</span>
              </label>
              <label class="tt-checkbox-label">
                <input type="checkbox" id="ttClearExisting" disabled>
                <span>Clear existing timetable for selected days before import</span>
              </label>
            </div>

            <div class="tt-preview-sections" id="ttPreviewSections" style="display:none;"></div>

            <div class="tt-wizard-actions">
              <button class="btn btn-outline" id="ttStep3Back">&larr; Back</button>
              <button class="btn btn-maroon" id="ttExecuteImport">
                <i class="material-icons">download_done</i> Import Timetable
              </button>
            </div>

            <div class="tt-import-result" id="ttImportResult" style="display:none;"></div>
          </div>
        </div>
      </div>
    `;
  }

  // CSS for the wizard
  function injectWizardCSS() {
    if (document.getElementById('tt-wizard-css')) return;
    var css = `
      /* Wizard Modal */
      .tt-wizard-modal {
        background: #fff;
        border-radius: 16px;
        max-width: 960px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      }
      .tt-wizard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-bottom: 1px solid var(--border);
      }
      .tt-wizard-title { font-size: 18px; font-weight: 700; color: var(--maroon); }
      .tt-wizard-close { border: none; background: none; font-size: 28px; cursor: pointer; color: var(--text-muted); padding: 0 8px; }
      .tt-wizard-close:hover { color: var(--text-main); }

      /* Progress Bar */
      .tt-wizard-progress {
        display: flex;
        align-items: center;
        padding: 16px 24px;
        background: #fafafa;
        border-bottom: 1px solid var(--border);
      }
      .tt-wizard-step { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; }
      .tt-wizard-step-circle {
        width: 36px; height: 36px; border-radius: 50%;
        background: #e2e8f0; color: #94a3b8;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 14px;
        transition: all 0.3s;
      }
      .tt-wizard-step[data-step="1"] .tt-wizard-step-circle { background: var(--maroon); color: #fff; }
      .tt-wizard-step.active .tt-wizard-step-circle { background: var(--maroon); color: #fff; box-shadow: 0 0 0 4px rgba(107,29,47,0.2); }
      .tt-wizard-step.completed .tt-wizard-step-circle { background: #065f46; color: #fff; }
      .tt-wizard-step.completed .tt-wizard-step-circle::after { content: '\\2713'; font-size: 16px; }
      .tt-wizard-step-label { margin-top: 6px; font-size: 12px; font-weight: 600; color: var(--text-muted); }
      .tt-wizard-step.active .tt-wizard-step-label { color: var(--maroon); }
      .tt-wizard-step-connector {
        flex: 1; height: 3px; background: #e2e8f0; margin: 0 8px;
        position: relative; top: -18px;
      }
      .tt-wizard-step.completed ~ .tt-wizard-step-connector { background: #065f46; }

      /* Step Content */
      .tt-wizard-step-content { flex: 1; padding: 24px; overflow-y: auto; }
      .tt-wizard-step-header h3 { margin: 0 0 4px; font-size: 18px; color: var(--text-main); }
      .tt-wizard-step-header p { margin: 0; color: var(--text-muted); font-size: 14px; }

      /* File Dropzone */
      .tt-file-dropzone {
        border: 2px dashed var(--border);
        border-radius: 12px;
        padding: 40px 24px;
        text-align: center;
        transition: all 0.2s;
        cursor: pointer;
      }
      .tt-file-dropzone:hover, .tt-file-dropzone.dragover {
        border-color: var(--maroon);
        background: #fdf8f8;
      }
      .tt-file-dropzone i { font-size: 48px; color: var(--maroon); margin-bottom: 12px; display: block; }
      .tt-file-dropzone p { margin: 0 0 16px; color: var(--text-muted); }
      .tt-file-dropzone input { display: none; }
      .tt-file-info { display: flex; align-items: center; gap: 16px; padding: 12px 16px; background: #f1f5f9; border-radius: 8px; margin-top: 16px; }
      .tt-file-name { font-weight: 600; color: var(--text-main); }
      .tt-file-size { color: var(--text-muted); font-size: 13px; }

      .tt-parse-progress { margin-top: 16px; }
      .tt-progress-bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
      .tt-progress-fill { height: 100%; background: var(--maroon); width: 0%; transition: width 0.3s; animation: pulse 1.5s infinite; }
      @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
      .tt-progress-text { margin: 8px 0 0; font-size: 13px; color: var(--text-muted); text-align: center; }

      /* Detected Summary */
      .tt-detected-summary { margin-top: 16px; padding: 16px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; }
      .tt-detected-summary h4 { margin: 0 0 12px; font-size: 14px; color: #065f46; }
      .tt-detected-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
      .tt-detected-item { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
      .tt-detected-item .tt-detected-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
      .tt-detected-item .tt-detected-value { font-size: 14px; font-weight: 600; color: var(--text-main); }

      /* Day Selection - Two Column Layout */
      .tt-day-selection {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin-top: 16px;
      }
      .tt-campus-column {
        background: #fafafa;
        border: 1px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
      }
      .tt-campus-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        background: #fff;
        border-bottom: 1px solid var(--border);
      }
      .tt-campus-header h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 8px; }
      .tt-campus-header h4 i { color: var(--maroon); font-size: 18px; }
      .tt-campus-actions { display: flex; gap: 8px; }
      .btn-sm { padding: 5px 10px; font-size: 11px; font-weight: 600; border-radius: 6px; }
      .tt-day-list { padding: 8px; }
      .tt-day-item {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        border-radius: 8px;
        margin-bottom: 6px;
        transition: background 0.15s;
      }
      .tt-day-item:hover { background: #fff; }
      .tt-day-item .tt-day-checkbox { width: 20px; height: 20px; accent-color: var(--maroon); margin-right: 12px; flex-shrink: 0; }
      .tt-day-item .tt-day-label { flex: 1; font-weight: 600; font-size: 14px; color: var(--text-main); }
      .tt-day-item .tt-day-meta { font-size: 12px; color: var(--text-muted); }
      .tt-day-item.missing { opacity: 0.5; }
      .tt-day-item.missing .tt-day-checkbox { cursor: not-allowed; }
      .tt-day-item.missing .tt-day-label { color: var(--text-muted); }

      /* Confirm Summary */
      .tt-confirm-summary { background: #fafafa; border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
      .tt-confirm-summary h4 { margin: 0 0 12px; font-size: 14px; color: var(--text-main); }
      .tt-confirm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
      .tt-confirm-item { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
      .tt-confirm-item .tt-confirm-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
      .tt-confirm-item .tt-confirm-value { font-size: 14px; font-weight: 600; color: var(--text-main); }
      .tt-confirm-item .tt-confirm-value.warning { color: #b45309; }
      .tt-confirm-item .tt-confirm-value.error { color: #b91c1c; }
      .tt-confirm-item .tt-confirm-value.success { color: #065f46; }

      /* Preview Sections */
      .tt-preview-sections { margin-top: 16px; }
      .tt-preview-section { margin-bottom: 24px; }
      .tt-preview-section h5 { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: var(--maroon); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
      .tt-preview-table { overflow-x: auto; }
      .tt-preview-table table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .tt-preview-table th, .tt-preview-table td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--border); }
      .tt-preview-table th { background: #fafafa; font-weight: 700; color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
      .tt-preview-table .tt-class-name { font-weight: 600; color: var(--maroon); }
      .tt-preview-table .tt-period-cell { font-family: monospace; font-size: 11px; }
      .tt-preview-table .tt-period-cell .tt-p-subj { font-weight: 600; }
      .tt-preview-table .tt-period-cell .tt-p-teach { color: #64748b; font-size: 10px; }
      .tt-preview-table .tt-period-cell .tt-p-act { color: #f59e0b; font-size: 10px; }
      .tt-preview-table .tt-empty { color: var(--text-muted); font-style: italic; }

      /* Unmatched Classes Alert */
      .tt-unmatched-alert {
        background: #fffbeb;
        border: 1px solid #fde68a;
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .tt-unmatched-alert h5 { margin: 0 0 8px; color: #b45309; display: flex; align-items: center; gap: 8px; }
      .tt-unmatched-alert ul { margin: 0; padding-left: 20px; font-size: 13px; }
      .tt-unmatched-alert li { margin-bottom: 4px; color: #78350f; }

      /* Checkbox Labels */
      .tt-checkbox-label { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; margin-bottom: 10px; }
      .tt-checkbox-label input { margin-top: 3px; accent-color: var(--maroon); }
      .tt-checkbox-label span { font-size: 13px; color: var(--text-main); line-height: 1.4; }
      .tt-checkbox-label input:disabled + span { color: var(--text-muted); }

      /* Wizard Actions */
      .tt-wizard-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 16px; border-top: 1px solid var(--border); margin-top: 8px; }
      .tt-wizard-actions .btn { min-width: 120px; }

      /* Import Result */
      .tt-import-result { margin-top: 16px; padding: 16px; border-radius: 10px; }
      .tt-import-result.success { background: #f0fdf4; border: 1px solid #86efac; }
      .tt-import-result.error { background: #fef2f2; border: 1px solid #fca5a5; }
      .tt-import-result h4 { margin: 0 0 8px; display: flex; align-items: center; gap: 8px; }
      .tt-import-result.success h4 { color: #065f46; }
      .tt-import-result.error h4 { color: #b91c1c; }
      .tt-import-result ul { margin: 0; padding-left: 20px; font-size: 13px; }
      .tt-import-result li { margin-bottom: 4px; }

      /* Mobile */
      @media (max-width: 900px) {
        .tt-wizard-modal { max-height: 100vh; border-radius: 0; }
        .tt-wizard-progress { flex-wrap: wrap; gap: 8px; }
        .tt-wizard-step-connector { display: none; }
        .tt-day-selection { grid-template-columns: 1fr; }
        .tt-confirm-grid { grid-template-columns: 1fr; }
        .tt-detected-grid { grid-template-columns: 1fr; }
      }
    `;
    var st = document.createElement('style');
    st.id = 'tt-wizard-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  // Initialize modal
  function initModal() {
    injectWizardCSS();
    var modalHtml = createImportModal();
    var container = document.createElement('div');
    container.innerHTML = modalHtml;
    document.body.appendChild(container.firstElementChild);

    $modal = document.getElementById('ttImportWizardModal');
    $step1 = document.getElementById('ttStep1');
    $step2 = document.getElementById('ttStep2');
    $step3 = document.getElementById('ttStep3');

    bindEvents();
  }

  // Bind all events
  function bindEvents() {
    // Close buttons
    $modal.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.onclick = function () { closeWizard(); };
    });
    $modal.addEventListener('click', function (e) {
      if (e.target === $modal) closeWizard();
    });

    // File dropzone
    var dropzone = document.getElementById('ttFileDropzone');
    var fileInput = document.getElementById('ttFileInput');
    var browseBtn = document.getElementById('ttBrowseBtn');

    browseBtn.onclick = function () { fileInput.click(); };
    fileInput.onchange = function () { handleFileSelect(fileInput.files[0]); };

    dropzone.addEventListener('dragover', function (e) { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('dragover'); });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
    });
    dropzone.onclick = function (e) {
      if (e.target === dropzone || e.target.tagName === 'I' || e.target.tagName === 'P') {
        fileInput.click();
      }
    };

    // Stage navigation
    document.getElementById('ttStep1Next').onclick = goToStep2;
    document.getElementById('ttStep2Back').onclick = function () { goToStep(1); };
    document.getElementById('ttStep2Next').onclick = goToStep3;
    document.getElementById('ttStep3Back').onclick = function () { goToStep(2); };
    document.getElementById('ttExecuteImport').onclick = executeImport;

    // Select All / Clear All buttons
    document.getElementById('ttSelectAllPrimary').onclick = function () { toggleAllDays('Primary', true); };
    document.getElementById('ttClearAllPrimary').onclick = function () { toggleAllDays('Primary', false); };
    document.getElementById('ttSelectAllHigh').onclick = function () { toggleAllDays('High', true); };
    document.getElementById('ttClearAllHigh').onclick = function () { toggleAllDays('High', false); };

    // Dry run checkbox
    document.getElementById('ttDryRun').onchange = function (e) {
      IMPORT_STATE.dryRun = e.target.checked;
      document.getElementById('ttClearExisting').disabled = e.target.checked;
      if (e.target.checked) document.getElementById('ttClearExisting').checked = false;
    };
  }

  // Handle file selection
  function handleFileSelect(file) {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      P.overlay(false);
      alert('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    IMPORT_STATE.file = file;
    IMPORT_STATE.step = 1;

    // Update UI
    var info = document.getElementById('ttFileInfo');
    info.querySelector('.tt-file-name').textContent = file.name;
    info.querySelector('.tt-file-size').textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
    info.style.display = 'flex';
    document.getElementById('ttBrowseBtn').textContent = 'Change File';
    document.getElementById('ttStep1Next').disabled = false;
  }

  // Parse the workbook
  function parseWorkbook() {
    var progress = document.getElementById('ttParseProgress');
    var nextBtn = document.getElementById('ttStep1Next');
    var summaryDiv = document.getElementById('ttDetectedSummary');

    progress.style.display = 'block';
    nextBtn.disabled = true;
    nextBtn.innerHTML = '<i class="material-icons" style="animation:spin 1s linear infinite;">sync</i> Parsing...';

    // Add spin animation
    if (!document.getElementById('tt-spin-css')) {
      var st = document.createElement('style');
      st.id = 'tt-spin-css';
      st.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
      document.head.appendChild(st);
    }

    return window.TimetableImportParser.parseWorkbook(IMPORT_STATE.file)
      .then(function (result) {
        IMPORT_STATE.parseResult = result;
        progress.style.display = 'none';
        nextBtn.disabled = false;
        nextBtn.innerHTML = 'Select Days &rarr;';

        // Initialize selected days: all detected sheets checked by default
        IMPORT_STATE.selectedDays = { Primary: {}, High: {} };
        result.sheets.forEach(function (sheet) {
          var campus = sheet.campus === 'High' ? 'High' : 'Primary';
          var dayKey = sheet.dayPattern;
          IMPORT_STATE.selectedDays[campus][dayKey] = true;
        });

        renderDetectedSummary(result);
        summaryDiv.style.display = 'block';
      })
      .catch(function (err) {
        progress.style.display = 'none';
        nextBtn.disabled = false;
        nextBtn.innerHTML = 'Select Days &rarr;';
        alert('Failed to parse file: ' + err.message);
      });
  }

  // Render detected sheets summary
  function renderDetectedSummary(result) {
    var container = document.getElementById('ttDetectedSummary');
    var primarySheets = result.sheets.filter(function (s) { return s.campus === 'Primary'; });
    var highSheets = result.sheets.filter(function (s) { return s.campus === 'High'; });

    var totalClasses = primarySheets.reduce(function (sum, s) { return sum + s.classes.length; }, 0) +
                       highSheets.reduce(function (sum, s) { return sum + s.classes.length; }, 0);
    var totalCells = primarySheets.reduce(function (sum, s) { return sum + s.classes.reduce(function (csum, c) { return csum + c.cells.length; }, 0); }, 0) +
                     highSheets.reduce(function (sum, s) { return sum + s.classes.reduce(function (csum, c) { return csum + c.cells.length; }, 0); }, 0);

    container.innerHTML = '<h4><i class="material-icons">check_circle</i> Workbook Parsed Successfully</h4>' +
      '<div class="tt-detected-grid">' +
        '<div class="tt-detected-item"><div class="tt-detected-label">Primary School Sheets</div><div class="tt-detected-value">' + primarySheets.length + ' / 6</div></div>' +
        '<div class="tt-detected-item"><div class="tt-detected-label">High School Sheets</div><div class="tt-detected-value">' + highSheets.length + ' / 6</div></div>' +
        '<div class="tt-detected-item"><div class="tt-detected-label">Total Classes</div><div class="tt-detected-value">' + totalClasses + '</div></div>' +
        '<div class="tt-detected-item"><div class="tt-detected-label">Total Timetable Entries</div><div class="tt-detected-value">' + totalCells + '</div></div>' +
      '</div>';
  }

  // Toggle all days for a campus
  function toggleAllDays(campus, checked) {
    if (!IMPORT_STATE.parseResult) return;
    DAYS.forEach(function (day) {
      var sheet = IMPORT_STATE.parseResult.sheets.find(function (s) {
        return s.campus === campus && s.dayPattern === day.key;
      });
      if (sheet) {
        IMPORT_STATE.selectedDays[campus][day.key] = checked;
      }
    });
    renderDaySelection();
  }

  // Render day selection (Stage 2)
  function renderDaySelection() {
    var result = IMPORT_STATE.parseResult;
    if (!result) return;

    var primaryContainer = document.getElementById('ttPrimaryDays');
    var highContainer = document.getElementById('ttHighDays');

    primaryContainer.innerHTML = '';
    highContainer.innerHTML = '';

    DAYS.forEach(function (day) {
      // Check if sheet was detected for this campus+day
      var primarySheet = result.sheets.find(function (s) { return s.campus === 'Primary' && s.dayPattern === day.key; });
      var highSheet = result.sheets.find(function (s) { return s.campus === 'High' && s.dayPattern === day.key; });

      // Primary
      var primaryChecked = IMPORT_STATE.selectedDays.Primary[day.key] === true;
      var primaryMissing = !primarySheet;
      var primaryItem = document.createElement('div');
      primaryItem.className = 'tt-day-item' + (primaryMissing ? ' missing' : '');
      primaryItem.innerHTML =
        '<input type="checkbox" class="tt-day-checkbox" data-campus="Primary" data-day="' + day.key + '" ' +
        (primaryChecked ? 'checked' : '') + (primaryMissing ? ' disabled' : '') + '>' +
        '<span class="tt-day-label">' + day.label + '</span>' +
        (primarySheet
          ? '<span class="tt-day-meta">' + primarySheet.classes.length + ' classes, ' + primarySheet.detectedPeriods + ' periods</span>'
          : '<span class="tt-day-meta">Sheet not found</span>');
      primaryContainer.appendChild(primaryItem);

      // High
      var highChecked = IMPORT_STATE.selectedDays.High[day.key] === true;
      var highMissing = !highSheet;
      var highItem = document.createElement('div');
      highItem.className = 'tt-day-item' + (highMissing ? ' missing' : '');
      highItem.innerHTML =
        '<input type="checkbox" class="tt-day-checkbox" data-campus="High" data-day="' + day.key + '" ' +
        (highChecked ? 'checked' : '') + (highMissing ? ' disabled' : '') + '>' +
        '<span class="tt-day-label">' + day.label + '</span>' +
        (highSheet
          ? '<span class="tt-day-meta">' + highSheet.classes.length + ' classes, ' + highSheet.detectedPeriods + ' periods</span>'
          : '<span class="tt-day-meta">Sheet not found</span>');
      highContainer.appendChild(highItem);
    });

    // Bind checkboxes
    document.querySelectorAll('.tt-day-checkbox').forEach(function (cb) {
      cb.onchange = function () {
        var campus = this.getAttribute('data-campus');
        var day = this.getAttribute('data-day');
        IMPORT_STATE.selectedDays[campus][day] = this.checked;
      };
    });
  }

  // Go to Stage 2
  function goToStep2() {
    parseWorkbook().then(function () {
      goToStep(2);
    }).catch(function (err) {
      // Error already handled in parseWorkbook
    });
  }

  // Go to Stage 3
  function goToStep3() {
    // Build class mapping and detect unmatched classes
    buildClassMapping();
    goToStep(3);
  }

  // Navigate to step
  function goToStep(step) {
    IMPORT_STATE.step = step;

    // Update progress
    document.querySelectorAll('.tt-wizard-step').forEach(function (el, i) {
      var s = i + 1;
      el.classList.toggle('active', s === step);
      el.classList.toggle('completed', s < step);
    });
    document.querySelectorAll('.tt-wizard-step-connector').forEach(function (el, i) {
      el.classList.toggle('tt-wizard-step-completed', i < step - 1);
    });

    // Show/hide step content
    [$step1, $step2, $step3].forEach(function (el, i) {
      el.style.display = (i + 1 === step) ? 'block' : 'none';
    });

    if (step === 2) renderDaySelection();
    if (step === 3) renderPreview();
  }

  // Build class mapping automatically
  function buildClassMapping() {
    var result = IMPORT_STATE.parseResult;
    if (!result) return;

    // Get existing DB classes from bootstrap
    var dbClassesObj = (window.TT_BOOT && window.TT_BOOT.classes) ? window.TT_BOOT.classes : { Primary: [], High: [] };
    var allDbClasses = (dbClassesObj.Primary || []).concat(dbClassesObj.High || []);

    // Fallback if DB classes not yet loaded from bootstrap
    if (!allDbClasses.length) {
      allDbClasses = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    }

    // Normalize DB class names for matching
    var dbClassMap = new Map();
    allDbClasses.forEach(function (dbClass) {
      var normalized = normalizeForMatching(dbClass);
      if (!dbClassMap.has(normalized)) {
        dbClassMap.set(normalized, dbClass);
      }
    });

    IMPORT_STATE.classMapping = {};
    IMPORT_STATE.unmatchedClasses = [];

    // Collect all unique Excel classes from selected sheets
    var selectedSheets = result.sheets.filter(function (sheet) {
      return IMPORT_STATE.selectedDays[sheet.campus === 'High' ? 'High' : 'Primary'][sheet.dayPattern];
    });

    var excelClasses = new Set();
    selectedSheets.forEach(function (sheet) {
      sheet.classes.forEach(function (cls) { excelClasses.add(cls.class); });
    });

    excelClasses.forEach(function (excelClass) {
      var normalized = normalizeForMatching(excelClass);
      var matched = dbClassMap.get(normalized);

      if (matched) {
        IMPORT_STATE.classMapping[excelClass] = matched;
      } else {
        // Fallback for grade numbers
        var gradeMatch = excelClass.match(/^GRADE-(\d+)$/i);
        if (gradeMatch) {
          var gradeNum = gradeMatch[1];
          if (dbClassMap.has('GRADE-' + gradeNum)) {
            IMPORT_STATE.classMapping[excelClass] = dbClassMap.get('GRADE-' + gradeNum);
            return;
          }
        }
        // If no match in DB, default to self
        IMPORT_STATE.classMapping[excelClass] = excelClass;
      }
    });
  }

  // Normalize class name for matching (handles Nursery/Pre-KG, LKG, UKG, and Grade 1..10)
  function normalizeForMatching(raw) {
    if (!raw) return '';
    var s = String(raw).trim().toUpperCase()
      .replace(/\s+/g, '')
      .replace(/\.0+$/, '');
    if (/^(PRE[-]?KG|PREKG|NURSERY)$/i.test(s)) return 'NURSERY';
    if (/^LKG$/i.test(s)) return 'LKG';
    if (/^UKG$/i.test(s)) return 'UKG';
    var m = s.match(/^(?:GRADE|CLASS)?[-]?(\d+)$/i);
    if (m) return 'GRADE-' + m[1];
    return s;
  }

  // Render preview (Stage 3)
  function renderPreview() {
    var result = IMPORT_STATE.parseResult;
    if (!result) return;

    var container = document.getElementById('ttConfirmSummary');

    // Count selected sheets
    var selectedSheets = result.sheets.filter(function (sheet) {
      return IMPORT_STATE.selectedDays[sheet.campus === 'High' ? 'High' : 'Primary'][sheet.dayPattern];
    });

    var campuses = new Set();
    var dayPatterns = new Set();
    var totalClasses = 0;
    var totalCells = 0;
    var maxPeriods = 0;

    selectedSheets.forEach(function (sheet) {
      campuses.add(sheet.campus);
      dayPatterns.add(sheet.dayPattern);
      totalClasses += sheet.classes.length;
      sheet.classes.forEach(function (cls) {
        totalCells += cls.cells.length;
        cls.cells.forEach(function (c) { maxPeriods = Math.max(maxPeriods, c.period_no); });
      });
    });

    container.innerHTML =
      '<div class="tt-confirm-grid">' +
        '<div class="tt-confirm-item"><div class="tt-confirm-label">Sheets Selected</div><div class="tt-confirm-value">' + selectedSheets.length + '</div></div>' +
        '<div class="tt-confirm-item"><div class="tt-confirm-label">Campuses</div><div class="tt-confirm-value">' + Array.from(campuses).join(', ') + '</div></div>' +
        '<div class="tt-confirm-item"><div class="tt-confirm-label">Days</div><div class="tt-confirm-value">' + Array.from(dayPatterns).map(function(d) { return d.charAt(0).toUpperCase() + d.slice(1); }).join(', ') + '</div></div>' +
        '<div class="tt-confirm-item"><div class="tt-confirm-label">Classes</div><div class="tt-confirm-value success">' + totalClasses + '</div></div>' +
        '<div class="tt-confirm-item"><div class="tt-confirm-label">Teaching Periods</div><div class="tt-confirm-value">' + maxPeriods + '</div></div>' +
        '<div class="tt-confirm-item"><div class="tt-confirm-label">Total Entries</div><div class="tt-confirm-value">' + totalCells + '</div></div>' +
        '<div class="tt-confirm-item"><div class="tt-confirm-label">Unmatched Classes</div><div class="tt-confirm-value ' + (IMPORT_STATE.unmatchedClasses.length ? 'warning' : 'success') + '">' + IMPORT_STATE.unmatchedClasses.length + '</div></div>' +
        '<div class="tt-confirm-item"><div class="tt-confirm-label">Mode</div><div class="tt-confirm-value ' + (IMPORT_STATE.dryRun ? 'warning' : 'error') + '">' + (IMPORT_STATE.dryRun ? 'Dry Run' : 'Live Import') + '</div></div>' +
      '</div>';

    // Show unmatched classes alert if any
    var unmatchedAlert = '';
    if (IMPORT_STATE.unmatchedClasses.length > 0) {
      unmatchedAlert =
        '<div class="tt-unmatched-alert">' +
          '<h5><i class="material-icons">warning</i> Unmatched Classes (will be skipped)</h5>' +
          '<ul>' + IMPORT_STATE.unmatchedClasses.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
        '</div>';
    }

    // Render preview tables inside a clean collapsible accordion so Stage 3 remains simple and uncluttered
    var previewHtml = unmatchedAlert;
    selectedSheets.forEach(function (sheet) {
      previewHtml += renderSheetPreviewTable(sheet);
    });

    var detailsHtml =
      '<details class="tt-preview-accordion" style="margin-top:16px;">' +
        '<summary style="cursor:pointer;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-weight:600;font-size:13px;color:#334155;user-select:none;display:flex;align-items:center;gap:6px;">' +
          '<i class="material-icons" style="font-size:18px;color:#800000;">list_alt</i> View Full Schedule Tables (Optional)' +
        '</summary>' +
        '<div style="margin-top:12px;">' + previewHtml + '</div>' +
      '</details>';

    document.getElementById('ttPreviewSections').innerHTML = detailsHtml;
    document.getElementById('ttPreviewSections').style.display = 'block';
  }

  // Render preview table for a single sheet
  function renderSheetPreviewTable(sheet) {
    var campusLabel = sheet.campus === 'High' ? 'High School' : 'Primary School';
    var dayLabel = sheet.dayPattern.charAt(0).toUpperCase() + sheet.dayPattern.slice(1);

    // Get max periods for this sheet
    var maxP = 0;
    sheet.classes.forEach(function (cls) {
      cls.cells.forEach(function (c) { maxP = Math.max(maxP, c.period_no); });
    });

    // Build header
    var header = '<th>Class</th>';
    for (var p = 1; p <= maxP; p++) {
      var pt = sheet.periodTimes.find(function (t) { return t.period_no === p; });
      var label = pt && pt.label ? pt.label : 'Period ' + p;
      header += '<th>P' + p + (pt && pt.start_time ? ' (' + pt.start_time + '-' + pt.end_time + ')' : '') + '</th>';
    }

    // Build rows
    var rows = sheet.classes.map(function (cls) {
      var mappedClass = IMPORT_STATE.classMapping[cls.class] || cls.class;
      var isUnmatched = IMPORT_STATE.unmatchedClasses.includes(cls.class);
      var row = '<td class="tt-class-name' + (isUnmatched ? ' error' : '') + '">' + esc(mappedClass) + (isUnmatched ? ' <span style="color:#b91c1c;font-size:10px;">(unmatched)</span>' : '') + '</td>';

      for (var p = 1; p <= maxP; p++) {
        var cell = cls.cells.find(function (c) { return c.period_no === p; });
        if (cell && cell.subject) {
          var actBadge = cell.isActivity ? '<span class="tt-p-act"> [Activity]</span>' : '';
          row += '<td class="tt-period-cell"><span class="tt-p-subj">' + esc(cell.subject) + '</span>' +
                 (cell.teacher ? '<br><span class="tt-p-teach">' + esc(cell.teacher) + '</span>' : '') +
                 actBadge + '</td>';
        } else {
          row += '<td class="tt-period-cell tt-empty">—</td>';
        }
      }
      return '<tr>' + row + '</tr>';
    }).join('');

    return '<div class="tt-preview-section">' +
      '<h5><i class="material-icons">description</i> ' + campusLabel + ' — ' + dayLabel + ' (' + sheet.classes.length + ' classes, ' + maxP + ' periods)</h5>' +
      '<div class="tt-preview-table"><table><thead><tr>' + header + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>';
  }

  // Execute import
  function executeImport() {
    var btn = document.getElementById('ttExecuteImport');
    var resultDiv = document.getElementById('ttImportResult');

    btn.disabled = true;
    btn.innerHTML = '<i class="material-icons" style="animation:spin 1s linear infinite;">sync</i> ' +
      (IMPORT_STATE.dryRun ? 'Running dry run...' : 'Importing...');
    resultDiv.style.display = 'none';

    // Build payload
    var payload = buildImportPayload();

    // Call API
    var apiFn = IMPORT_STATE.dryRun ? 'ttBulkUpsertDryRun' : 'ttBulkUpsert';

    P.api(apiFn, [payload], { text: IMPORT_STATE.dryRun ? 'Running dry run...' : 'Importing timetable...' })
      .then(function (res) {
        btn.disabled = false;
        btn.innerHTML = '<i class="material-icons">download_done</i> Import Timetable';

        resultDiv.className = 'tt-import-result ' + (res.success ? 'success' : 'error');
        resultDiv.style.display = 'block';

        var html = '<h4><i class="material-icons">' + (res.success ? 'check_circle' : 'error') + '</i> ' +
          (res.success ? (IMPORT_STATE.dryRun ? 'Dry Run Passed Successfully' : 'Import Complete') : 'Import Failed') + '</h4>';

        if (res.summary) {
          html += '<ul>';
          html += '<li>Classes processed: ' + (res.summary.classesProcessed || 0) + '</li>';
          html += '<li>Total entries to import: ' + (res.summary.cellsToUpsert || res.summary.cellsUpserted || 0) + '</li>';
          if (res.summary.cellsUpdated !== undefined) {
            html += '<li>Existing entries to update: ' + res.summary.cellsUpdated + '</li>';
          }
          if (res.summary.cellsNew !== undefined) {
            html += '<li>New entries to insert: ' + res.summary.cellsNew + '</li>';
          }
          if (res.summary.cellsUnchanged !== undefined && res.summary.cellsUnchanged > 0) {
            html += '<li>Unchanged entries: ' + res.summary.cellsUnchanged + '</li>';
          }
          if (res.summary.cellsToClear || res.summary.cellsCleared) {
            html += '<li>Entries to clear: ' + (res.summary.cellsToClear || res.summary.cellsCleared) + '</li>';
          }

          // Check for real teacher collisions
          var collisions = res.summary.teacherCollisions || [];
          if (!collisions.length && res.summary.conflicts && res.summary.conflicts.length) {
            // Filter out normal updates if server returned old-style diffs
            collisions = res.summary.conflicts.filter(function (c) {
              return /collision|assigned to multiple/i.test(c);
            });
          }

          if (collisions.length > 0) {
            html += '<li class="warning">Teacher schedule collisions (' + collisions.length + '): ' + esc(collisions.join('; ')) + '</li>';
          } else {
            html += '<li style="color:#15803d;font-weight:600;"><i class="material-icons" style="font-size:16px;vertical-align:text-bottom;">check</i> Teacher schedule collisions: None detected</li>';
          }
          html += '</ul>';
        }

        if (IMPORT_STATE.dryRun && res.success) {
          html += '<p style="margin-top:12px;font-weight:600;color:#15803d;"><i class="material-icons" style="vertical-align:middle;font-size:18px;">verified</i> Dry run verified 0 database writes. Uncheck "Dry run first" above to perform the live import.</p>';
        }

        if (res.errors && res.errors.length) {
          html += '<ul style="color:#b91c1c;">';
          res.errors.forEach(function (e) { html += '<li>' + esc(e) + '</li>'; });
          html += '</ul>';
        }

        resultDiv.innerHTML = html;
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="material-icons">download_done</i> Import Timetable';
        resultDiv.className = 'tt-import-result error';
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<h4><i class="material-icons">error</i> Import Failed</h4><p>' + esc(err.message || err) + '</p>';
      });
  }

  // Build import payload
  function buildImportPayload() {
    var result = IMPORT_STATE.parseResult;
    var allCells = [];
    var classCreates = [];
    var dayCampusMap = new Map(); // dayPattern -> campus

    var selectedSheets = result.sheets.filter(function (sheet) {
      return IMPORT_STATE.selectedDays[sheet.campus === 'High' ? 'High' : 'Primary'][sheet.dayPattern];
    });

    selectedSheets.forEach(function (sheet) {
      dayCampusMap.set(sheet.dayPattern, sheet.campus);

      sheet.classes.forEach(function (cls) {
        var mapping = IMPORT_STATE.classMapping[cls.class];
        if (!mapping || IMPORT_STATE.unmatchedClasses.includes(cls.class)) return;

        var targetClass = mapping;

        cls.cells.forEach(function (cell) {
          allCells.push({
            day: sheet.dayPattern,
            campus: sheet.campus,
            class: targetClass,
            period_no: cell.period_no,
            subject: cell.subject,
            teacher: cell.teacher,
            isActivity: cell.isActivity
          });
        });
      });
    });

    return {
      cells: allCells,
      classCreates: classCreates,
      dayCampusMap: Object.fromEntries(dayCampusMap),
      periodMapping: {},
      clearExisting: document.getElementById('ttClearExisting').checked,
      dryRun: IMPORT_STATE.dryRun
    };
  }

  // Open wizard
  function openWizard() {
    if (!$modal) initModal();

    // Reset state
    IMPORT_STATE = {
      step: 1,
      file: null,
      parseResult: null,
      selectedDays: { Primary: {}, High: {} },
      classMapping: {},
      unmatchedClasses: [],
      dryRun: true
    };

    // Reset UI
    document.getElementById('ttFileInfo').style.display = 'none';
    document.getElementById('ttParseProgress').style.display = 'none';
    document.getElementById('ttDetectedSummary').style.display = 'none';
    document.getElementById('ttFileInput').value = '';
    document.getElementById('ttBrowseBtn').textContent = 'Browse Files';
    document.getElementById('ttStep1Next').disabled = true;
    document.getElementById('ttDryRun').checked = true;
    document.getElementById('ttClearExisting').checked = false;
    document.getElementById('ttClearExisting').disabled = true;
    document.getElementById('ttImportResult').style.display = 'none';
    document.getElementById('ttPreviewSections').style.display = 'none';

    goToStep(1);
    $modal.classList.add('show');
    P.overlay(true, 'Opening import wizard...');
    setTimeout(function () { P.overlay(false); }, 100);
  }

  // Close wizard
  function closeWizard() {
    if ($modal) $modal.classList.remove('show');
  }

  // Export
  window.TimetableImportWizard = {
    open: openWizard,
    close: closeWizard,
    init: initModal
  };
})();
// Application State
const state = {
  targetFormat: 'original', // 'original', 'webp', 'svg', 'avif', 'png', 'jpg'
  compressionMode: 'smart', // 'smart', 'target-size', or 'manual'
  targetSize: 500,
  targetUnit: 'KB',
  quality: 82,
  lossless: false,
  maxWidth: '',
  svgMode: 'posterize',
  theme: 'system', // 'system', 'light', 'dark'
  destType: 'same', // 'same' or 'custom'
  outputDir: '',
  suffix: '',
  replaceOriginal: false,
  autoProcessSingle: false, // Don't auto-run, stage for review
  stagedFiles: [], // Files waiting to be processed
  queue: [], // Current active/completed queue items
  isProcessing: false,
  totalInputBytes: 0,
  totalOutputBytes: 0
};

// DOM Elements
const formatSelector = document.getElementById('format-selector');
const btnModeSmart = document.getElementById('btn-mode-smart');
const btnModeTarget = document.getElementById('btn-mode-target');
const btnModeManual = document.getElementById('btn-mode-manual');
const manualTuningPanel = document.getElementById('manual-tuning-panel');
const targetTuningPanel = document.getElementById('target-tuning-panel');
const targetSizeVal = document.getElementById('target-size-val');
const targetSizeUnit = document.getElementById('target-size-unit');
const targetPresetsList = document.getElementById('target-presets-list');
const btnPasteClipboard = document.getElementById('btn-paste-clipboard');
const toastEl = document.getElementById('toast');
const qualitySlider = document.getElementById('quality-slider');
const qualityVal = document.getElementById('quality-val');
const qualityPreset = document.getElementById('quality-preset');
const btnResetQuality = document.getElementById('btn-reset-quality');
const losslessToggle = document.getElementById('lossless-toggle');
const resizeSelect = document.getElementById('resize-select');
const svgModeContainer = document.getElementById('svg-mode-container');
const svgModeSelect = document.getElementById('svg-mode-select');

// Destination controls
const destRadioSame = document.getElementById('dest-radio-same');
const destRadioCustom = document.getElementById('dest-radio-custom');
const inlineCustomFolder = document.getElementById('inline-custom-folder');
const inlineFolderPath = document.getElementById('inline-folder-path');
const btnBrowseTargetFolder = document.getElementById('btn-browse-target-folder');

// Theme control
const themeControl = document.getElementById('theme-control');

// Staging Banner
const stagingBanner = document.getElementById('staging-banner');
const stagingTitleText = document.getElementById('staging-title-text');
const stagingCount = document.getElementById('staging-count');
const stagingSize = document.getElementById('staging-size');
const stagingDest = document.getElementById('staging-dest');
const btnStartBatch = document.getElementById('btn-start-batch');
const btnCancelStaging = document.getElementById('btn-cancel-staging');

// Drop Zone
const dropZone = document.getElementById('drop-zone');
const dropOverlay = document.getElementById('drop-overlay');
const btnBrowseFiles = document.getElementById('btn-browse-files');
const btnBrowseFolder = document.getElementById('btn-browse-folder');

// Results & Queue
const resultsSection = document.getElementById('results-section');
const statCount = document.getElementById('stat-count');
const statSaved = document.getElementById('stat-saved');
const queueList = document.getElementById('queue-list');
const btnClearQueue = document.getElementById('btn-clear-queue');
const progressBarContainer = document.getElementById('progress-bar-container');
const progressBarFill = document.getElementById('progress-bar-fill');

// Settings Modal & About
const btnSettings = document.getElementById('btn-settings');
const settingsModal = document.getElementById('settings-modal');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnSaveSettings = document.getElementById('btn-save-settings');
const settingSuffix = document.getElementById('setting-suffix');
const settingReplaceOriginal = document.getElementById('setting-replace-original');
const settingAutoProcess = document.getElementById('setting-auto-process');

// Footer & Updates Elements
const footerVersionTag = document.getElementById('footer-version-tag');
const linkFooterAuthor = document.getElementById('link-footer-author');
const btnFooterCheckUpdates = document.getElementById('btn-footer-check-updates');
const settingsAppVersion = document.getElementById('settings-app-version');
const btnCheckUpdates = document.getElementById('btn-check-updates');
const updateStatusText = document.getElementById('update-status-text');
const updateDetailsBox = document.getElementById('update-details-box');
const updateBanner = document.getElementById('update-banner');
const btnDownloadUpdate = document.getElementById('btn-download-update');
const btnReleaseNotes = document.getElementById('btn-release-notes');
const linkSettingsAuthor = document.getElementById('link-settings-author');
const linkGithubRepo = document.getElementById('link-github-repo');

let currentAppVersion = '1.0.0';
let latestReleaseData = null;

// Helper: Format bytes
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + (sizes[i] || 'MB');
}

// ----------------------------------------------------
// Theme Management (System, Light, Dark)
// ----------------------------------------------------
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);

  if (themeControl) {
    themeControl.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }

  if (window.api && window.api.setTheme) {
    window.api.setTheme(theme);
  }
}

themeControl.addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-btn');
  if (!btn) return;
  applyTheme(btn.dataset.theme);
  saveSettingsToDisk();
});

// ----------------------------------------------------
// Toast Feedback
// ----------------------------------------------------
let toastTimeout = null;
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2200);
}

// ----------------------------------------------------
// Compression Mode (Smart vs Target Size vs Manual)
// ----------------------------------------------------
function getTargetSizeBytes() {
  const val = parseFloat(targetSizeVal ? targetSizeVal.value : state.targetSize) || 500;
  const unit = targetSizeUnit ? targetSizeUnit.value : state.targetUnit;
  return unit === 'MB' ? Math.round(val * 1024 * 1024) : Math.round(val * 1024);
}

function setCompressionMode(mode) {
  state.compressionMode = mode;
  btnModeSmart.classList.toggle('active', mode === 'smart');
  if (btnModeTarget) btnModeTarget.classList.toggle('active', mode === 'target-size');
  btnModeManual.classList.toggle('active', mode === 'manual');

  if (mode === 'manual') {
    manualTuningPanel.classList.remove('hidden');
    if (targetTuningPanel) targetTuningPanel.classList.add('hidden');
  } else if (mode === 'target-size') {
    if (targetTuningPanel) targetTuningPanel.classList.remove('hidden');
    manualTuningPanel.classList.add('hidden');
  } else {
    manualTuningPanel.classList.add('hidden');
    if (targetTuningPanel) targetTuningPanel.classList.add('hidden');
  }
}

btnModeSmart.addEventListener('click', () => {
  setCompressionMode('smart');
  saveSettingsToDisk();
});
if (btnModeTarget) {
  btnModeTarget.addEventListener('click', () => {
    setCompressionMode('target-size');
    saveSettingsToDisk();
  });
}
btnModeManual.addEventListener('click', () => {
  setCompressionMode('manual');
  saveSettingsToDisk();
});

if (targetPresetsList) {
  targetPresetsList.addEventListener('click', (e) => {
    const chip = e.target.closest('.target-chip');
    if (!chip) return;
    targetPresetsList.querySelectorAll('.target-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    targetSizeVal.value = chip.dataset.size;
    targetSizeUnit.value = chip.dataset.unit;
    targetSizeUnit.dispatchEvent(new Event('change', { bubbles: true }));
    state.targetSize = parseFloat(chip.dataset.size);
    state.targetUnit = chip.dataset.unit;
    saveSettingsToDisk();
  });
}

if (targetSizeVal) {
  targetSizeVal.addEventListener('input', () => {
    state.targetSize = parseFloat(targetSizeVal.value) || 500;
  });
  targetSizeVal.addEventListener('change', () => {
    saveSettingsToDisk();
  });
}

if (targetSizeUnit) {
  targetSizeUnit.addEventListener('change', () => {
    state.targetUnit = targetSizeUnit.value;
    saveSettingsToDisk();
  });
}

// ----------------------------------------------------
// Clipboard Image Ingestion (Cmd+V)
// ----------------------------------------------------
async function handleClipboardPaste() {
  // Don't intercept paste while a text input or modal is focused/open
  const active = document.activeElement;
  if (active && ['INPUT', 'TEXTAREA'].includes(active.tagName)) return;
  if (settingsModal && !settingsModal.classList.contains('hidden')) return;

  try {
    const clipData = await window.api.readClipboardImage();
    if (!clipData) {
      showToast('No image in clipboard');
      return;
    }
    const item = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: clipData.fileName,
      path: clipData.filePath,
      size: clipData.size,
      ext: 'PNG',
      status: 'pending',
      result: null
    };
    state.queue.unshift(item);
    renderQueueCard(item);
    resultsSection.classList.remove('hidden');
    showToast('✓ Screenshot pasted from clipboard');
    if (!state.isProcessing) {
      processNextBatch();
    }
  } catch (err) {
    console.error('Clipboard paste failed:', err);
    showToast('Could not read clipboard');
  }
}

if (btnPasteClipboard) {
  btnPasteClipboard.addEventListener('click', handleClipboardPaste);
}

window.addEventListener('paste', handleClipboardPaste);

// ----------------------------------------------------
// Smooth Quality Slider
// ----------------------------------------------------
let sliderRafId = null;

function updateQualityDisplay() {
  const val = parseInt(qualitySlider.value, 10);
  state.quality = val;

  if (state.lossless) {
    qualityVal.textContent = '100%';
    if (qualityPreset) {
      qualityPreset.textContent = 'Lossless';
      qualityPreset.className = 'quality-preset-tag preset-lossless';
    }
  } else {
    qualityVal.textContent = `${val}%`;

    if (qualityPreset) {
      if (val === 82) {
        qualityPreset.textContent = 'Sweet Spot';
        qualityPreset.className = 'quality-preset-tag preset-sweetspot';
      } else if (val >= 90) {
        qualityPreset.textContent = 'High Quality';
        qualityPreset.className = 'quality-preset-tag preset-high';
      } else if (val <= 60) {
        qualityPreset.textContent = 'Compact';
        qualityPreset.className = 'quality-preset-tag preset-compact';
      } else {
        qualityPreset.textContent = 'Balanced';
        qualityPreset.className = 'quality-preset-tag preset-balanced';
      }
    }
  }
}

qualitySlider.addEventListener('input', () => {
  if (sliderRafId) cancelAnimationFrame(sliderRafId);
  sliderRafId = requestAnimationFrame(updateQualityDisplay);
});

qualitySlider.addEventListener('change', () => {
  saveSettingsToDisk();
});

losslessToggle.addEventListener('change', (e) => {
  state.lossless = e.target.checked;
  qualitySlider.disabled = state.lossless;

  if (state.lossless) {
    qualitySlider.value = 100;
  } else {
    qualitySlider.value = 82; // Reset back to default Sweet Spot
  }

  updateQualityDisplay();
  saveSettingsToDisk();
});

if (btnResetQuality) {
  btnResetQuality.addEventListener('click', () => {
    state.quality = 82;
    qualitySlider.value = 82;
    state.lossless = false;
    losslessToggle.checked = false;
    qualitySlider.disabled = false;
    updateQualityDisplay();
    saveSettingsToDisk();
  });
}

resizeSelect.addEventListener('change', (e) => {
  state.maxWidth = e.target.value;
  saveSettingsToDisk();
});

svgModeSelect.addEventListener('change', (e) => {
  state.svgMode = e.target.value;
  saveSettingsToDisk();
});

// ----------------------------------------------------
// Format Selector
// ----------------------------------------------------
formatSelector.addEventListener('click', (e) => {
  const btn = e.target.closest('.pill');
  if (!btn) return;

  formatSelector.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');

  state.targetFormat = btn.dataset.format;

  if (state.targetFormat === 'svg') {
    svgModeContainer.classList.remove('hidden');
  } else {
    svgModeContainer.classList.add('hidden');
  }

  updateStagingInfo();
  saveSettingsToDisk();
});

// ----------------------------------------------------
// Inline Destination Folder Controls
// ----------------------------------------------------
destRadioSame.addEventListener('change', () => {
  state.destType = 'same';
  inlineCustomFolder.classList.add('hidden');
  updateStagingInfo();
  saveSettingsToDisk();
});

destRadioCustom.addEventListener('change', () => {
  state.destType = 'custom';
  inlineCustomFolder.classList.remove('hidden');
  if (state.outputDir) {
    inlineFolderPath.textContent = state.outputDir.split('/').pop() || state.outputDir;
    inlineFolderPath.title = state.outputDir;
  }
  updateStagingInfo();
  saveSettingsToDisk();
});

btnBrowseTargetFolder.addEventListener('click', async () => {
  const dir = await window.api.selectDirectory();
  if (dir) {
    state.outputDir = dir;
    inlineFolderPath.textContent = dir.split('/').pop() || dir;
    inlineFolderPath.title = dir;
    updateStagingInfo();
    saveSettingsToDisk();
  }
});

// ----------------------------------------------------
// Staging & Batch Actions
// ----------------------------------------------------
function updateStagingInfo() {
  if (state.stagedFiles.length === 0) {
    stagingBanner.classList.add('hidden');
    return;
  }

  stagingBanner.classList.remove('hidden');
  const count = state.stagedFiles.length;
  if (stagingCount) stagingCount.textContent = count;
  if (stagingTitleText) {
    const word = count === 1 ? 'image' : 'images';
    stagingTitleText.innerHTML = `<strong id="staging-count">${count}</strong> ${word} ready to compress`;
  }

  let totalBytes = 0;
  for (const f of state.stagedFiles) {
    if (f.size) totalBytes += f.size;
  }
  stagingSize.textContent = formatBytes(totalBytes);

  const destText = state.destType === 'custom' && state.outputDir
    ? `Custom: ${state.outputDir.split('/').pop() || state.outputDir}`
    : 'Same folder as original';
  stagingDest.textContent = destText;

  btnStartBatch.textContent = `⚡ Start Compressing (${state.stagedFiles.length})`;
}

btnCancelStaging.addEventListener('click', () => {
  state.stagedFiles = [];
  updateStagingInfo();
});

btnStartBatch.addEventListener('click', () => {
  startProcessingStagedFiles();
});

// ----------------------------------------------------
// Drag and Drop
// ----------------------------------------------------
let dragCounter = 0;

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  window.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
});

window.addEventListener('dragenter', (e) => {
  dragCounter++;
  if (dragCounter === 1) {
    dropOverlay.classList.remove('hidden');
  }
});

window.addEventListener('dragleave', (e) => {
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dropOverlay.classList.add('hidden');
  }
});

window.addEventListener('drop', async (e) => {
  dragCounter = 0;
  dropOverlay.classList.add('hidden');

  const files = Array.from(e.dataTransfer.files);
  if (!files || files.length === 0) return;

  const paths = files.map(f => {
    if (window.api && window.api.getPathForFile) {
      return window.api.getPathForFile(f);
    }
    return f.path;
  }).filter(Boolean);

  await handleIncomingPaths(paths);
});

// Browse Files & Folders
btnBrowseFiles.addEventListener('click', async () => {
  const paths = await window.api.openFilesDialog();
  if (paths && paths.length > 0) {
    await handleIncomingPaths(paths);
  }
});

btnBrowseFolder.addEventListener('click', async () => {
  const dirPath = await window.api.selectDirectory();
  if (dirPath) {
    await handleIncomingPaths([dirPath]);
  }
});

// Handle incoming file or directory paths
async function handleIncomingPaths(paths) {
  if (!paths || paths.length === 0) return;

  let items = [];
  if (window.api && window.api.inspectPaths) {
    items = await window.api.inspectPaths(paths);
  } else {
    for (const p of paths) {
      items.push({ path: p, size: 0, name: p.split('/').pop() || p });
    }
  }

  if (!items || items.length === 0) return;

  // Add to staged files with real metadata
  state.stagedFiles.push(...items);
  updateStagingInfo();

  // If autoProcessSingle is enabled and exactly 1 file dropped, start right away
  if (state.autoProcessSingle && state.stagedFiles.length === 1 && !state.isProcessing) {
    startProcessingStagedFiles();
  }
}
window.handleIncomingPaths = handleIncomingPaths;

// Start processing all staged files
function startProcessingStagedFiles() {
  if (state.stagedFiles.length === 0) return;

  resultsSection.classList.remove('hidden');

  const itemsToProcess = [...state.stagedFiles];
  state.stagedFiles = [];
  updateStagingInfo();

  for (const item of itemsToProcess) {
    const fileName = item.name || item.path.split('/').pop() || item.path;
    const ext = (fileName.split('.').pop() || '').toUpperCase();
    const id = 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    const queueItem = {
      id,
      path: item.path,
      name: fileName,
      size: item.size || 0,
      ext,
      status: 'pending',
      result: null
    };

    state.queue.unshift(queueItem);
    renderQueueCard(queueItem);
  }

  if (!state.isProcessing) {
    processNextBatch();
  }
}

// Render queue item card in DOM
function renderQueueCard(item) {
  let card = document.getElementById(item.id);

  if (!card) {
    card = document.createElement('div');
    card.id = item.id;
    card.className = 'queue-card';
    card.innerHTML = `
      <div class="card-drag-handle" title="Drag directly out into Figma, Slack, or Finder">⋮⋮</div>
      <div class="card-icon">${item.ext}</div>
      <div class="card-details">
        <div class="card-name-row">
          <span class="card-filename" title="${item.path}">${item.name}</span>
          <span class="card-format-tag" id="${item.id}-target-tag">${state.targetFormat.toUpperCase()}</span>
        </div>
        <div class="card-meta-row" id="${item.id}-meta">
          <span class="status-text">Queued...</span>
        </div>
      </div>
      <div class="card-actions" id="${item.id}-actions"></div>
    `;
    queueList.prepend(card);
  }

  const metaEl = document.getElementById(`${item.id}-meta`);
  const actionsEl = document.getElementById(`${item.id}-actions`);
  const targetTag = document.getElementById(`${item.id}-target-tag`);

  if (item.status === 'processing') {
    metaEl.innerHTML = `
      <div class="spinner"></div>
      <span style="color: var(--text-secondary);">Compressing...</span>
    `;
    actionsEl.innerHTML = '';
  } else if (item.status === 'done' && item.result) {
    const res = item.result;
    targetTag.textContent = res.targetFormat;

    // Enable native OS drag-out directly from the UI card
    card.draggable = true;
    card.classList.add('draggable-card');
    card.ondragstart = (e) => {
      e.preventDefault();
      if (res.outputPath) {
        window.api.startDrag(res.outputPath);
      }
    };

    let badgeClass = 'badge-positive';
    let savingsText = `-${res.savingsPercent}%`;
    if (res.savingsPercent <= 0) {
      badgeClass = 'badge-neutral';
      savingsText = `0%`;
    }

    const animTag = res.isAnimated ? `<span class="anim-badge">ANIM</span>` : '';
    const privacyTag = res.exifSanitized ? `<span title="EXIF & GPS metadata safely stripped" style="font-size:11px; cursor:help;">🛡️</span>` : '';
    const qTag = res.calibratedQuality ? `<span class="anim-badge" style="background:rgba(59,130,246,0.15); color:#60a5fa; border-color:rgba(59,130,246,0.3);">Q${res.calibratedQuality}</span>` : '';

    metaEl.innerHTML = `
      <span>${formatBytes(res.inputSize)} → <strong>${formatBytes(res.outputSize)}</strong></span>
      <span class="card-savings-badge ${badgeClass}">${savingsText}</span>
      ${qTag}
      ${animTag}
      ${privacyTag}
      <span style="color: var(--text-muted);">${res.durationMs}ms</span>
    `;

    actionsEl.innerHTML = `
      <button class="btn btn-icon" title="Copy compressed image to clipboard" onclick="copyCardImage('${encodeURIComponent(res.outputPath)}')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
      </button>
      <button class="btn btn-icon" title="Reveal in Finder" onclick="revealFile('${encodeURIComponent(res.outputPath)}')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </button>
    `;
  } else if (item.status === 'error') {
    card.draggable = false;
    card.classList.remove('draggable-card');
    metaEl.innerHTML = `
      <span class="card-savings-badge badge-error">Failed</span>
      <span style="color: var(--accent-danger); font-size: 11px;">${item.error || 'Conversion error'}</span>
    `;
    actionsEl.innerHTML = '';
  }
}

window.revealFile = function(encodedPath) {
  const filePath = decodeURIComponent(encodedPath);
  window.api.revealInFinder(filePath);
};

window.copyCardImage = async function(encodedPath) {
  const filePath = decodeURIComponent(encodedPath);
  const ok = await window.api.writeClipboardImage(filePath);
  showToast(ok ? '✓ Image copied to clipboard!' : 'Failed to copy image');
};

// Batch Processor Loop (Concurrency = 4)
async function processNextBatch() {
  const pendingItems = state.queue.filter(i => i.status === 'pending');

  if (pendingItems.length === 0) {
    state.isProcessing = false;
    progressBarContainer.classList.add('hidden');
    return;
  }

  state.isProcessing = true;
  progressBarContainer.classList.remove('hidden');

  const total = state.queue.length;
  const completed = state.queue.filter(i => i.status === 'done' || i.status === 'error').length;
  progressBarFill.style.width = `${Math.round((completed / total) * 100)}%`;

  // Process 4 items simultaneously
  const batch = pendingItems.slice(0, 4);

  await Promise.all(batch.map(async (item) => {
    item.status = 'processing';
    renderQueueCard(item);

    const options = {
      targetFormat: state.targetFormat,
      compressionMode: state.compressionMode,
      quality: state.quality,
      lossless: state.lossless,
      targetSizeBytes: state.compressionMode === 'target-size' ? getTargetSizeBytes() : undefined,
      maxWidth: state.maxWidth,
      svgMode: state.svgMode,
      suffix: state.suffix,
      outputDir: state.destType === 'custom' ? state.outputDir : '',
      replaceOriginal: state.replaceOriginal
    };

    try {
      const result = await window.api.processFile(item.path, options);
      if (result.success) {
        item.status = 'done';
        item.result = result;
        state.totalInputBytes += result.inputSize;
        state.totalOutputBytes += result.outputSize;
      } else {
        item.status = 'error';
        item.error = result.error;
      }
    } catch (err) {
      item.status = 'error';
      item.error = err.message;
    }

    renderQueueCard(item);
  }));

  updateGlobalStats();
  processNextBatch();
}

function updateGlobalStats() {
  const doneItems = state.queue.filter(i => i.status === 'done');
  statCount.textContent = doneItems.length;

  const savedBytes = state.totalInputBytes - state.totalOutputBytes;
  const savedPercent = state.totalInputBytes > 0 
    ? Math.round((savedBytes / state.totalInputBytes) * 100) 
    : 0;

  statSaved.textContent = `${formatBytes(savedBytes)} (${savedPercent}%)`;
}

btnClearQueue.addEventListener('click', () => {
  state.queue = [];
  state.totalInputBytes = 0;
  state.totalOutputBytes = 0;
  queueList.innerHTML = '';
  resultsSection.classList.add('hidden');
  updateGlobalStats();
});

// ----------------------------------------------------
// Settings Modal & Persistence
// ----------------------------------------------------
async function saveSettingsToDisk() {
  if (window.api && window.api.saveSettings) {
    await window.api.saveSettings({
      targetFormat: state.targetFormat,
      compressionMode: state.compressionMode,
      targetSize: state.targetSize,
      targetUnit: state.targetUnit,
      quality: state.quality,
      lossless: state.lossless,
      maxWidth: state.maxWidth,
      svgMode: state.svgMode,
      destType: state.destType,
      outputDir: state.outputDir,
      suffix: state.suffix,
      replaceOriginal: state.replaceOriginal,
      autoProcessSingle: state.autoProcessSingle,
      theme: state.theme
    });
  }
}

btnSettings.addEventListener('click', () => {
  settingSuffix.value = state.suffix || '';
  settingReplaceOriginal.checked = !!state.replaceOriginal;
  settingAutoProcess.checked = !!state.autoProcessSingle;
  settingsModal.classList.remove('hidden');
});

btnCloseSettings.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.add('hidden');
  }
});

btnSaveSettings.addEventListener('click', async () => {
  state.suffix = settingSuffix.value.trim();
  state.replaceOriginal = settingReplaceOriginal.checked;
  state.autoProcessSingle = settingAutoProcess.checked;

  await saveSettingsToDisk();
  settingsModal.classList.add('hidden');
});

// ----------------------------------------------------
// Version Management & GitHub Auto-Update Checking
// ----------------------------------------------------
function compareSemver(v1, v2) {
  const p1 = (v1 || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = (v2 || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

async function checkForUpdates() {
  if (!btnCheckUpdates) return;
  const icon = btnCheckUpdates.querySelector('.btn-check-icon');
  if (icon) icon.classList.add('spinning');
  btnCheckUpdates.disabled = true;
  updateStatusText.textContent = 'Checking GitHub...';
  updateDetailsBox.classList.add('hidden');

  try {
    const response = await fetch('https://api.github.com/repos/zeospec/PixelSlim/releases/latest', {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        updateStatusText.textContent = 'PixelSlim is up to date ✓';
        updateDetailsBox.classList.remove('hidden');
        updateBanner.className = 'update-banner success';
        updateBanner.innerHTML = `You are running <strong>v${currentAppVersion}</strong> (latest release).`;
        btnDownloadUpdate.classList.add('hidden');
        btnReleaseNotes.classList.add('hidden');
        return;
      }
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const release = await response.json();
    latestReleaseData = release;
    const latestVersion = (release.tag_name || '').replace(/^v/, '');

    if (compareSemver(latestVersion, currentAppVersion) > 0) {
      updateStatusText.textContent = `New version available: ${release.tag_name}`;
      updateDetailsBox.classList.remove('hidden');
      updateBanner.className = 'update-banner info';

      const pubDate = release.published_at ? new Date(release.published_at).toLocaleDateString() : 'recently';
      updateBanner.innerHTML = `<strong>PixelSlim ${release.tag_name} is available!</strong><br><span style="font-size:11px; opacity:0.85;">Released ${pubDate} • Universal macOS DMG</span>`;

      // Find universal DMG or DMG asset
      const dmgAsset = Array.isArray(release.assets) && release.assets.find(a => a.name.endsWith('.dmg'));
      if (dmgAsset) {
        btnDownloadUpdate.dataset.url = dmgAsset.browser_download_url;
        btnDownloadUpdate.textContent = `Download ${dmgAsset.name}`;
      } else {
        btnDownloadUpdate.dataset.url = release.html_url;
        btnDownloadUpdate.textContent = 'Download from GitHub ↗';
      }
      btnDownloadUpdate.classList.remove('hidden');

      btnReleaseNotes.dataset.url = release.html_url;
      btnReleaseNotes.classList.remove('hidden');
    } else {
      updateStatusText.textContent = 'PixelSlim is up to date ✓';
      updateDetailsBox.classList.remove('hidden');
      updateBanner.className = 'update-banner success';
      updateBanner.innerHTML = `You are running the latest version (<strong>v${currentAppVersion}</strong>).`;
      btnDownloadUpdate.classList.add('hidden');
      btnReleaseNotes.classList.add('hidden');
    }
  } catch (err) {
    console.warn('Update check error:', err);
    updateStatusText.textContent = 'Could not check updates';
    updateDetailsBox.classList.remove('hidden');
    updateBanner.className = 'update-banner error';
    updateBanner.innerHTML = `Unable to connect to GitHub releases API.<br><span style="font-size:11px;">Check your connection or view GitHub releases.</span>`;
    btnDownloadUpdate.classList.add('hidden');
    btnReleaseNotes.dataset.url = 'https://github.com/zeospec/PixelSlim/releases';
    btnReleaseNotes.textContent = 'View Releases ↗';
    btnReleaseNotes.classList.remove('hidden');
  } finally {
    if (icon) icon.classList.remove('spinning');
    btnCheckUpdates.disabled = false;
  }
}

// Wire update buttons and external link handlers
if (btnCheckUpdates) {
  btnCheckUpdates.addEventListener('click', checkForUpdates);
}

if (btnFooterCheckUpdates) {
  btnFooterCheckUpdates.addEventListener('click', () => {
    settingSuffix.value = state.suffix || '';
    settingReplaceOriginal.checked = !!state.replaceOriginal;
    settingAutoProcess.checked = !!state.autoProcessSingle;
    settingsModal.classList.remove('hidden');
    checkForUpdates();
  });
}

if (btnDownloadUpdate) {
  btnDownloadUpdate.addEventListener('click', () => {
    const url = btnDownloadUpdate.dataset.url;
    if (url && window.api && window.api.openUrl) {
      window.api.openUrl(url);
    } else if (url) {
      window.open(url, '_blank');
    }
  });
}

if (btnReleaseNotes) {
  btnReleaseNotes.addEventListener('click', () => {
    const url = btnReleaseNotes.dataset.url;
    if (url && window.api && window.api.openUrl) {
      window.api.openUrl(url);
    } else if (url) {
      window.open(url, '_blank');
    }
  });
}

function wireExternalLink(elementId, targetUrl) {
  const el = document.getElementById(elementId);
  if (el) {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.api && window.api.openUrl) {
        window.api.openUrl(targetUrl);
      } else {
        window.open(targetUrl, '_blank');
      }
    });
  }
}

wireExternalLink('link-footer-author', 'https://zeospec.com/');
wireExternalLink('link-settings-author', 'https://zeospec.com/');
wireExternalLink('link-github-repo', 'https://github.com/zeospec/PixelSlim');

// ----------------------------------------------------
// Custom Native-styled Dropdown Component
// ----------------------------------------------------
function setupCustomSelect(selectEl) {
  if (!selectEl || selectEl.dataset.customized === 'true') return;
  selectEl.dataset.customized = 'true';

  selectEl.classList.add('sr-only-select');

  const isUnit = selectEl.classList.contains('select-unit');
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select-wrapper' + (isUnit ? ' custom-select-unit-wrapper' : '');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-select-trigger' + (isUnit ? ' is-unit' : '');

  const currentOption = selectEl.options[selectEl.selectedIndex] || selectEl.options[0];
  const labelSpan = document.createElement('span');
  labelSpan.className = 'custom-select-label';
  labelSpan.textContent = currentOption ? currentOption.textContent : '';

  const chevron = document.createElement('span');
  chevron.className = 'custom-select-chevron';
  chevron.innerHTML = `
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `;

  trigger.appendChild(labelSpan);
  trigger.appendChild(chevron);

  const menu = document.createElement('div');
  menu.className = 'custom-select-menu hidden';

  Array.from(selectEl.options).forEach((opt) => {
    const item = document.createElement('div');
    item.className = 'custom-select-option' + (opt.selected ? ' active' : '');
    item.dataset.value = opt.value;
    item.innerHTML = `
      <span class="check-icon">✓</span>
      <span class="option-text">${opt.textContent}</span>
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      selectEl.value = opt.value;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));

      labelSpan.textContent = opt.textContent;
      menu.querySelectorAll('.custom-select-option').forEach(el => el.classList.remove('active'));
      item.classList.add('active');

      closeMenu();
    });

    menu.appendChild(item);
  });

  function openMenu() {
    document.querySelectorAll('.custom-select-menu').forEach(m => m.classList.add('hidden'));
    document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('is-open'));

    menu.classList.remove('hidden');
    trigger.classList.add('is-open');
  }

  function closeMenu() {
    menu.classList.add('hidden');
    trigger.classList.remove('is-open');
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu.classList.contains('hidden')) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
    }
  });

  selectEl.addEventListener('change', () => {
    const selectedOpt = selectEl.options[selectEl.selectedIndex];
    if (selectedOpt) {
      labelSpan.textContent = selectedOpt.textContent;
      menu.querySelectorAll('.custom-select-option').forEach(el => {
        el.classList.toggle('active', el.dataset.value === selectedOpt.value);
      });
    }
  });

  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);

  selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);
}

// Keyboard controls (Cmd+K, Spacebar, ESC)
window.addEventListener('keydown', (e) => {
  // Spacebar to reveal latest completed file in Finder
  if (e.key === ' ' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    e.preventDefault();
    const latestDone = state.queue.find(i => i.status === 'done' && i.result);
    if (latestDone && window.api && window.api.revealInFinder) {
      window.api.revealInFinder(latestDone.result.outputPath);
    }
    return;
  }

  // Cmd+K to clear queue
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    state.queue = [];
    state.stagedFiles = [];
    state.isProcessing = false;
    queueList.innerHTML = '';
    resultsSection.classList.add('hidden');
    progressBarContainer.classList.add('hidden');
    state.totalInputBytes = 0;
    state.totalOutputBytes = 0;
    updateGlobalStats();
    updateStagingInfo();
    showToast('Queue cleared');
    return;
  }

  // ESC to close settings modal
  if (e.key === 'Escape' && settingsModal && !settingsModal.classList.contains('hidden')) {
    settingsModal.classList.add('hidden');
  }
});

// ----------------------------------------------------
// Initialization
// ----------------------------------------------------
window.addEventListener('DOMContentLoaded', async () => {
  updateQualityDisplay();

  // Initialize custom styled dropdowns (replaces OS-native popup list)
  setupCustomSelect(resizeSelect);
  setupCustomSelect(svgModeSelect);
  setupCustomSelect(targetSizeUnit);

  try {
    const saved = await window.api.loadSettings();
    if (saved) {
      if (saved.theme) applyTheme(saved.theme);
      if (saved.compressionMode) setCompressionMode(saved.compressionMode);

      if (saved.targetSize && targetSizeVal) {
        state.targetSize = saved.targetSize;
        targetSizeVal.value = saved.targetSize;
      }
      if (saved.targetUnit && targetSizeUnit) {
        state.targetUnit = saved.targetUnit;
        targetSizeUnit.value = saved.targetUnit;
        targetSizeUnit.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (saved.targetSize && targetPresetsList) {
        targetPresetsList.querySelectorAll('.target-chip').forEach(c => {
          c.classList.toggle('active', parseFloat(c.dataset.size) === state.targetSize && c.dataset.unit === state.targetUnit);
        });
      }

      if (saved.targetFormat) {
        state.targetFormat = saved.targetFormat;
        const pill = formatSelector.querySelector(`[data-format="${saved.targetFormat}"]`);
        if (pill) {
          formatSelector.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        }
        if (saved.targetFormat === 'svg') {
          svgModeContainer.classList.remove('hidden');
        } else {
          svgModeContainer.classList.add('hidden');
        }
      }

      if (saved.maxWidth !== undefined && resizeSelect) {
        state.maxWidth = saved.maxWidth;
        resizeSelect.value = saved.maxWidth;
        resizeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (saved.svgMode && svgModeSelect) {
        state.svgMode = saved.svgMode;
        svgModeSelect.value = saved.svgMode;
        svgModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (saved.outputDir) {
        state.outputDir = saved.outputDir;
      }

      if (saved.destType === 'custom' && saved.outputDir) {
        state.destType = 'custom';
        destRadioCustom.checked = true;
        destRadioSame.checked = false;
        inlineCustomFolder.classList.remove('hidden');
        inlineFolderPath.textContent = saved.outputDir.split('/').pop() || saved.outputDir;
        inlineFolderPath.title = saved.outputDir;
      } else {
        state.destType = 'same';
        destRadioSame.checked = true;
        destRadioCustom.checked = false;
        inlineCustomFolder.classList.add('hidden');
        if (saved.outputDir) {
          inlineFolderPath.textContent = saved.outputDir.split('/').pop() || saved.outputDir;
          inlineFolderPath.title = saved.outputDir;
        }
      }

      if (saved.suffix !== undefined) {
        state.suffix = saved.suffix;
        if (settingSuffix) settingSuffix.value = saved.suffix;
      }

      if (saved.replaceOriginal !== undefined) {
        state.replaceOriginal = !!saved.replaceOriginal;
        if (settingReplaceOriginal) settingReplaceOriginal.checked = !!saved.replaceOriginal;
      }

      if (saved.autoProcessSingle !== undefined) {
        state.autoProcessSingle = !!saved.autoProcessSingle;
        if (settingAutoProcess) settingAutoProcess.checked = !!saved.autoProcessSingle;
      }

      if (saved.lossless) {
        state.lossless = true;
        losslessToggle.checked = true;
        qualitySlider.value = 100;
        qualitySlider.disabled = true;
      } else {
        state.lossless = false;
        losslessToggle.checked = false;
        state.quality = (typeof saved.quality === 'number') ? saved.quality : 82;
        qualitySlider.value = state.quality;
        qualitySlider.disabled = false;
      }
      updateQualityDisplay();
      updateStagingInfo();
    }
  } catch (err) {
    console.error('Failed to load initial settings:', err);
  }

  // Load and display app version
  if (window.api && window.api.getAppVersion) {
    try {
      const ver = await window.api.getAppVersion();
      if (ver) {
        currentAppVersion = ver;
        if (footerVersionTag) footerVersionTag.textContent = `PixelSlim v${ver}`;
        if (settingsAppVersion) settingsAppVersion.textContent = `v${ver}`;
      }
    } catch (err) {
      console.warn('Failed to retrieve app version:', err);
    }
  }

  // Listen to OS theme changes
  if (window.api && window.api.onThemeUpdated) {
    window.api.onThemeUpdated(({ themeSource }) => {
      if (state.theme === 'system') {
        applyTheme('system');
      }
    });
  }
});

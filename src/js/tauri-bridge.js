/**
 * PixelSlim Tauri IPC Bridge
 * Translates window.api calls seamlessly to Tauri v2 native invoke commands.
 */
(function () {
  const isTauri = typeof window !== 'undefined' && (typeof window.__TAURI__ !== 'undefined' || typeof window.__TAURI_INTERNALS__ !== 'undefined');

  async function invoke(cmd, args) {
    if (typeof window.__TAURI__ !== 'undefined' && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      return await window.__TAURI__.core.invoke(cmd, args);
    }
    if (typeof window.__TAURI_INTERNALS__ !== 'undefined' && window.__TAURI_INTERNALS__.invoke) {
      return await window.__TAURI_INTERNALS__.invoke(cmd, args);
    }
    console.warn(`[PixelSlim Bridge] Tauri invoke not ready for: ${cmd}`, args);
    return null;
  }

  window.api = {
    // Path extraction for dropped files
    getPathForFile: (file) => {
      return file.path || '';
    },

    // Inspect paths for real sizes and recursive image discovery
    inspectPaths: async (paths) => {
      const results = await invoke('inspect_paths', { paths });
      return Array.isArray(results) ? results : [];
    },

    // High-performance image processing via Rust backend
    processFile: async (filePath, options) => {
      return await invoke('process_image', { filePath, options });
    },

    // Recursive directory scanning
    scanDirectory: async (dirPath) => {
      const results = await invoke('scan_directory', { dirPath });
      if (Array.isArray(results)) {
        return results.map(f => (typeof f === 'string' ? f : (f.path || f)));
      }
      return [];
    },

    // Native file and folder dialogs
    selectDirectory: async () => {
      return await invoke('select_directory');
    },

    openFilesDialog: async () => {
      const files = await invoke('open_files_dialog');
      return Array.isArray(files) ? files : [];
    },

    // Reveal in macOS Finder
    revealInFinder: async (filePath) => {
      return await invoke('reveal_in_finder', { filePath });
    },

    startDrag: (_filePath) => {
      // Drag-out placeholder
    },

    // Clipboard integration
    readClipboardImage: async () => {
      return await invoke('read_clipboard_image');
    },

    writeClipboardImage: async (filePath) => {
      return await invoke('write_clipboard_image', { filePath });
    },

    writeClipboardText: async (text) => {
      return await invoke('write_clipboard_text', { text });
    },

    // Settings persistence
    loadSettings: async () => {
      return await invoke('load_settings');
    },

    saveSettings: async (settings) => {
      return await invoke('save_settings', { settings });
    },

    // System theme synchronization
    getTheme: async () => 'system',
    setTheme: async (_theme) => {},
    onThemeUpdated: (callback) => {
      if (typeof window.matchMedia === 'function') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
          callback({ themeSource: e.matches ? 'dark' : 'light' });
        });
      }
    },

    // Application version
    getAppVersion: async () => {
      try {
        return await invoke('get_app_version');
      } catch (_) {
        return '1.0.0';
      }
    },

    // Open external URL in default browser
    openUrl: async (url) => {
      try {
        return await invoke('open_url', { url });
      } catch (err) {
        console.warn('Fallback opening URL via window.open:', err);
        window.open(url, '_blank');
      }
    }
  };

  // Wire Tauri native drag-drop events when available
  function initTauriDragDrop() {
    if (typeof window.__TAURI__ !== 'undefined' && window.__TAURI__.event && window.__TAURI__.event.listen) {
      const dropOverlay = () => document.getElementById('drop-overlay');

      window.__TAURI__.event.listen('tauri://drag-enter', () => {
        const overlay = dropOverlay();
        if (overlay) overlay.classList.remove('hidden');
      });

      window.__TAURI__.event.listen('tauri://drag-leave', () => {
        const overlay = dropOverlay();
        if (overlay) overlay.classList.add('hidden');
      });

      window.__TAURI__.event.listen('tauri://drag-drop', async (event) => {
        const overlay = dropOverlay();
        if (overlay) overlay.classList.add('hidden');

        const paths = (event.payload && event.payload.paths) ? event.payload.paths : [];
        if (paths.length > 0 && typeof window.handleIncomingPaths === 'function') {
          await window.handleIncomingPaths(paths);
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTauriDragDrop);
  } else {
    initTauriDragDrop();
  }
})();

/**
 * PixelSlim Landing Page
 * Lightweight interactions for downloading and navigation.
 * Note: PixelSlim is a native macOS desktop application, not an in-browser converter.
 */

(function () {
  'use strict';

  // Clicking the product showcase window directs users to download the native macOS app
  const showcaseWindow = document.getElementById('product-showcase-window');
  const downloadBtn = document.getElementById('btn-primary-download');

  if (showcaseWindow && downloadBtn) {
    showcaseWindow.addEventListener('click', () => {
      downloadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      downloadBtn.focus();
    });
  }
})();

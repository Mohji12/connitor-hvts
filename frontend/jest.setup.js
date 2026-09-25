import '@testing-library/jest-dom';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill for Radix UI components (hasPointerCapture not supported in JSDOM)
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = function() {
    return false;
  };
}

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = function() {};
}

if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = function() {};
}

// Polyfill for scrollIntoView (Radix UI uses this)
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function() {};
}

// Polyfill for document.elementFromPoint (input-otp library uses this)
if (!document.elementFromPoint) {
  document.elementFromPoint = function() {
    return null;
  };
}

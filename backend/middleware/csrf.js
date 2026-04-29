const crypto = require('crypto');

// Simple CSRF token generator and validator
function csrfProtection() {
  return function(req, res, next) {
    // Skip CSRF for safe methods
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    // Extract token from header or body
    const csrfTokenFromBody = req.body && req.body._csrf;
    const csrfTokenFromHeader = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
    const csrfToken = csrfTokenFromBody || csrfTokenFromHeader;

    // For state-changing requests, require a valid CSRF token
    if (!csrfToken) {
      return res.status(403).json({
        error: 'CSRF token is missing',
        success: false
      });
    }

    // In a real implementation, we would validate the token against a session/user-specific secret
    // For now, we'll just validate the format (in a real app, this would be more sophisticated)
    if (!isValidCsrfToken(csrfToken)) {
      return res.status(403).json({
        error: 'Invalid CSRF token',
        success: false
      });
    }

    next();
  };
}

function isValidCsrfToken(token) {
  // In a real implementation, this would check the token against a stored secret
  // For now, we'll just validate that it looks like a reasonable token
  return typeof token === 'string' && token.length >= 16 && token.length <= 128;
}

module.exports = csrfProtection;
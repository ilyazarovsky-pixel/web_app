const crypto = require('crypto');

function requestIdMiddleware(req, res, next) {
  // Generate a unique request ID or use the one provided in the header
  const requestId = req.headers['x-request-id'] || crypto.randomBytes(16).toString('hex');
  
  // Add request ID to the request object for later use
  req.requestId = requestId;
  
  // Add request ID to the response headers
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

module.exports = requestIdMiddleware;
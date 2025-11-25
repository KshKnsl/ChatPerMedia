const jwt = require('jsonwebtoken');

const handleError = (res, error, customMessage = null) => {
  const statusCode = error.statusCode || error.response?.status || 500;
  const message = customMessage || error.response?.data?.error || error.message || 'Internal server error';
  return res.status(statusCode).json({ error: message });
};

const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = message ? { ...data, message } : data;
  return res.status(statusCode).json(response);
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleError(res, error);
    });
  };
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  jwt.verify(token, 'secretKey', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const validateRequired = (fields, body) => {
  const missing = [];
  for (const field of fields) {
    if (!body[field]) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
};

const dbQuery = async (operation, errorMessage = 'Database operation failed') => {
  try {
    return await operation();
  } catch (error) {
    const dbError = new Error(errorMessage);
    dbError.statusCode = 500;
    throw dbError;
  }
};

module.exports = {
  handleError,
  sendSuccess,
  asyncHandler,
  authenticateToken,
  validateRequired,
  dbQuery
};
const logger = require('../utils/logger');

function errorHandler(err, _req, res, _next) {
  logger.error({ msg: err.message, stack: err.stack });
  const code = err.statusCode || 500;
  res.status(code).json({ message: err.message || 'Internal Server Error' });
}

module.exports = { errorHandler };

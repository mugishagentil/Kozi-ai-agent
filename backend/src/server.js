const app = require('./app');
const logger = require('./utils/logger');

const port = process.env.port || process.env.PORT || 5050;

app.listen(port, () => {
  console.log(`API running on: http://localhost:${port}`);
  logger.info({ msg: `API running on :${port}` });
});

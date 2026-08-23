const logger = {
  info: (msg, meta = {}) => {
    console.log(`[INFO] ${msg}`, Object.keys(meta).length ? meta : '');
  },
  error: (msg, meta = {}) => {
    console.error(`[ERROR] ${msg}`, Object.keys(meta).length ? meta : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[WARN] ${msg}`, Object.keys(meta).length ? meta : '');
  }
};

module.exports = logger;

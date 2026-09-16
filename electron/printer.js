// Backward-compatible entry point. Real implementation lives in ./printer/*.
// Node resolves require("./printer") to this file before the directory, so
// existing imports keep working while the service is split into transports.
module.exports = require("./printer/index");

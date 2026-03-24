// tort-app/server.js (la rădăcină)
const path = require("path");
const backendDir = path.join(__dirname, "backend");
if (process.cwd() !== backendDir) {
  process.chdir(backendDir);
}
require("./backend/index.js");

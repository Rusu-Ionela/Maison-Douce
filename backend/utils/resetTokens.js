const crypto = require("crypto");

function hashResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}

function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return {
    rawToken,
    hashedToken: hashResetToken(rawToken),
  };
}

module.exports = {
  hashResetToken,
  generateResetToken,
};

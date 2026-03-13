const rateLimit = require("express-rate-limit");

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message:
        message || "Prea multe cereri intr-un interval scurt. Incearca din nou mai tarziu.",
    },
  });
}

const adminReadLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
});

const adminMutationLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
});

module.exports = {
  adminMutationLimiter,
  adminReadLimiter,
  createLimiter,
};

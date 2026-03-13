function log(level, message, meta = {}) {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...meta,
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

function createLogger(scope) {
  const normalizedScope = String(scope || "").trim();

  return {
    info(message, meta = {}) {
      log("info", message, {
        scope: normalizedScope,
        ...meta,
      });
    },
    warn(message, meta = {}) {
      log("warn", message, {
        scope: normalizedScope,
        ...meta,
      });
    },
    error(message, meta = {}) {
      log("error", message, {
        scope: normalizedScope,
        ...meta,
      });
    },
  };
}

function serializeError(err) {
  if (!err) return {};
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

module.exports = {
  createLogger,
  log,
  serializeError,
};

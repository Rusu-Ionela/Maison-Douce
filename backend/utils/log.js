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

function serializeError(err) {
  if (!err) return {};
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

module.exports = {
  log,
  serializeError,
};

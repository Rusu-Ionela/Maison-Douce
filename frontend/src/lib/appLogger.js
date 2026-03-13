function write(level, message, meta = {}) {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...meta,
  };

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

}

export const appLogger = {
  info(message, meta = {}) {
    if (import.meta.env.DEV) {
      void message;
      void meta;
    }
  },
  warn(message, meta = {}) {
    write("warn", message, meta);
  },
  error(message, meta = {}) {
    write("error", message, meta);
  },
};

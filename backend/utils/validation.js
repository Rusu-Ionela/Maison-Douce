class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ValidationError";
    this.status = 400;
    this.details = details;
  }
}

function fail(message, field) {
  throw new ValidationError(message, field ? [{ field, message }] : []);
}

function readString(value, options = {}) {
  const {
    field = "field",
    required = false,
    min = 0,
    max,
    trim = true,
    lowercase = false,
    pattern,
  } = options;
  const defaultValue = Object.prototype.hasOwnProperty.call(options, "defaultValue")
    ? options.defaultValue
    : "";

  if (value == null || value === "") {
    if (required) {
      fail(`${field} is required`, field);
    }
    return defaultValue;
  }

  let result = String(value);
  if (trim) result = result.trim();
  if (lowercase) result = result.toLowerCase();

  if (required && !result) {
    fail(`${field} is required`, field);
  }
  if (min && result.length < min) {
    fail(`${field} must have at least ${min} characters`, field);
  }
  if (max && result.length > max) {
    fail(`${field} must have at most ${max} characters`, field);
  }
  if (pattern && result && !pattern.test(result)) {
    fail(`${field} is invalid`, field);
  }

  return result;
}

function readEmail(value, options = {}) {
  const result = readString(value, {
    ...options,
    lowercase: true,
    trim: true,
  });
  if (!result && !options.required) return "";

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(result)) {
    fail(`${options.field || "email"} is invalid`, options.field || "email");
  }

  return result;
}

function readNumber(value, options = {}) {
  const {
    field = "field",
    required = false,
    min,
    max,
    integer = false,
    defaultValue,
  } = options;

  if (value == null || value === "") {
    if (required) {
      fail(`${field} is required`, field);
    }
    return defaultValue;
  }

  const result = Number(value);
  if (!Number.isFinite(result)) {
    fail(`${field} must be a valid number`, field);
  }
  if (integer && !Number.isInteger(result)) {
    fail(`${field} must be an integer`, field);
  }
  if (min != null && result < min) {
    fail(`${field} must be >= ${min}`, field);
  }
  if (max != null && result > max) {
    fail(`${field} must be <= ${max}`, field);
  }

  return result;
}

function readBoolean(value, options = {}) {
  const { field = "field", required = false, defaultValue } = options;

  if (value == null || value === "") {
    if (required) {
      fail(`${field} is required`, field);
    }
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  fail(`${field} must be a boolean`, field);
}

function readEnum(value, allowedValues, options = {}) {
  const { field = "field", required = false, defaultValue } = options;
  if (value == null || value === "") {
    if (required) {
      fail(`${field} is required`, field);
    }
    return defaultValue;
  }

  const result = String(value).trim();
  if (!allowedValues.includes(result)) {
    fail(`${field} must be one of: ${allowedValues.join(", ")}`, field);
  }
  return result;
}

function readArray(value, options = {}) {
  const {
    field = "field",
    required = false,
    maxItems,
    parser,
  } = options;
  const defaultValue = Object.prototype.hasOwnProperty.call(options, "defaultValue")
    ? options.defaultValue
    : [];
  if (value == null || value === "") {
    if (required) {
      fail(`${field} is required`, field);
    }
    return defaultValue;
  }

  let result = value;
  if (typeof result === "string") {
    try {
      const parsed = JSON.parse(result);
      result = parsed;
    } catch {
      result = result
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (!Array.isArray(result)) {
    fail(`${field} must be an array`, field);
  }

  if (maxItems != null && result.length > maxItems) {
    fail(`${field} must contain at most ${maxItems} items`, field);
  }

  if (typeof parser === "function") {
    return result.map((item, index) => parser(item, index));
  }
  return result;
}

function readObject(value, options = {}) {
  const { field = "field", required = false } = options;
  const defaultValue = Object.prototype.hasOwnProperty.call(options, "defaultValue")
    ? options.defaultValue
    : null;
  if (value == null) {
    if (required) {
      fail(`${field} is required`, field);
    }
    return defaultValue;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    fail(`${field} must be an object`, field);
  }
  return value;
}

function readMongoId(value, options = {}) {
  const { field = "field", required = false } = options;
  const defaultValue = Object.prototype.hasOwnProperty.call(options, "defaultValue")
    ? options.defaultValue
    : "";
  const result = readString(value, {
    field,
    required,
    trim: true,
    defaultValue,
  });

  if (!result && !required) {
    return result;
  }

  if (!/^[a-f\d]{24}$/i.test(result)) {
    fail(`${field} must be a valid id`, field);
  }

  return result;
}

function readUrl(value, options = {}) {
  const {
    field = "field",
    required = false,
    allowedOrigins,
  } = options;
  const defaultValue = Object.prototype.hasOwnProperty.call(options, "defaultValue")
    ? options.defaultValue
    : "";
  const result = readString(value, {
    field,
    required,
    trim: true,
    max: 2048,
    defaultValue,
  });

  if (!result && !required) {
    return result;
  }

  let parsed;
  try {
    parsed = new URL(result);
  } catch {
    fail(`${field} must be a valid URL`, field);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    fail(`${field} must use http or https`, field);
  }

  if (Array.isArray(allowedOrigins) && allowedOrigins.length > 0) {
    if (!allowedOrigins.includes(parsed.origin)) {
      fail(`${field} origin is not allowed`, field);
    }
  }

  return parsed.toString();
}

module.exports = {
  ValidationError,
  fail,
  readArray,
  readBoolean,
  readEmail,
  readEnum,
  readMongoId,
  readNumber,
  readObject,
  readString,
  readUrl,
};

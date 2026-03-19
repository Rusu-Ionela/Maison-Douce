const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  ValidationError,
  readBoolean,
  readMongoId,
  readString,
  readUrl,
} = require("../utils/validation");
const { hashResetToken, generateResetToken } = require("../utils/resetTokens");
const { getJwtSecret, signAuthToken, verifyAuthToken } = require("../utils/jwt");
const { cleanupUploadedFiles, toPublicUploadPath } = require("../utils/multer");
const { serializeError } = require("../utils/log");
const {
  buildCreatedAtRange,
  buildStringDateRange,
  getOrderDeliveryFee,
  getOrderItemQuantity,
  getOrderTotal,
  normalizeDeliveryMethod,
  summarizeOrderItems,
} = require("../utils/reporting");

test("readString and readBoolean validate supported values", () => {
  assert.equal(
    readString(undefined, { field: "name", defaultValue: undefined }),
    undefined
  );
  assert.equal(
    readString("  Ionela  ", { field: "name", required: true }),
    "Ionela"
  );
  assert.equal(readBoolean("true", { field: "flag" }), true);
  assert.equal(readBoolean("0", { field: "flag" }), false);

  assert.throws(
    () => readBoolean("maybe", { field: "flag" }),
    (error) => error instanceof ValidationError && error.details[0].field === "flag"
  );
});

test("readMongoId and readUrl reject invalid input", () => {
  const id = "507f1f77bcf86cd799439011";
  assert.equal(readMongoId(id, { field: "id", required: true }), id);
  assert.equal(
    readUrl("https://example.com/path?x=1", {
      field: "successUrl",
      allowedOrigins: ["https://example.com"],
    }),
    "https://example.com/path?x=1"
  );

  assert.throws(
    () => readMongoId("not-an-id", { field: "id", required: true }),
    /valid id/
  );
  assert.throws(
    () =>
      readUrl("https://evil.test/cb", {
        field: "successUrl",
        allowedOrigins: ["https://example.com"],
      }),
    /origin is not allowed/
  );
});

test("reset tokens are hashed deterministically and generated uniquely", () => {
  const first = generateResetToken();
  const second = generateResetToken();

  assert.notEqual(first.rawToken, second.rawToken);
  assert.equal(first.hashedToken, hashResetToken(first.rawToken));
  assert.notEqual(first.hashedToken, second.hashedToken);
});

test("jwt helpers require configured secret and round-trip payloads", () => {
  const originalSecret = process.env.JWT_SECRET;

  process.env.JWT_SECRET = "";
  assert.throws(() => getJwtSecret(), /JWT_SECRET is not configured/);

  process.env.JWT_SECRET = "test-secret";
  const token = signAuthToken({
    _id: "507f1f77bcf86cd799439011",
    email: "test@example.com",
    rol: "admin",
  });
  const payload = verifyAuthToken(token);

  assert.equal(payload.id, "507f1f77bcf86cd799439011");
  assert.equal(payload.email, "test@example.com");
  assert.equal(payload.rol, "admin");

  if (originalSecret == null) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalSecret;
  }
});

test("upload helpers expose safe public paths and remove uploaded temp files", () => {
  const tempDir = path.join(__dirname, ".tmp");
  fs.mkdirSync(tempDir, { recursive: true });

  const fileA = path.join(tempDir, "a.txt");
  const fileB = path.join(tempDir, "b.txt");
  fs.writeFileSync(fileA, "a");
  fs.writeFileSync(fileB, "b");

  cleanupUploadedFiles({
    file: { path: fileA },
    files: [{ path: fileB }],
  });

  assert.equal(fs.existsSync(fileA), false);
  assert.equal(fs.existsSync(fileB), false);
  assert.equal(toPublicUploadPath("shared", "doc.pdf"), "/uploads/shared/doc.pdf");

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("serializeError returns predictable error metadata", () => {
  const error = new Error("boom");
  const serialized = serializeError(error);

  assert.equal(serialized.name, "Error");
  assert.equal(serialized.message, "boom");
  assert.match(serialized.stack, /boom/);
});

test("reporting helpers validate date ranges and build inclusive filters", () => {
  assert.deepEqual(buildStringDateRange("date", "2026-03-01", "2026-03-31"), {
    date: { $gte: "2026-03-01", $lte: "2026-03-31" },
  });

  const createdAtRange = buildCreatedAtRange(
    "createdAt",
    "2026-03-01",
    "2026-03-31"
  );
  assert.equal(createdAtRange.createdAt.$gte.getFullYear(), 2026);
  assert.equal(createdAtRange.createdAt.$gte.getMonth(), 2);
  assert.equal(createdAtRange.createdAt.$gte.getDate(), 1);
  assert.equal(createdAtRange.createdAt.$lte.getHours(), 23);
  assert.equal(createdAtRange.createdAt.$lte.getMinutes(), 59);
  assert.equal(createdAtRange.createdAt.$lte.getSeconds(), 59);

  assert.throws(
    () => buildStringDateRange("date", "2026-03-31", "2026-03-01"),
    /mai mica sau egala/
  );
  assert.throws(
    () => buildCreatedAtRange("createdAt", "2026-02-31", "2026-03-01"),
    /YYYY-MM-DD/
  );
});

test("reporting helpers normalize totals, methods and item summaries", () => {
  const order = {
    items: [
      { name: "Red Velvet", qty: 2, lineTotal: 240 },
      { nume: "Mousse", cantitate: 1, pret: 90 },
    ],
    taxaLivrare: 25,
    totalFinal: 355,
  };

  assert.equal(summarizeOrderItems(order), "Red Velvet x2 | Mousse x1");
  assert.equal(getOrderItemQuantity(order), 3);
  assert.equal(getOrderDeliveryFee(order), 25);
  assert.equal(getOrderTotal(order), 355);
  assert.equal(normalizeDeliveryMethod("livrare"), "delivery");
  assert.equal(normalizeDeliveryMethod("pickup"), "pickup");
});

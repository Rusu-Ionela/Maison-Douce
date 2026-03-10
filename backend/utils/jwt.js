const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return secret;
}

function buildAuthPayload(user) {
  const id = String(user?._id || user?.id || user?.userId || "");
  if (!id) {
    throw new Error("Cannot sign auth token without a user id.");
  }

  const rol = user?.rol || user?.role || "client";

  return {
    id,
    _id: id,
    userId: id,
    rol,
    role: rol,
    email: user?.email || "",
  };
}

function signAuthToken(user, options = {}) {
  return jwt.sign(buildAuthPayload(user), getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES || "7d",
    ...options,
  });
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  getJwtSecret,
  signAuthToken,
  verifyAuthToken,
};

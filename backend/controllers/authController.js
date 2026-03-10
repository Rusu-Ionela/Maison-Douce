const Utilizator = require("../models/Utilizator");
const { signAuthToken } = require("../utils/jwt");

exports.login = async (req, res) => {
  const { email, parola } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !parola) {
    return res.status(400).json({ message: "Email si parola obligatorii" });
  }

  const user = await Utilizator.findOne({ email: normalizedEmail }).select("+parolaHash +parola");
  if (!user) {
    return res.status(401).json({ message: "Credentiale invalide" });
  }

  const ok = await user.comparePassword(parola);
  if (!ok) {
    return res.status(401).json({ message: "Credentiale invalide" });
  }

  const token = signAuthToken(user);
  const safe = user.toObject();
  delete safe.parola;
  delete safe.parolaHash;

  res.json({ token, user: safe });
};

exports.me = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "User neautentificat" });
  }

  const safe = req.user.toObject ? req.user.toObject() : { ...req.user };
  delete safe.parola;
  delete safe.parolaHash;
  res.json(safe);
};

// backend/routes/notImplemented.js
const router = require("express").Router();
router.all("*", (_req, res) => res.status(501).json({ message: "Not implemented yet" }));
module.exports = router;

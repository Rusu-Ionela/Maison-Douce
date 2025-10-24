const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
    const { forma, culori, mesaj } = req.body;
    // TODO: salvează în DB sau trimite notificare email/telegram
    console.log("Personalizare:", { forma, culori, mesaj });
    res.json({ ok: true });
});

module.exports = router;

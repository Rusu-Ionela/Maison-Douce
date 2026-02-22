const express = require("express");
const router = express.Router();

const UmpluturaRecipe = require("../models/UmpluturaRecipe");
const { authRequired, roleCheck } = require("../middleware/auth");

function sanitizeIngredientRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      ingredient: String(row?.ingredient || "").trim(),
      qty: Number(row?.qty || 0),
      unit: String(row?.unit || "g").trim(),
      note: String(row?.note || "").trim(),
    }))
    .filter((row) => row.ingredient && row.qty >= 0);
}

router.get("/", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || "") === "1";
    const filter = includeInactive ? {} : { activ: true };
    const recipes = await UmpluturaRecipe.find(filter).sort({ updatedAt: -1 }).lean();
    res.json(recipes);
  } catch (e) {
    res.status(500).json({ message: "Nu am putut incarca umpluturile." });
  }
});

router.post("/", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const nume = String(req.body?.nume || "").trim();
    const descriere = String(req.body?.descriere || "").trim();
    const bazaDiametruCm = Number(req.body?.bazaDiametruCm || 20) || 20;
    const bazaKg = Number(req.body?.bazaKg || 1) || 1;
    const ingrediente = sanitizeIngredientRows(req.body?.ingrediente);

    if (!nume) {
      return res.status(400).json({ message: "Numele umpluturii este obligatoriu." });
    }
    if (!ingrediente.length) {
      return res.status(400).json({ message: "Adauga cel putin un ingredient." });
    }

    const recipe = await UmpluturaRecipe.create({
      nume,
      descriere,
      bazaDiametruCm,
      bazaKg,
      ingrediente,
      activ: true,
      creatDe: req.user?._id || req.user?.id,
    });

    res.status(201).json(recipe);
  } catch (e) {
    res.status(500).json({ message: "Nu am putut crea umplutura." });
  }
});

router.put("/:id", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const recipe = await UmpluturaRecipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Umplutura inexistenta." });

    const nume = String(req.body?.nume ?? recipe.nume).trim();
    const descriere = String(req.body?.descriere ?? recipe.descriere).trim();
    const bazaDiametruCm = Number(req.body?.bazaDiametruCm ?? recipe.bazaDiametruCm) || 20;
    const bazaKg = Number(req.body?.bazaKg ?? recipe.bazaKg) || 1;
    const ingrediente =
      req.body?.ingrediente != null
        ? sanitizeIngredientRows(req.body.ingrediente)
        : recipe.ingrediente;
    const activ = req.body?.activ != null ? Boolean(req.body.activ) : recipe.activ;

    if (!nume) {
      return res.status(400).json({ message: "Numele umpluturii este obligatoriu." });
    }
    if (!ingrediente.length) {
      return res.status(400).json({ message: "Adauga cel putin un ingredient." });
    }

    recipe.nume = nume;
    recipe.descriere = descriere;
    recipe.bazaDiametruCm = bazaDiametruCm;
    recipe.bazaKg = bazaKg;
    recipe.ingrediente = ingrediente;
    recipe.activ = activ;
    await recipe.save();

    res.json(recipe);
  } catch (e) {
    res.status(500).json({ message: "Nu am putut actualiza umplutura." });
  }
});

router.delete("/:id", authRequired, roleCheck("admin", "patiser"), async (req, res) => {
  try {
    const recipe = await UmpluturaRecipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Umplutura inexistenta." });
    recipe.activ = false;
    await recipe.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Nu am putut sterge umplutura." });
  }
});

module.exports = router;

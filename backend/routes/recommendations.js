const express = require("express");
const Comanda = require("../models/Comanda");
const Tort = require("../models/Tort");

const router = express.Router();

/**
 * Construiește un set de recomandări hibrid:
 * - popularitate globală (aggregate pe comenzi)
 * - istoric user (dacă avem userId)
 * - preferințe simple: categorie dorită, ingrediente de evitat
 * Returnează și motive pentru transparență.
 */
async function buildAiRecommendations({
  userId,
  limit = 6,
  preferCategorie,
  avoid = [],
  excludePurchased = true,
}) {
  const lim = Number(limit) || 6;
  const avoidList = Array.isArray(avoid)
    ? avoid.map((v) => String(v).toLowerCase())
    : String(avoid || "")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);

  // 1) Popularitate globală
  const popularAgg = await Comanda.aggregate([
    { $unwind: "$items" },
    { $group: { _id: "$items.productId", count: { $sum: "$items.qty" } } },
    { $sort: { count: -1 } },
    { $limit: lim * 3 }, // mai mult pentru fallback
  ]);
  const globalCounts = Object.fromEntries(
    popularAgg
      .filter((p) => p?._id)
      .map((p) => [String(p._id), p.count || 0])
  );

  // 2) Istoric user
  let userOrders = [];
  if (userId) {
    userOrders = await Comanda.find({ clientId: userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
  }

  const purchasedIds = (userOrders || [])
    .flatMap((o) => (o.items || []).map((it) => it.productId))
    .filter(Boolean)
    .map(String);

  const userCounts = purchasedIds.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  // 3) Torturi active
  const torturi = await Tort.find({ activ: { $ne: false } }).lean();

  // 4) Preferințe ingrediente din istoric
  const ingredientPreference = {};
  for (const o of userOrders) {
    for (const item of o.items || []) {
      const idStr = String(item.productId || item.tortId || "");
      const matchTort = torturi.find((t) => String(t._id) === idStr);
      (matchTort?.ingrediente || []).forEach((ing) => {
        const key = String(ing).toLowerCase();
        ingredientPreference[key] = (ingredientPreference[key] || 0) + 1;
      });
    }
  }

  const recommendations = torturi
    .map((t) => {
      const idStr = String(t._id);
      let score = 0;
      const reasons = [];

      const glob = globalCounts[idStr] || 0;
      if (glob) {
        score += glob * 1.5;
        reasons.push(`Popular (${glob} vânzări)`);
      }

      const userCount = userCounts[idStr] || 0;
      if (userCount) {
        score += userCount * 2;
        reasons.push(`Ai cumpărat de ${userCount} ori`);
      }

      if (excludePurchased && userCount > 0) {
        score -= 100; // nu recomandăm identic
      }

      if (preferCategorie && t.categorie === preferCategorie) {
        score += 3;
        reasons.push(`Categorie preferată: ${preferCategorie}`);
      }

      const overlapIngredients = (t.ingrediente || []).filter((ing) =>
        ingredientPreference[String(ing).toLowerCase()]
      );
      if (overlapIngredients.length) {
        score += overlapIngredients.length * 1.2;
        reasons.push(
          `Apropiat de gusturile tale: ${overlapIngredients
            .slice(0, 3)
            .join(", ")}`
        );
      }

      const hasAvoid = (t.ingrediente || t.alergeniFolositi || []).some((ing) =>
        avoidList.includes(String(ing).toLowerCase())
      );
      if (hasAvoid) {
        score -= 5;
        reasons.push("Conține ingrediente pe care vrei să le eviți");
      }

      return {
        ...t,
        score,
        reasons,
        meta: {
          popular: glob,
          userCount,
          overlapIngredients,
        },
      };
    })
    .filter((t) => t.score > -10) // scoate doar cele hard-penalizate
    .sort((a, b) => b.score - a.score)
    .slice(0, lim);

  return {
    ok: true,
    count: recommendations.length,
    recomandate: recommendations,
    debug: {
      popularConsiderate: popularAgg.length,
      userOrders: userOrders.length,
      avoid: avoidList,
    },
  };
}

// GET /api/recommendations -> top torturi populare (din comenzi)
router.get("/", async (req, res) => {
  const { limit = 6 } = req.query;
  try {
    const top = await Comanda.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", count: { $sum: "$items.qty" } } },
      { $sort: { count: -1 } },
      { $limit: Number(limit) },
    ]);

    const ids = top.map((t) => t._id).filter(Boolean);
    const torturi = await Tort.find({ _id: { $in: ids } });
    res.json({ recomandate: torturi });
  } catch (e) {
    console.error("recommendations error:", e.message);
    res.status(500).json({ message: e.message });
  }
});

// GET /api/recommendations/ai -> recomanda hibrid (popular + user taste + preferinte)
router.get("/ai", async (req, res) => {
  try {
    const data = await buildAiRecommendations({
      userId: req.query.userId,
      limit: req.query.limit || 6,
      preferCategorie: req.query.categorie || req.query.preferCategorie,
      avoid: req.query.avoid,
      excludePurchased: req.query.excludePurchased !== "false",
    });
    res.json(data);
  } catch (e) {
    console.error("[ai recommendations] error:", e.message);
    res.status(500).json({ ok: false, message: e.message });
  }
});

// POST /api/recommendations/ai -> permite profil gust si preferințe explicite (body)
router.post("/ai", async (req, res) => {
  try {
    const {
      userId,
      limit,
      preferCategorie,
      avoid,
      excludePurchased = true,
    } = req.body || {};

    const data = await buildAiRecommendations({
      userId,
      limit,
      preferCategorie,
      avoid,
      excludePurchased,
    });
    res.json(data);
  } catch (e) {
    console.error("[ai recommendations POST] error:", e.message);
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;

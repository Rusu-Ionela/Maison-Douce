import { PATISER_RECIPES } from "../data/patiserRecipes";

const UNIT_ALIASES = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
  buc: "buc",
  lingura: "lingura",
  linguri: "lingura",
  lingurita: "lingurita",
  lingurite: "lingurita",
  plic: "plic",
  plicuri: "plic",
  conserva: "conserva",
  borcan: "borcan",
  cm: "cm",
};

const COUNTABLE_KEYWORDS = [
  "oua",
  "ou",
  "albusuri",
  "galbenusuri",
  "portocale",
  "kiwi",
  "visine",
  "capsuni",
  "bomboane",
  "napolitane",
];

function parseNumber(rawValue) {
  const normalized = String(rawValue || "")
    .trim()
    .replace(",", ".");

  if (!normalized) return 0;

  if (normalized.includes("-")) {
    const parts = normalized
      .split("-")
      .map((item) => Number.parseFloat(item.trim()))
      .filter((item) => Number.isFinite(item));
    if (parts.length === 2) {
      return (parts[0] + parts[1]) / 2;
    }
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeUnit(rawUnit) {
  const key = String(rawUnit || "").trim().toLowerCase();
  return UNIT_ALIASES[key] || key || "";
}

function guessCountUnit(label) {
  const normalized = String(label || "").trim().toLowerCase();
  return COUNTABLE_KEYWORDS.some((item) => normalized.includes(item)) ? "buc" : "";
}

function extractWeightFromNote(note) {
  const match = String(note || "").match(/(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)\b/i);
  if (!match) return null;

  return {
    qty: parseNumber(match[1]),
    unit: normalizeUnit(match[2]),
  };
}

function splitIngredientLine(line) {
  const value = String(line || "").trim();
  if (!value) return [];

  const colonIndex = value.indexOf(":");
  const group = colonIndex >= 0 ? value.slice(0, colonIndex).trim() : "";
  const rest = colonIndex >= 0 ? value.slice(colonIndex + 1).trim() : value;

  return rest
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => ({ group, token }));
}

function parseToken(token, group = "") {
  const source = String(token || "").trim();
  if (!source) return null;

  const noteMatches = [...source.matchAll(/\(([^)]+)\)/g)];
  const noteText = noteMatches.map((match) => match[1].trim()).filter(Boolean).join("; ");
  const withoutNotes = source.replace(/\([^)]*\)/g, "").trim();

  const numericMatches = [
    ...withoutNotes.matchAll(
      /(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)\s*(kg|g|ml|l|buc|lingura|linguri|lingurita|lingurite|plic|plicuri|conserva|borcan|cm)\b/gi
    ),
  ];

  let qty = 0;
  let unit = "";
  let label = withoutNotes;
  const notes = [];

  if (numericMatches.length > 0) {
    const first = numericMatches[0];
    label = withoutNotes.slice(0, first.index).trim();
    qty = numericMatches.reduce((sum, match) => sum + parseNumber(match[1]), 0);
    unit = normalizeUnit(first[2]);

    const trailingNote = withoutNotes
      .slice(first.index + first[0].length)
      .trim()
      .replace(/^\+\s*/, "");
    if (trailingNote) {
      notes.push(trailingNote);
    }
  } else {
    const countMatch = withoutNotes.match(/^(.*?)(\d+(?:[.,]\d+)?)\s*(buc|conserva|borcan)?$/i);
    if (countMatch) {
      label = countMatch[1].trim();
      qty = parseNumber(countMatch[2]);
      unit = normalizeUnit(countMatch[3] || guessCountUnit(label));
    }
  }

  const weightFromNote = extractWeightFromNote(noteText);
  if (weightFromNote && (guessCountUnit(label) === "buc" || !unit)) {
    qty = weightFromNote.qty;
    unit = weightFromNote.unit;
    notes.push(`cantitate aproximativa din nota: ${noteText}`);
  } else if (noteText) {
    notes.push(noteText);
  }

  const ingredientName = label.replace(/\+\s*$/, "").trim() || source;

  if (!qty || !unit) {
    return {
      ingredient: ingredientName,
      qty: 0,
      unit: "",
      note: [group ? `grup: ${group}` : "", ...notes].filter(Boolean).join(" | "),
      group,
      scalable: false,
    };
  }

  return {
    ingredient: ingredientName,
    qty,
    unit,
    note: [group ? `grup: ${group}` : "", ...notes].filter(Boolean).join(" | "),
    group,
    scalable: true,
  };
}

export function buildRecipeRowsFromLibrary(recipe) {
  const sourceLines = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];

  return sourceLines
    .flatMap((line) => splitIngredientLine(line))
    .map(({ group, token }) => parseToken(token, group))
    .filter(Boolean);
}

export function buildLibraryProductionRecipe(recipe) {
  const rows = buildRecipeRowsFromLibrary(recipe);
  return {
    _id: `library:${recipe.slug}`,
    slug: recipe.slug,
    nume: recipe.name,
    descriere: recipe.summary,
    retetaBaseKg: Number(recipe.yieldKg || 1) || 1,
    reteta: rows.map((row) => ({
      ingredient: row.ingredient,
      qty: row.qty,
      unit: row.unit,
      note: row.note,
      scalable: row.scalable,
      group: row.group,
    })),
    sourceLabel: recipe.source,
    isLibrary: true,
    meta: recipe,
  };
}

export function scaleProductionRows(rows = [], baseKg = 1, targetKg = 1) {
  const safeBaseKg = Number(baseKg || 1) > 0 ? Number(baseKg || 1) : 1;
  const safeTargetKg = Number(targetKg || 0) > 0 ? Number(targetKg || 0) : 0;

  return rows.map((row) => {
    if (!row.scalable || !row.unit) {
      return { ...row, scaledQty: null };
    }

    const scaledQty = (Number(row.qty || 0) * safeTargetKg) / safeBaseKg;
    return {
      ...row,
      scaledQty,
    };
  });
}

export function buildLibraryProductionRecipes() {
  return PATISER_RECIPES.map((recipe) => buildLibraryProductionRecipe(recipe));
}

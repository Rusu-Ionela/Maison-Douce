function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatScaledQuantity(value) {
  if (!Number.isFinite(value)) return "-";
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("ro-RO", {
    minimumFractionDigits: value < 10 ? 1 : 0,
    maximumFractionDigits: 2,
  });
}

function renderBadgeList(items = []) {
  if (!Array.isArray(items) || items.length === 0) return "";

  return `
    <div class="badge-row">
      ${items
        .map((item) => `<span class="badge">${escapeHtml(item)}</span>`)
        .join("")}
    </div>
  `;
}

function renderSimpleList(title, items = []) {
  if (!Array.isArray(items) || items.length === 0) return "";

  return `
    <section class="section">
      <h2>${escapeHtml(title)}</h2>
      <ul class="list">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderSteps(title, items = []) {
  if (!Array.isArray(items) || items.length === 0) return "";

  return `
    <section class="section">
      <h2>${escapeHtml(title)}</h2>
      <ol class="steps">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ol>
    </section>
  `;
}

export function buildRecipePrintDocument(recipe, scaledRows, targetKg) {
  const safeRecipe = recipe || {};
  const safeRows = Array.isArray(scaledRows) ? scaledRows : [];
  const generatedAt = new Date().toLocaleString("ro-RO");

  const rowsMarkup = safeRows.length
    ? safeRows
        .map((row) => {
          const baseValue =
            row.qty > 0 && row.unit
              ? `${formatScaledQuantity(row.qty)} ${escapeHtml(row.unit)}`
              : "fara cantitate fixa";
          const scaledValue =
            row.scalable && row.unit
              ? `${formatScaledQuantity(row.scaledQty)} ${escapeHtml(row.unit)}`
              : "dupa gust / nescalabil";

          return `
            <tr>
              <td>
                <strong>${escapeHtml(row.ingredient)}</strong>
                ${row.group ? `<div class="cell-note">${escapeHtml(row.group)}</div>` : ""}
              </td>
              <td>${baseValue}</td>
              <td>${scaledValue}</td>
              <td>${row.note ? escapeHtml(row.note) : "-"}</td>
            </tr>
          `;
        })
        .join("")
    : `
      <tr>
        <td colspan="4">Nu exista ingrediente scalabile pentru aceasta reteta.</td>
      </tr>
    `;

  return `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(safeRecipe.name || "Fisa tehnica reteta")} | Maison-Douce</title>
    <style>
      @page {
        size: A4;
        margin: 14mm;
      }

      :root {
        color-scheme: light;
        --bg: #fefbf4;
        --surface: #f7f1e8;
        --surface-strong: #fffdfa;
        --text: #232722;
        --muted: #5f635c;
        --line: #d8c8b4;
        --accent: #b4895f;
        --accent-soft: rgba(180, 137, 95, 0.14);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: Inter, Arial, sans-serif;
        line-height: 1.55;
      }

      .sheet {
        display: grid;
        gap: 18px;
      }

      .hero {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: linear-gradient(180deg, #fffdfa 0%, #f7f1e8 100%);
        padding: 24px;
      }

      .eyebrow {
        margin: 0 0 8px;
        color: var(--accent);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.24em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-family: "Times New Roman", Georgia, serif;
        font-size: 32px;
        line-height: 1.1;
        font-weight: 700;
      }

      .summary {
        margin-top: 12px;
        color: var(--muted);
        font-size: 14px;
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-top: 20px;
      }

      .meta-card {
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--surface-strong);
        padding: 14px;
      }

      .meta-label {
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .meta-value {
        margin-top: 6px;
        font-size: 18px;
        font-weight: 700;
      }

      .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 18px;
      }

      .badge {
        border: 1px solid var(--line);
        border-radius: 999px;
        background: var(--surface-strong);
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 600;
        color: var(--muted);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }

      .section {
        border: 1px solid var(--line);
        border-radius: 22px;
        background: var(--surface-strong);
        padding: 18px;
        break-inside: avoid;
      }

      h2 {
        margin: 0 0 12px;
        font-family: "Times New Roman", Georgia, serif;
        font-size: 21px;
        font-weight: 700;
      }

      .note {
        margin: 0 0 12px;
        color: var(--muted);
        font-size: 13px;
      }

      .list,
      .steps {
        margin: 0;
        padding-left: 18px;
      }

      .list li,
      .steps li {
        margin-bottom: 8px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--line);
        vertical-align: top;
        font-size: 13px;
        text-align: left;
      }

      th {
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .cell-note {
        margin-top: 4px;
        color: var(--muted);
        font-size: 11px;
      }

      .footer-note {
        border: 1px dashed var(--line);
        border-radius: 18px;
        background: var(--accent-soft);
        padding: 12px 14px;
        color: var(--muted);
        font-size: 12px;
      }

      @media print {
        body {
          background: white;
        }

        .section,
        .hero {
          box-shadow: none;
        }
      }

      @media (max-width: 900px) {
        .meta-grid,
        .grid {
          grid-template-columns: 1fr 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <section class="hero">
        <p class="eyebrow">Maison-Douce Laborator</p>
        <h1>${escapeHtml(safeRecipe.name || "Fisa tehnica reteta")}</h1>
        <p class="summary">${escapeHtml(safeRecipe.summary || "")}</p>
        <div class="meta-grid">
          <article class="meta-card">
            <div class="meta-label">Sursa</div>
            <div class="meta-value">${escapeHtml(safeRecipe.source || "-")}</div>
          </article>
          <article class="meta-card">
            <div class="meta-label">Randament baza</div>
            <div class="meta-value">${escapeHtml(safeRecipe.yieldLabel || "-")}</div>
          </article>
          <article class="meta-card">
            <div class="meta-label">Lot tinta</div>
            <div class="meta-value">${escapeHtml(
              `${formatScaledQuantity(Number(targetKg || 0))} kg`
            )}</div>
          </article>
          <article class="meta-card">
            <div class="meta-label">Generat la</div>
            <div class="meta-value">${escapeHtml(generatedAt)}</div>
          </article>
        </div>
        ${renderBadgeList(safeRecipe.highlights)}
      </section>

      <section class="section">
        <h2>Scalare pentru productie</h2>
        <p class="note">
          In dialogul de print al browserului poti alege si optiunea Save as PDF.
        </p>
        <table>
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Baza</th>
              <th>Cantitate scalata</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>${rowsMarkup}</tbody>
        </table>
      </section>

      <div class="grid">
        <section class="section">
          <h2>Parametri principali</h2>
          <table>
            <tbody>
              <tr><th>Portii</th><td>${escapeHtml(safeRecipe.servings || "-")}</td></tr>
              <tr><th>Stil</th><td>${escapeHtml(safeRecipe.style || "-")}</td></tr>
              <tr><th>Maturare</th><td>${escapeHtml(safeRecipe.maturation || "-")}</td></tr>
              <tr><th>Pastrare</th><td>${escapeHtml(safeRecipe.storage || "-")}</td></tr>
              <tr><th>Energie</th><td>${escapeHtml(safeRecipe.energyPer100g || "-")}</td></tr>
            </tbody>
          </table>
        </section>

        ${renderSimpleList("Ingrediente exacte", safeRecipe.ingredients)}
      </div>

      ${renderSimpleList("Procente si parametri tehnologici", safeRecipe.bakerPercent)}
      ${renderSteps("Pasi de lucru", safeRecipe.steps)}

      <div class="grid">
        ${renderSimpleList("Variatii uzuale", safeRecipe.variations)}
        ${renderSimpleList("Depanare", safeRecipe.troubleshooting)}
      </div>

      <section class="footer-note">
        Fisa este destinata uzului intern in laborator. Verifica temperaturile, timpul de
        maturare si conditiile de pastrare inainte de productie.
      </section>
    </main>
  </body>
</html>`;
}

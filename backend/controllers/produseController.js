const ProdusStudio = require("../models/ProdusStudio");
const { notifyAdmins } = require("../utils/notifications");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toDaysLeft(dateValue, now = new Date()) {
  const exp = new Date(dateValue);
  if (Number.isNaN(exp.getTime())) return null;
  return Math.ceil((exp.getTime() - now.getTime()) / ONE_DAY_MS);
}

async function verificaExpirari() {
  const produse = await ProdusStudio.find().lean();
  const now = new Date();

  let expirate = 0;
  let expiraCurand = 0;
  let notificariTrimise = 0;

  const alerte = [];

  for (const produs of produse) {
    if (!produs?.dataExpirare) continue;

    const zileRamase = toDaysLeft(produs.dataExpirare, now);
    if (zileRamase == null) continue;

    if (zileRamase < 0) {
      expirate += 1;
      alerte.push({
        titlu: "Produs expirat",
        mesaj: `Produsul ${produs.nume || "(fara nume)"} este expirat.`,
      });
      continue;
    }

    if (zileRamase <= 3) {
      expiraCurand += 1;
      const labelZile = zileRamase === 1 ? "zi" : "zile";
      alerte.push({
        titlu: "Produs aproape de expirare",
        mesaj: `Produsul ${produs.nume || "(fara nume)"} expira in ${zileRamase} ${labelZile}.`,
      });
    }
  }

  for (const alerta of alerte) {
    const results = await notifyAdmins({
      titlu: alerta.titlu,
      mesaj: alerta.mesaj,
      tip: "warning",
      link: "/admin/catalog",
    });
    notificariTrimise += Array.isArray(results) ? results.length : 0;
  }

  return {
    verificate: produse.length,
    expirate,
    expiraCurand,
    alerteGenerate: alerte.length,
    notificariTrimise,
  };
}

module.exports = { verificaExpirari };

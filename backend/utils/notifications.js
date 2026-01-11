const nodemailer = require("nodemailer");
const Utilizator = require("../models/Utilizator");
const Notificare = require("../models/Notificare");

const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";

function getTransport() {
  if (!SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendEmail(to, subject, html) {
  const transport = getTransport();
  if (!transport) return false;
  try {
    await transport.sendMail({
      from: `Maison-Douce <${SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (e) {
    console.warn("Email send failed:", e?.message || e);
    return false;
  }
}

function buildEmailHtml({ titlu, mesaj, link }) {
  const linkHtml = link
    ? `<p><a href="${link}">Deschide in aplicatie</a></p>`
    : "";
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937;">
      <h2>${titlu || "Notificare"}</h2>
      <p>${mesaj || ""}</p>
      ${linkHtml}
      <p style="font-size: 12px; color: #6b7280;">Maison-Douce</p>
    </div>
  `;
}

async function notifyUser(userId, payload) {
  try {
    const user = await Utilizator.findById(userId).lean();
    if (!user) return null;
    const settings = user.setariNotificari || {};
    const inAppEnabled = settings.inApp !== false;
    const emailEnabled = settings.email !== false;

    let notif = null;
    if (inAppEnabled) {
      notif = await Notificare.create({
        userId,
        titlu: payload.titlu || "",
        mesaj: payload.mesaj || "",
        tip: payload.tip || "info",
        link: payload.link || "",
        canal: "inapp",
      });
    }

    if (emailEnabled && user.email) {
      await sendEmail(
        user.email,
        payload.titlu || "Notificare",
        buildEmailHtml(payload)
      );
    }
    return notif;
  } catch (e) {
    console.warn("notifyUser failed:", e?.message || e);
    return null;
  }
}

async function notifyAdmins(payload) {
  try {
    const admins = await Utilizator.find(
      { rol: { $in: ["admin", "patiser"] } },
      { _id: 1 }
    ).lean();
    if (!admins.length) return [];
    const results = [];
    for (const admin of admins) {
      results.push(await notifyUser(admin._id, payload));
    }
    return results;
  } catch (e) {
    console.warn("notifyAdmins failed:", e?.message || e);
    return [];
  }
}

module.exports = {
  notifyUser,
  notifyAdmins,
  sendEmail,
};

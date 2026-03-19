const Stripe = require("stripe");
const Comanda = require("../models/Comanda");
const Fidelizare = require("../models/Fidelizare");
const FidelizareConfig = require("../models/FidelizareConfig");
const { notifyUser, notifyAdmins } = require("../utils/notifications");
const { activateCutieFromComanda } = require("../utils/subscriptions");
const { createLogger, serializeError } = require("../utils/log");

const stripeLog = createLogger("stripe_webhook");

const stripeKey =
  process.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_SECRET ||
  process.env.STRIPE_SK ||
  "";
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2023-10-16" }) : null;

async function getFidelizareConfig() {
  const existing = await FidelizareConfig.findOne().lean();
  if (existing) return existing;
  const created = await FidelizareConfig.create({});
  return created.toObject();
}

function calcPoints(total, config) {
  const step = Number(config.pointsPer10 || 0);
  const perOrder = Number(config.pointsPerOrder || 0);
  const minTotal = Number(config.minTotal || 0);
  if (!Number.isFinite(total) || total < minTotal) return 0;
  const fromTotal = Math.floor(total / 10) * step;
  return Math.max(0, Math.floor(fromTotal + perOrder));
}

async function markComandaPaid(comanda, note) {
  if (!comanda) return false;
  const alreadyPaid =
    comanda.paymentStatus === "paid" || comanda.statusPlata === "paid";
  if (alreadyPaid) return false;

  comanda.paymentStatus = "paid";
  comanda.statusPlata = "paid";
  if (["plasata", "in_asteptare", "inregistrata"].includes(comanda.status)) {
    comanda.status = "confirmata";
  }
  comanda.statusHistory = Array.isArray(comanda.statusHistory)
    ? [...comanda.statusHistory, { status: "paid", note }]
    : [{ status: "paid", note }];
  await comanda.save();
  await activateCutieFromComanda(comanda);

  if (comanda.clientId) {
    await notifyUser(comanda.clientId, {
      titlu: "Plata confirmata",
      mesaj: `Plata pentru comanda #${comanda.numeroComanda || comanda._id} a fost confirmata.`,
      tip: "plata",
      link: `/plata?comandaId=${comanda._id}`,
    });
  }
  await notifyAdmins({
    titlu: "Plata confirmata",
    mesaj: `Plata confirmata pentru comanda #${comanda.numeroComanda || comanda._id}.`,
    tip: "plata",
    link: "/admin/comenzi",
  });

  return true;
}

async function awardFidelizareForPaidOrder(comanda) {
  if (!comanda?.clientId) return;

  const total = Number(comanda.totalFinal || comanda.total || 0);
  const cfg = await getFidelizareConfig();
  const earned = calcPoints(total, cfg);
  if (earned <= 0) return;

  let doc = await Fidelizare.findOne({ utilizatorId: comanda.clientId });
  if (!doc) {
    doc = await Fidelizare.create({
      utilizatorId: comanda.clientId,
      puncteCurent: 0,
      puncteTotal: 0,
      nivelLoyalitate: "bronze",
      reduceriDisponibile: [],
      istoric: [],
    });
    stripeLog.info("wallet_created", {
      clientId: String(comanda.clientId),
    });
  }

  doc.puncteCurent = Number(doc.puncteCurent || 0) + earned;
  doc.puncteTotal = Number(doc.puncteTotal || 0) + earned;
  doc.istoric = Array.isArray(doc.istoric)
    ? [
        ...doc.istoric,
        {
          data: new Date(),
          tip: "earn",
          puncte: earned,
          sursa: "stripe",
          comandaId: comanda._id,
          descriere: "Plata Stripe confirmata",
        },
      ]
    : [
        {
          data: new Date(),
          tip: "earn",
          puncte: earned,
          sursa: "stripe",
          comandaId: comanda._id,
          descriere: "Plata Stripe confirmata",
        },
      ];

  if (doc.puncteTotal >= 500) doc.nivelLoyalitate = "gold";
  else if (doc.puncteTotal >= 200) doc.nivelLoyalitate = "silver";
  else doc.nivelLoyalitate = "bronze";

  await doc.save();
  stripeLog.info("wallet_awarded", {
    clientId: String(comanda.clientId),
    comandaId: String(comanda._id),
    earned,
  });
}

module.exports = async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    stripeLog.error("config_missing", {
      hasStripe: Boolean(stripe),
      hasSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      requestId: req.id,
    });
    return res.status(400).send("Stripe webhook neconfigurat.");
  }

  const sig = req.headers["stripe-signature"];
  if (!sig) {
    stripeLog.error("signature_header_missing", {
      requestId: req.id,
    });
    return res.status(400).send("Missing stripe-signature header");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    stripeLog.info("signature_verified", {
      requestId: req.id,
      eventId: event.id,
      eventType: event.type,
    });
  } catch (err) {
    stripeLog.error("signature_verification_failed", {
      requestId: req.id,
      error: serializeError(err),
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    stripeLog.info("event_received", {
      requestId: req.id,
      eventId: event.id,
      eventType: event.type,
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session?.metadata?.orderId || session?.client_reference_id;
      stripeLog.info("checkout_session_completed", {
        requestId: req.id,
        eventId: event.id,
        orderId: String(orderId || ""),
        sessionId: String(session?.id || ""),
      });

      if (!orderId) {
        stripeLog.warn("order_id_missing_in_checkout_session", {
          requestId: req.id,
          eventId: event.id,
        });
      } else {
        const comanda = await Comanda.findById(orderId);
        if (!comanda) {
          stripeLog.warn("order_not_found_for_checkout_session", {
            requestId: req.id,
            eventId: event.id,
            orderId: String(orderId),
          });
        } else {
          const changed = await markComandaPaid(
            comanda,
            "Stripe checkout.session.completed"
          );
          if (changed) {
            stripeLog.info("order_marked_paid", {
              requestId: req.id,
              eventId: event.id,
              orderId: String(comanda._id),
              source: "checkout.session.completed",
            });
            await awardFidelizareForPaidOrder(comanda);
          } else {
            stripeLog.info("order_already_paid", {
              requestId: req.id,
              eventId: event.id,
              orderId: String(comanda._id),
            });
          }
        }
      }
    } else if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object || {};
      const orderId = pi?.metadata?.orderId || pi?.metadata?.order_id;
      stripeLog.info("payment_intent_succeeded", {
        requestId: req.id,
        eventId: event.id,
        orderId: String(orderId || ""),
        paymentIntentId: String(pi?.id || ""),
      });

      if (!orderId) {
        stripeLog.warn("order_id_missing_in_payment_intent", {
          requestId: req.id,
          eventId: event.id,
        });
      } else {
        const comanda = await Comanda.findById(orderId);
        if (!comanda) {
          stripeLog.warn("order_not_found_for_payment_intent", {
            requestId: req.id,
            eventId: event.id,
            orderId: String(orderId),
          });
        } else {
          const changed = await markComandaPaid(
            comanda,
            "Stripe payment_intent.succeeded"
          );
          if (changed) {
            stripeLog.info("order_marked_paid", {
              requestId: req.id,
              eventId: event.id,
              orderId: String(comanda._id),
              source: "payment_intent.succeeded",
            });
            await awardFidelizareForPaidOrder(comanda);
          } else {
            stripeLog.info("order_already_paid", {
              requestId: req.id,
              eventId: event.id,
              orderId: String(comanda._id),
            });
          }
        }
      }
    } else if (
      event.type === "payment_intent.payment_failed" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const obj = event.data.object || {};
      const orderId =
        obj?.metadata?.orderId || obj?.client_reference_id || obj?.metadata?.order_id;

      if (orderId) {
        const comanda = await Comanda.findById(orderId);
        if (comanda) {
          comanda.paymentStatus = "failed";
          comanda.statusPlata = "failed";
          await comanda.save();

          if (comanda.clientId) {
            await notifyUser(comanda.clientId, {
              titlu: "Plata esuata",
              mesaj: `Plata pentru comanda #${comanda.numeroComanda || comanda._id} a esuat.`,
              tip: "warning",
              link: `/plata?comandaId=${comanda._id}`,
            });
          }
          await notifyAdmins({
            titlu: "Plata esuata",
            mesaj: `Plata esuata pentru comanda #${comanda.numeroComanda || comanda._id}.`,
            tip: "warning",
            link: "/admin/comenzi",
          });

          stripeLog.warn("order_marked_payment_failed", {
            requestId: req.id,
            eventId: event.id,
            orderId: String(comanda._id),
            source: event.type,
          });
        }
      }
    } else {
      stripeLog.info("event_ignored", {
        requestId: req.id,
        eventId: event.id,
        eventType: event.type,
      });
    }
  } catch (err) {
    stripeLog.error("handler_failed", {
      requestId: req.id,
      eventId: event?.id,
      eventType: event?.type,
      error: serializeError(err),
    });
    return res.status(500).json({ error: "Stripe webhook processing failed." });
  }

  return res.json({ received: true, eventId: event.id });
};

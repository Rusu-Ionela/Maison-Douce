// backend/routes/stripeWebhook.js
const Stripe = require("stripe");
const Comanda = require("../models/Comanda");
const Fidelizare = require("../models/Fidelizare");
const FidelizareConfig = require("../models/FidelizareConfig");

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

module.exports = async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe webhook] Config missing: stripe =", !!stripe, ", secret =", !!process.env.STRIPE_WEBHOOK_SECRET);
    return res.status(400).send("Stripe webhook neconfigurat.");
  }

  const sig = req.headers["stripe-signature"];
  if (!sig) {
    console.error("[stripe webhook] Missing stripe-signature header");
    return res.status(400).send("Missing stripe-signature header");
  }

  let event;
  try {
    // ATENȚIE: ruta asta trebuie montată cu express.raw({ type: 'application/json' })
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('[stripe webhook] ✓ Event signature verified:', event.id, event.type);
  } catch (err) {
    console.error("[stripe webhook] ❌ Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log(`[stripe webhook] Processing event: type=${event.type}, id=${event.id}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session?.metadata?.orderId || session?.client_reference_id;
      console.log(`[stripe webhook] checkout.session.completed: orderId=${orderId}, sessionId=${session.id}`);

      if (orderId) {
        const comanda = await Comanda.findById(orderId);
        if (comanda) {
          console.log(`[stripe webhook] Found Comanda: ${comanda._id}`);

          comanda.paymentStatus = "paid";
          comanda.statusPlata = "paid";
          if (["plasata", "in_asteptare", "inregistrata"].includes(comanda.status)) {
            comanda.status = "confirmata";
          }
          comanda.statusHistory = Array.isArray(comanda.statusHistory)
            ? [...comanda.statusHistory, { status: "paid", note: "Stripe payment confirmed" }]
            : [{ status: "paid", note: "Stripe payment confirmed" }];
          await comanda.save();
          console.log("[stripe webhook] Comanda marked as paid");

          const total = Number(comanda.totalFinal || comanda.total || 0);
          const cfg = await getFidelizareConfig();
          const earned = calcPoints(total, cfg);
          if (earned > 0 && comanda.clientId) {
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
              console.log(`[stripe webhook] Created Fidelizare for clientId=${comanda.clientId}`);
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
            console.log(`[stripe webhook] Fidelizare awarded: ${earned} points`);
          }
        }
        } else {
          console.warn(`[stripe webhook] ⚠ Comanda NOT found for orderId=${orderId}`);
        }
      } else {
        console.warn(`[stripe webhook] ⚠ No orderId in session metadata`);
      }
    } else if (event.type === "payment_intent.succeeded") {
      console.log(`[stripe webhook] payment_intent.succeeded (logged for future use)`);
    } else {
      console.log(`[stripe webhook] Unhandled event type: ${event.type}`);
    }
  } catch (e) {
    console.error("[stripe webhook] ❌ Handler error:", e.message);
    console.error("[stripe webhook] Error stack:", e.stack);
    // răspundem 500 pentru a permite debugging; Stripe va reîncerca doar la 2xx
    return res.status(500).json({ error: e.message, details: e.stack });
  }

  res.json({ received: true, eventId: event.id });
};

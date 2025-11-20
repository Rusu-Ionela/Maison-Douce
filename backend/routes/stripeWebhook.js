// backend/routes/stripeWebhook.js
const Stripe = require("stripe");
const Comanda = require("../models/Comanda");
const Fidelizare = require("../models/Fidelizare");

const stripeKey =
  process.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_SECRET ||
  process.env.STRIPE_SK ||
  "";
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2023-10-16" }) : null;

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
          // normalizează câmpurile tale existente
          comanda.paymentStatus = "paid";     // dacă ai câmp separat
          comanda.status = "confirmata";      // status general al comenzii
          await comanda.save();
          console.log(`[stripe webhook] ✓ Comanda marked as paid and confirmed`);

          // Acordă puncte (ex: 10% din total)
          const earned = Math.floor((Number(comanda.total) || 0) * 0.1);
          if (earned > 0 && comanda.clientId) {
            let doc = await Fidelizare.findOne({
              $or: [{ userId: comanda.clientId }, { clientId: comanda.clientId }],
            });
            if (!doc) {
              doc = await Fidelizare.create({
                userId: comanda.clientId,
                clientId: comanda.clientId,
                points: 0,
                puncte: 0,
                history: [],
                istoric: [],
              });
              console.log(`[stripe webhook] Created new Fidelizare doc for clientId=${comanda.clientId}`);
            }
            doc.points = (doc.points || 0) + earned;
            doc.puncte = (doc.puncte || 0) + earned;

            const entry = {
              type: "earn",
              points: earned,
              puncteModificare: earned,
              source: `order:${comanda._id}`,
              note: "Stripe paid",
              descriere: "Stripe paid",
              at: new Date(),
            };
            doc.history = Array.isArray(doc.history) ? [...doc.history, entry] : [entry];
            doc.istoric = Array.isArray(doc.istoric) ? [...doc.istoric, entry] : [entry];
            await doc.save();
            console.log(`[stripe webhook] ✓ Fidelizare awarded: ${earned} points`);
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

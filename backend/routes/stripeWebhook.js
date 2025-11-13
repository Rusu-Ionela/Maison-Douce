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
    return res.status(400).send("Stripe webhook neconfigurat.");
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // ATENȚIE: ruta asta trebuie montată cu express.raw({ type: 'application/json' })
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session?.metadata?.orderId || session?.client_reference_id;

      if (orderId) {
        const comanda = await Comanda.findById(orderId);
        if (comanda) {
          // normalizează câmpurile tale existente
          comanda.paymentStatus = "paid";     // dacă ai câmp separat
          comanda.status = "confirmata";      // status general al comenzii
          await comanda.save();

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
          }
        }
      }
    }

    // dacă folosești și Payment Intent direct:
    // if (event.type === "payment_intent.succeeded") { ... }
  } catch (e) {
    console.error("stripe webhook handler error:", e);
    // răspundem 200 oricum, ca Stripe să nu reîncerce excesiv
  }

  res.json({ received: true });
};

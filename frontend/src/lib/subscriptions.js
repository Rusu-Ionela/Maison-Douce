export const SUBSCRIPTION_PLANS = [
  {
    id: "basic",
    name: "Mini Sweet Box",
    shortLabel: "Basic",
    price: 400,
    description: "Cutie lunara cu 5 mini-prajituri artizanale.",
    perks: ["5 mini deserturi", "surpriza de sezon", "livrare/ridicare flexibila"],
  },
  {
    id: "premium",
    name: "Maison Deluxe",
    shortLabel: "Premium",
    price: 600,
    description: "Cutie lunara cu 10 deserturi variate si selectie sezoniera.",
    perks: ["10 deserturi variate", "surpriza premium", "prioritate la selectii noi"],
  },
  {
    id: "deluxe",
    name: "Royal Experience",
    shortLabel: "Deluxe",
    price: 900,
    description: "Selectie premium cu editie speciala lunara si bonus personalizat.",
    perks: ["editie speciala lunara", "bonus personalizat", "mix premium de deserturi"],
  },
];

export function getSubscriptionPlan(planId) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) || SUBSCRIPTION_PLANS[0];
}

export function getSubscriptionPlanLabel(planId) {
  return getSubscriptionPlan(planId)?.shortLabel || "Basic";
}

export function formatSubscriptionMoney(value) {
  return `${Number(value || 0).toFixed(2)} MDL`;
}

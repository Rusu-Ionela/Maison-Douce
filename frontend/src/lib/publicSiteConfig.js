import publicSiteConfig from "../../../shared/publicSiteConfig.json";

export const APP_CONTACT = Object.freeze({
  email: String(publicSiteConfig?.contact?.email || "").trim(),
  emailUri: String(publicSiteConfig?.contact?.emailUri || "").trim(),
  phoneDisplay: String(publicSiteConfig?.contact?.phoneDisplay || "").trim(),
  phoneUri: String(publicSiteConfig?.contact?.phoneUri || "").trim(),
  program: String(publicSiteConfig?.contact?.program || "").trim(),
  city: String(publicSiteConfig?.contact?.city || "").trim(),
});

export const ASSISTANT_STARTER_QUESTIONS = Object.freeze(
  Array.isArray(publicSiteConfig?.assistant?.starterQuestions)
    ? publicSiteConfig.assistant.starterQuestions
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : []
);

export const CONTACT_ITEMS = Object.freeze([
  { title: "Email atelier", value: APP_CONTACT.email },
  { title: "Telefon", value: APP_CONTACT.phoneDisplay },
  { title: "Program", value: APP_CONTACT.program },
]);

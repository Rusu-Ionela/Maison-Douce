const publicSiteConfig = require("../../shared/publicSiteConfig.json");

const APP_CONTACT = Object.freeze({
  email: String(publicSiteConfig?.contact?.email || "").trim(),
  emailUri: String(publicSiteConfig?.contact?.emailUri || "").trim(),
  phoneDisplay: String(publicSiteConfig?.contact?.phoneDisplay || "").trim(),
  phoneUri: String(publicSiteConfig?.contact?.phoneUri || "").trim(),
  program: String(publicSiteConfig?.contact?.program || "").trim(),
  city: String(publicSiteConfig?.contact?.city || "").trim(),
});

const ASSISTANT_STARTER_QUESTIONS = Object.freeze(
  Array.isArray(publicSiteConfig?.assistant?.starterQuestions)
    ? publicSiteConfig.assistant.starterQuestions
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : []
);

module.exports = {
  APP_CONTACT,
  ASSISTANT_STARTER_QUESTIONS,
};

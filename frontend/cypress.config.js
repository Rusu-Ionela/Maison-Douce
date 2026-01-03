const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "cypress/e2e/**/*.spec.js",
    supportFile: "cypress/support/e2e.js",
    setupNodeEvents(on, config) {
      on("before:browser:launch", (browser, launchOptions) => {
        launchOptions.args.push("--disable-gpu");
        launchOptions.args.push("--disable-features=RendererCodeIntegrity");
        launchOptions.args.push("--disable-dev-shm-usage");
        launchOptions.args.push("--no-sandbox");
        return launchOptions;
      });
    },
  },
});

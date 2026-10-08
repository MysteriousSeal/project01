// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // EvenHold's own code, kept as it is there so it can be updated from it: its array style stays.
    files: ["src/eh/**"],
    rules: { "@typescript-eslint/array-type": "off", "@typescript-eslint/no-unused-expressions": "off", "no-unused-expressions": "off" },
  }
]);

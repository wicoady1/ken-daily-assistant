const { dirname } = require("path");
const { FlatCompat } = require("@eslint/eslintrc");
const { fileURLToPath } = require("url");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  ...compat.extends("next/core-web-vitals"),
];

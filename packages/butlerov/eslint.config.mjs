// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylisticJs from "@stylistic/eslint-plugin-js";

export default tseslint.config({
  plugins: {
    "@stylistic/js": stylisticJs
  },
    extends: [
        eslint.configs.recommended,
        tseslint.configs.recommended,
        tseslint.configs.strict,
        tseslint.configs.stylistic,
    ],
    rules: {
        "@typescript-eslint/prefer-for-of": "off",
        //"indent": [
        //    "error",
        //    4
        //],
        //"@stylistic/js/max-len": ['error', 120],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
});
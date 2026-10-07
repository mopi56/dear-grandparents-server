import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
    {
        ignores: ["node_modules/**", "uploads/**", "dependency-graph.svg"],
    },

    /*
     * Backend Node.js
     */
    {
        files: [
            "server.js",
            "config/**/*.js",
            "routes/**/*.js",
            "services/**/*.js",
            "test/**/*.js",
            "utils/**/*.js",
            "scripts/**/*.js",
        ],

        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
            },
        },

        rules: {
            ...js.configs.recommended.rules,

            "no-console": "off",
            "no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
        },
    },

    /*
     * Frontend
     */
    {
        files: ["public/**/*.js", "private/**/*.js"],

        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
        },

        rules: {
            ...js.configs.recommended.rules,

            "no-console": "off",
            "no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
        },
    },

    /*
     * Prettier désactive les règles ESLint
     * qui entreraient en conflit avec son formatage.
     */
    eslintConfigPrettier,
];

import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import globals from "globals";

export default [
	{
		ignores: ["main.js", "node_modules/**", "coverage/**", "dist/**"],
	},
	js.configs.recommended,
	...tsPlugin.configs["flat/recommended"],
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2021,
			},
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
		},
	},
	{
		files: ["src/__tests__/**/*.ts"],
		languageOptions: {
			globals: {
				...globals.jest,
			},
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
		},
	},
];

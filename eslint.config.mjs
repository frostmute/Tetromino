import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
	{
		ignores: ["main.js", "node_modules/**", "coverage/**", "dist/**", "src/__tests__/**", "src/__mocks__/**"],
	},
	js.configs.recommended,
	...obsidianmd.configs.recommended,
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				project: "./tsconfig.eslint.json",
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
			"obsidianmd/no-sample-code": "off",
			"obsidianmd/prefer-create-el": "warn",
			"obsidianmd/no-console": "off",
			"obsidianmd/prefer-window-timers": "off",
		},
	},
];

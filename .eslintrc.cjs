module.exports = {
	root: true,
	env: {
		browser: true,
		node: true,
		es2021: true,
	},
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
	},
	plugins: ["@typescript-eslint"],
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
	ignorePatterns: ["main.js", "node_modules/", "coverage/", "dist/"],
	overrides: [
		{
			files: ["src/__tests__/**/*.ts"],
			env: {
				jest: true,
			},
		},
	],
};

/** @type {import('jest').Config} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	roots: ["<rootDir>"],
	testMatch: ["**/__tests__/**/*.test.ts"],
	collectCoverageFrom: ["src/**/*.ts", "!src/**/__tests__/**"],
	moduleNameMapper: {
		"^obsidian$": "<rootDir>/src/__mocks__/obsidian.ts",
	},
	transform: {
		"^.+\\\\.tsx?$": [
			"ts-jest",
			{
				tsconfig: "tsconfig.json",
				useESM: true
			}
		]
	}
};

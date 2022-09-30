import { defaults } from "jest-config";
import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  preset: "ts-jest/presets/default-esm",
  testMatch: ["**/test/**/*.spec.ts"],
  transform: {
    "\\.ts$": [
      "ts-jest",
      {
        tsconfig: "./tsconfig.spec.json",
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFilesAfterEnv: ["jest-extended/all"],
  testEnvironment: "node",
  clearMocks: true,
  resetMocks: true,
  moduleFileExtensions: [...defaults.moduleFileExtensions, "d.ts"],
  moduleDirectories: [...defaults.moduleDirectories, "src"],
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.{ts,tsx}"],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  verbose: true,
};

export default config;

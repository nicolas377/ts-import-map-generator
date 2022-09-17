import { defaults } from "jest-config";
import type { InitialOptionsTsJest } from "ts-jest";

const config: InitialOptionsTsJest = {
  // TODO
  passWithNoTests: true,

  preset: "ts-jest/presets/default-esm",
  testMatch: ["**/test/**/*.spec.ts"],
  transform: {
    "\\.ts$": [
      "ts-jest",
      {
        tsconfig: "./tsconfig.spec.json",
        isolatedModules: true,
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
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

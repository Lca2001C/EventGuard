import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  collectCoverageFrom: ["src/**/*.(t|j)s"],
  coverageDirectory: "coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@eventguard/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^@eventguard/validations$": "<rootDir>/../../packages/validations/src/index.ts"
  }
};

export default config;

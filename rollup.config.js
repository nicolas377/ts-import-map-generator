// @ts-check
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";
import merge from "lodash.merge";
import dts from "rollup-plugin-dts";

/** @param {boolean} dev */
function createPlugins(dev) {
  return dev
    ? [
        replace({
          preventAssignment: true,
          values: {
            productionBuild: JSON.stringify(!dev),
          },
        }),
        typescript({
          tsconfig: "./tsconfig.rollup.json",
          compilerOptions: { removeComments: true },
        }),
        json({ preferConst: true }),
      ]
    : [
        replace({
          preventAssignment: true,
          values: {
            productionBuild: JSON.stringify(!dev),
          },
        }),
        typescript({
          tsconfig: "./tsconfig.rollup.json",
        }),
        json({ preferConst: true }),
      ];
}

/**
 * @param {import("rollup").RollupOptions} overrides
 * @param {object} options
 * @param {"api" | "cli"} options.apiOrCli
 * @param {boolean} options.dev
 * @param {"cjs" | "esm"} options.format
 */
function createConfig(overrides, { apiOrCli, dev, format }) {
  return merge(overrides, {
    input:
      apiOrCli === "api"
        ? "./src/entrypoints/api.ts"
        : "./src/entrypoints/cli.ts",
    treeshake: dev ? undefined : "recommended",
    output: {
      sourcemap: true,
      file: `dist/${apiOrCli}.${dev ? "dev" : "prod"}.${
        format === "cjs" ? "js" : "mjs"
      }`,
      format,
    },
    plugins: createPlugins(dev),
  });
}

/** @type {import("rollup").RollupOptions[]} */
const config = [
  createConfig({}, { apiOrCli: "cli", dev: true, format: "cjs" }),
  createConfig({}, { apiOrCli: "cli", dev: false, format: "cjs" }),
  createConfig({}, { apiOrCli: "api", dev: true, format: "esm" }),
  createConfig({}, { apiOrCli: "api", dev: false, format: "esm" }),
  createConfig({}, { apiOrCli: "api", dev: true, format: "cjs" }),
  createConfig({}, { apiOrCli: "api", dev: false, format: "cjs" }),
  {
    input: "./src/entrypoints/api.ts",
    output: {
      file: "./dist/api.d.ts",
      format: "esm",
    },
    plugins: [dts()],
  },
];

export default config;

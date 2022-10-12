import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";
import { RollupOptions } from "rollup";
import dts from "rollup-plugin-dts";
import externals from "rollup-plugin-node-externals";

type apiOrCliType = "api" | "cli";

function createPlugins(dev: boolean, apiOrCli: apiOrCliType) {
  return dev
    ? [
        replace({
          preventAssignment: true,
          values: {
            "process.env.IMG_PROJECT_ENV": JSON.stringify("development"),
            "process.env.IMG_PROJECT_RUN_TYPE": JSON.stringify(apiOrCli),
          },
        }),
        typescript({
          tsconfig: "./tsconfig.rollup.json",
          compilerOptions: { removeComments: false },
        }),
        json({ preferConst: true }),
        externals(),
      ]
    : [
        replace({
          preventAssignment: true,
          values: {
            "process.env.IMG_PROJECT_ENV": JSON.stringify("production"),
            "process.env.IMG_PROJECT_RUN_TYPE": JSON.stringify(apiOrCli),
          },
        }),
        typescript({
          tsconfig: "./tsconfig.rollup.json",
          compilerOptions: { removeComments: true },
        }),
        json({ preferConst: true }),
        externals(),
      ];
}

function createConfig({
  apiOrCli,
  dev,
  format,
}: {
  apiOrCli: "api" | "cli";
  dev: boolean;
  format: "cjs" | "esm";
}): RollupOptions {
  return {
    input: `./src/${apiOrCli}/entrypoint.ts`,
    treeshake: dev ? "safest" : "recommended",
    output: {
      sourcemap: true,
      file: `dist/${apiOrCli}.${dev ? "dev" : "prod"}.${
        format === "cjs" ? "js" : "mjs"
      }`,
      format,
    },
    plugins: createPlugins(dev, apiOrCli),
  };
}

const config = [
  createConfig({ apiOrCli: "cli", dev: true, format: "cjs" }),
  createConfig({ apiOrCli: "cli", dev: false, format: "cjs" }),
  createConfig({ apiOrCli: "api", dev: true, format: "esm" }),
  createConfig({ apiOrCli: "api", dev: false, format: "esm" }),
  createConfig({ apiOrCli: "api", dev: true, format: "cjs" }),
  createConfig({ apiOrCli: "api", dev: false, format: "cjs" }),
  {
    input: "./src/api/entrypoint.ts",
    output: {
      file: "./dist/api.d.ts",
      format: "esm",
    },
    plugins: [dts(), json({ preferConst: true })],
  },
];

export default config;

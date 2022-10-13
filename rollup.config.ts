import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import { Plugin, RollupOptions } from "rollup";
import externals from "rollup-plugin-node-externals";
import typescript from "rollup-plugin-typescript2";

type apiOrCliType = "api" | "cli";

function createPlugins(
  dev: boolean,
  apiOrCli: apiOrCliType,
  generateTypes: boolean
): Plugin[] {
  return [
    typescript({
      tsconfig: "./tsconfig.rollup.json",
      useTsconfigDeclarationDir: true,
      tsconfigOverride: {
        removeComments: !dev,
        ...(generateTypes
          ? {
              declaration: true,
              declarationDir: "./types",
            }
          : {}),
      },
    }),
    replace({
      preventAssignment: true,
      values: {
        "process.env.IMG_PROJECT_ENV": JSON.stringify(
          dev ? "development" : "production"
        ),
        "process.env.IMG_PROJECT_RUN_TYPE": JSON.stringify(apiOrCli),
      },
    }),
    json({ preferConst: true }),
    externals(),
  ];
}

interface CreateConfigOptions {
  api?: boolean;
  cli?: boolean;
  dev: boolean;
  format: "cjs" | "esm";
  generateTypes?: boolean;
}

function createConfig(
  options: CreateConfigOptions & { cli: true; api: true }
): undefined;
function createConfig(
  options: CreateConfigOptions & { cli: true }
): RollupOptions;
function createConfig(
  options: CreateConfigOptions & { api: true }
): RollupOptions;
function createConfig(options: CreateConfigOptions): undefined;
function createConfig({
  api,
  cli,
  dev,
  format,
  generateTypes = false,
}: CreateConfigOptions): RollupOptions | undefined {
  if (api && cli) {
    return undefined;
  } else if (api) {
    return {
      input: "./src/api/entrypoint.ts",
      treeshake: !dev,
      output: {
        sourcemap: true,
        format,
        file: `./dist/api.${dev ? "dev" : "prod"}.${
          format === "cjs" ? "js" : "mjs"
        }`,
      },
      plugins: createPlugins(dev, "api", generateTypes),
    };
  } else if (cli) {
    return {
      input: "./src/cli/entrypoint.ts",
      treeshake: !dev,
      output: {
        sourcemap: true,
        format,
        file: `./dist/cli.${dev ? "dev" : "prod"}.${
          format === "cjs" ? "js" : "mjs"
        }`,
      },
      plugins: createPlugins(dev, "cli", generateTypes),
    };
  }

  return undefined;
}

// TODO: fix the dts bundle generation
const config: RollupOptions[] = [
  createConfig({ cli: true, dev: true, format: "cjs" }),
  createConfig({ cli: true, dev: false, format: "cjs" }),
  createConfig({ api: true, dev: true, format: "esm" }),
  createConfig({ api: true, dev: false, format: "esm" }),
  createConfig({ api: true, dev: true, format: "cjs" }),
  createConfig({ api: true, dev: false, format: "cjs", generateTypes: true }),
];

export default config;

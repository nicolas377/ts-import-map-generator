// This is where the code that tells the parser what arguments exist, and how to parse and validate them goes.
// This is the only place where the parser should need to be modified to add new arguments.

export type ArgumentType = string | boolean | number;

type StringFromArgumentType<T extends ArgumentType> = T extends string
  ? "string"
  : T extends boolean
  ? "boolean"
  : T extends number
  ? "number"
  : never;

interface BaseArgumentData<T extends ArgumentType> {
  id: ArgumentKind;
  name: string;
  description: string;
  required: boolean;
  type: StringFromArgumentType<T>;
  defaultValue: T;
  singleDashNames: string[];
  doubleDashNames: string[];
  dataGetter: (value: string) => T | Error;
  validator: (value: T) => boolean;
}

interface StringArgumentType extends BaseArgumentData<string> {
  type: "string";
  defaultValue: string;
  singleDashNames: [];
  dataGetter: (value: string) => string | Error;
  validator: (value: string) => boolean;
}

interface BooleanArgumentType extends BaseArgumentData<boolean> {
  type: "boolean";
  defaultValue: boolean;
  singleDashNames: string[];
  dataGetter: (value: string) => boolean | Error;
  validator: (value: boolean) => boolean;
}

interface NumberArgumentType extends BaseArgumentData<number> {
  type: "number";
  defaultValue: number;
  singleDashNames: [];
  dataGetter: (value: string) => number | Error;
  validator: (value: number) => boolean;
}

type ArgumentData =
  | StringArgumentType
  | BooleanArgumentType
  | NumberArgumentType;

export const idToDataMap = new Map<ArgumentKind, ArgumentData>();
export const nameToIdMap = new Map<
  string,
  [singleOrDoubleDash: "single" | "double", kind: ArgumentKind]
>();
export const requiredArgumentIds: ArgumentKind[] = [];

function createArgument(data: ArgumentData): void {
  const { id, singleDashNames, doubleDashNames, required } = data;

  idToDataMap.set(id, data);
  if (required) {
    requiredArgumentIds.push(id);
  }
  for (const name of singleDashNames) {
    nameToIdMap.set(name, ["single", id]);
  }
  for (const name of doubleDashNames) {
    nameToIdMap.set(name, ["double", id]);
  }
}

export const missingArgumentSymbol = Symbol.for("missing");

function numberDataGetter(value: string): number {
  return Number.parseInt(value, 10);
}

function booleanDataGetter(value: string): boolean | Error {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return new Error(`Invalid boolean value: ${value}`);
}

function noopValidator() {
  return true;
}

// This is where the code that tells the parser what arguments exist, and how to parse and validate them goes.

export const enum ArgumentKind {
  Help,
  Version,
  Entrypoint,
  GraphMaxDepth,
  IgnoreFiles,
}

createArgument({
  id: ArgumentKind.Help,
  name: "help",
  description: "Show this help message.",
  required: false,
  type: "boolean",
  defaultValue: false,
  singleDashNames: ["h"],
  doubleDashNames: ["help"],
  dataGetter: booleanDataGetter,
  validator: noopValidator,
});

createArgument({
  id: ArgumentKind.Version,
  name: "version",
  description: "Show the version of the import map generator.",
  required: false,
  type: "boolean",
  defaultValue: false,
  singleDashNames: ["v"],
  doubleDashNames: ["version"],
  dataGetter: booleanDataGetter,
  validator: noopValidator,
});

createArgument({
  id: ArgumentKind.Entrypoint,
  name: "entrypoint",
  description: "The entrypoint to generate an import map from.",
  required: true,
  type: "string",
  defaultValue: missingArgumentSymbol as unknown as string,
  singleDashNames: [],
  doubleDashNames: ["entrypoint"],
  dataGetter: (value) => value,
  validator: (value) => value !== "",
});

createArgument({
  id: ArgumentKind.GraphMaxDepth,
  name: "graph-max-depth",
  description: "The maximum depth of the graph to generate.",
  required: false,
  type: "number",
  defaultValue: 1000,
  singleDashNames: [],
  doubleDashNames: ["graph-max-depth", "max-depth"],
  dataGetter: numberDataGetter,
  validator: (value) => value >= 0,
});

createArgument({
  id: ArgumentKind.IgnoreFiles,
  name: "ignore-files",
  description: "A comma-separated list of globs to ignore when matched.",
  required: false,
  type: "string",
  defaultValue: "",
  singleDashNames: [],
  doubleDashNames: ["ignore-files", "ignore"],
  dataGetter: (value) => value,
  // TODO: Validate that the value is a comma-separated list of valid globs when implementing globs.
  validator: noopValidator,
});

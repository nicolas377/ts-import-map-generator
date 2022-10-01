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

function createArgument(data: ArgumentData): void {
  const { id, singleDashNames, doubleDashNames } = data;

  idToDataMap.set(id, data);
  for (const name of singleDashNames) {
    nameToIdMap.set(name, ["single", id]);
  }
  for (const name of doubleDashNames) {
    nameToIdMap.set(name, ["double", id]);
  }
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
}

createArgument({
  id: ArgumentKind.Help,
  name: "help",
  description: "Show this help message.",
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
  type: "boolean",
  defaultValue: false,
  singleDashNames: ["v"],
  doubleDashNames: ["version"],
  dataGetter: booleanDataGetter,
  validator: noopValidator,
});

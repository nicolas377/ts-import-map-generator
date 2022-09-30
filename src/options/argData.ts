// This is where the code that tells the parser what arguments exist, and how to parse and validate them goes.

type ArgumentType = "string" | "boolean" | "number";

type TypeFromArgumentType<T extends ArgumentType> = T extends "string"
  ? string
  : T extends "boolean"
  ? boolean
  : number;

interface ArgumentData<T extends ArgumentType> {
  id: ArgumentKind;
  name: string;
  description: string;
  type: T;
  defaultValue: TypeFromArgumentType<T>;
  singleDashNames: T extends "boolean" ? string[] : [];
  doubleDashNames: string[];
  validator?: (value: TypeFromArgumentType<T>) => boolean;
}

const nameToIdTable: Record<string, ArgumentKind> = {};

function createArgument<T extends ArgumentType>(
  id: ArgumentKind,
  name: string,
  description: string,
  type: T,
  defaultValue: TypeFromArgumentType<T>,
  singleDashNames: T extends "boolean" ? string[] : [],
  doubleDashNames: string[],
  /** For strings, you can use RegExp.prototype.test */
  validator?: (value: TypeFromArgumentType<T>) => boolean
): ArgumentData<T> {
  nameToIdTable[name] = id;

  return {
    id,
    name,
    description,
    type,
    singleDashNames,
    doubleDashNames,
    defaultValue,
    validator,
  };
}

const enum ArgumentKind {}

// This is where the code that tells the parser what arguments exist, and how to parse and validate them goes.

type RawStringArgumentType = "string" | "boolean" | "number";

type TypeFromArgumentType<T extends RawStringArgumentType> = T extends "string"
  ? string
  : T extends "boolean"
  ? boolean
  : number;

interface ArgumentData<T extends RawStringArgumentType> {
  id: ArgumentKind;
  name: string;
  description: string;
  type: T;
  defaultValue: TypeFromArgumentType<T>;
  singleDashNames: T extends "boolean" ? string[] : [];
  doubleDashNames: string[];
  dataGetter: (value: string) => TypeFromArgumentType<T>;
  validator: (value: TypeFromArgumentType<T>) => boolean;
}

export type BooleanArgumentDate = ArgumentData<"boolean">;

export const idToDataMap = new Map<
  ArgumentKind,
  ArgumentData<RawStringArgumentType>
>();
export const nameToIdMap = new Map<string, ArgumentKind>();
export const idToDefaultMap = new Map<
  ArgumentKind,
  TypeFromArgumentType<RawStringArgumentType>
>();

function createArgument<T extends RawStringArgumentType>(
  id: ArgumentKind,
  name: string,
  description: string,
  type: T,
  defaultValue: TypeFromArgumentType<T>,
  singleDashNames: T extends "boolean" ? string[] : [],
  doubleDashNames: string[],
  dataGetter: (value: string) => TypeFromArgumentType<T>,
  validator: (value: TypeFromArgumentType<T>) => boolean
): void {
  const argumentData: ArgumentData<T> = {
    id,
    name,
    description,
    type,
    singleDashNames,
    doubleDashNames,
    defaultValue,
    dataGetter,
    validator,
  };

  idToDefaultMap.set(id, defaultValue);
  idToDataMap.set(id, argumentData);
  for (const name of [...singleDashNames, ...doubleDashNames]) {
    nameToIdMap.set(name, id);
  }
}

const enum ArgumentKind {}

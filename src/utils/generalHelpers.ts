export function keysOfObject<T extends PropertyKey>(
  obj: Record<T, unknown>
): T[] {
  return Object.keys(obj) as T[];
}

export function entriesOfObject<T extends PropertyKey, U>(
  obj: Record<T, U>
): [T, U][] {
  return Object.entries(obj) as [T, U][];
}

export function objectHasProperty<T extends PropertyKey>(
  record: Readonly<Record<T, unknown>>,
  key: PropertyKey
): key is T {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export function arrayIncludesValue<T>(
  arr: readonly T[],
  value: unknown
): value is T {
  return arr.includes(value as T);
}

export function getElementInArray<T>(array: T[], index: number): T | undefined {
  if (index < 0 || index >= array.length) {
    return undefined;
  }
  return array[index];
}

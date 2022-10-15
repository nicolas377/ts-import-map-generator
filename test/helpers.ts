import { arrayIncludesValue, keysOfObject } from "utils/helpers";

// Takes in an object and an array of keys to omit from the object, and returns a new object with the omitted keys.
export function objectWithoutProperties<
  O extends Record<K, unknown>,
  RK extends PropertyKey,
  K extends PropertyKey = keyof O
>(obj: O, keys: RK[]): Omit<O, RK> {
  return keysOfObject(obj)
    .filter((key): key is Exclude<K, RK> => !arrayIncludesValue(keys, key))
    .reduce((newObj, key) => {
      return { ...newObj, [key]: obj[key] };
    }, {} as Omit<O, RK>);
}

export function getErrorFromThrowingFunction(func: () => void): Error {
  try {
    func();
  } catch (e) {
    if (e instanceof Error) {
      return e;
    } else {
      fail("Expected function to throw an Error, but it threw something else.");
    }
  }
  fail("Expected function to throw, but it did not.");
}

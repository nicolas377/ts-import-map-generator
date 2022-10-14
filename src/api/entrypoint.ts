import { AnyFunction } from "utils";

// TODO
function wrapForApi<T extends AnyFunction>(func: T): T {
  return function (...args: Parameters<T>) {
    return func(...args);
  } as T;
}

export { programVersion } from "version";

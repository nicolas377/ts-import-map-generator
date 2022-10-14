import {
  AnyFunction,
  Comparison,
  noopFunction,
  objectHasProperty,
} from "./generalHelpers";
import { generatorVersion, Semver } from "version";

export interface LoggingHost {
  log(level: LogLevel, s: string): void;
}

export const enum LogLevel {
  Off,
  Error,
  Warning,
  Info,
  Verbose,
}

export namespace Debug {
  // logging

  // eslint-disable-next-line prefer-const
  export let currentLogLevel = LogLevel.Warning;
  export let loggingHost: LoggingHost | undefined;

  function shouldLog(level: LogLevel): boolean {
    return currentLogLevel <= level;
  }

  function logMessage(level: LogLevel, s: string) {
    if (loggingHost && shouldLog(level)) {
      loggingHost.log(level, s);
    }
  }

  export namespace log {
    export function error(s: string) {
      logMessage(LogLevel.Error, s);
    }

    export function warn(s: string): void {
      logMessage(LogLevel.Warning, s);
    }

    export function info(s: string): void {
      logMessage(LogLevel.Info, s);
    }

    export function trace(s: string): void {
      logMessage(LogLevel.Verbose, s);
    }
  }

  // assertions

  export function fail(message?: string, stackCrawlMark?: AnyFunction): never {
    // This is a great place to put a breakpoint; whenever we fail, we'll stop here.
    const e = new Error(
      message ? `Debug Failure. ${message}` : "Debug Failure."
    );

    Error.captureStackTrace(e, stackCrawlMark || fail);

    throw e;
  }

  export function assert(
    expression: unknown,
    message?: string,
    stackCrawlMark?: AnyFunction
  ): asserts expression {
    if (!expression) {
      fail(
        message ? `False expression: ${message}` : "False expression.",
        stackCrawlMark || assert
      );
    }
  }

  export function assertEqual<T>(
    a: T,
    b: T,
    msg?: string,
    msg2?: string,
    stackCrawlMark?: AnyFunction
  ) {
    if (a !== b) {
      const message = msg ? (msg2 ? `${msg} ${msg2}` : msg) : "";
      fail(`Expected ${a} === ${b}. ${message}`, stackCrawlMark || assertEqual);
    }
  }

  export function assertLessThan(
    a: number,
    b: number,
    msg?: string,
    stackCrawlMark?: AnyFunction
  ): void {
    if (a >= b) {
      fail(
        `Expected ${a} < ${b}. ${msg || ""}`,
        stackCrawlMark || assertLessThan
      );
    }
  }

  export function assertLessThanOrEqual(
    a: number,
    b: number,
    stackCrawlMark?: AnyFunction
  ): void {
    if (a > b) {
      fail(`Expected ${a} <= ${b}`, stackCrawlMark || assertLessThanOrEqual);
    }
  }

  export function assertGreaterThanOrEqual(
    a: number,
    b: number,
    stackCrawlMark?: AnyFunction
  ): void {
    if (a < b) {
      fail(`Expected ${a} >= ${b}`, stackCrawlMark || assertGreaterThanOrEqual);
    }
  }

  export function assertIsDefined<T>(
    value: T,
    message?: string,
    stackCrawlMark?: AnyFunction
  ): asserts value is NonNullable<T> {
    if (value === undefined || value === null) {
      fail(message, stackCrawlMark || assertIsDefined);
    }
  }

  export function checkDefined<T>(
    value: T | null | undefined,
    message?: string,
    stackCrawlMark?: AnyFunction
  ): T {
    assertIsDefined(value, message, stackCrawlMark || checkDefined);
    return value;
  }

  export function assertEachIsDefined<T>(
    value: readonly T[],
    message?: string,
    stackCrawlMark?: AnyFunction
  ): asserts value is readonly NonNullable<T>[] {
    for (const v of value) {
      assertIsDefined(v, message, stackCrawlMark || assertEachIsDefined);
    }
  }

  export function assertNever(
    value: never,
    message = "Expected function to never be called",
    stackCrawlMark?: AnyFunction
  ): never {
    return fail(message, stackCrawlMark || assertNever);
  }

  // deprecations

  interface DeprecationOptions {
    message?: string;
    error?: boolean;
    since?: Semver | string;
    warnAfter?: Semver | string;
    errorAfter?: Semver | string;
    name?: string;
  }

  function getFunctionName(func: AnyFunction) {
    if (typeof func !== "function") {
      return "";
    } else if (objectHasProperty(func, "name")) {
      return func.name;
    } else {
      const text = Function.prototype.toString.call(func);
      const match = /^function\s+([\w$]+)\s*\(/.exec(text);
      return match ? match[1]! : "";
    }
  }

  function formatDeprecationMessage(
    name: string,
    error: boolean,
    errorAfter: Semver | undefined,
    since: Semver | undefined,
    message: string | undefined
  ): string {
    const deprecationMessage =
      (error ? "DeprecationError: " : "DeprecationWarning: ") +
      `'${name}' ` +
      (since ? `has been deprecated since v${since}` : "is deprecated") +
      (error
        ? " and can no longer be used."
        : errorAfter
        ? ` and will no longer be usable after v${errorAfter}`
        : ".") +
      (message ?? "");

    return deprecationMessage;
  }

  function createErrorDeprecation(
    name: string,
    errorAfter: Semver | undefined,
    since: Semver | undefined,
    message: string | undefined
  ) {
    const deprecationMessage = formatDeprecationMessage(
      name,
      true,
      errorAfter,
      since,
      message
    );

    return () => {
      throw new TypeError(deprecationMessage);
    };
  }

  function createWarningDeprecation(
    name: string,
    errorAfter: Semver | undefined,
    since: Semver | undefined,
    message: string | undefined
  ) {
    let hasWrittenDeprecation = false;

    return () => {
      if (!hasWrittenDeprecation) {
        log.warn(
          formatDeprecationMessage(name, false, errorAfter, since, message)
        );
        hasWrittenDeprecation = true;
      }
    };
  }

  function createDeprecation(
    name: string,
    options: DeprecationOptions & { error: true }
  ): () => never;
  function createDeprecation(
    name: string,
    options?: DeprecationOptions
  ): () => void;
  function createDeprecation(name: string, options: DeprecationOptions = {}) {
    const errorAfter = getVersionFromOption(options.errorAfter);
    const warnAfter = getVersionFromOption(options.warnAfter);
    const since = getVersionFromOption(options.since) ?? warnAfter;
    const shouldError =
      options.error ||
      (errorAfter &&
        generatorVersion.compareTo(errorAfter) === Comparison.GreaterThan);
    const shouldWarn =
      !warnAfter || generatorVersion.compareTo(warnAfter) >= Comparison.Equal;

    return shouldError
      ? createErrorDeprecation(name, errorAfter, since, options.message)
      : shouldWarn
      ? createWarningDeprecation(name, errorAfter, since, options.message)
      : noopFunction;

    function getVersionFromOption(option: Semver | string | undefined) {
      if (option) {
        return typeof option === "string" ? new Semver(option) : option;
      }
      return undefined;
    }
  }

  function wrapFunction<F extends AnyFunction>(
    deprecation: () => void,
    func: F
  ): F {
    return function (this: unknown) {
      deprecation();
      // @ts-ignore
      return func.apply(this, arguments); // eslint-disable-line prefer-rest-params
    } as F;
  }

  export function deprecate<F extends AnyFunction>(
    func: F,
    options?: DeprecationOptions
  ): F {
    const deprecation = createDeprecation(
      options?.name ?? getFunctionName(func),
      options
    );
    return wrapFunction(deprecation, func);
  }
}

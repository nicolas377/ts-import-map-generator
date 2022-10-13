import { AnyFunction } from "./generalHelpers";

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
}

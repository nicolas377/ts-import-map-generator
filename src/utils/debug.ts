export interface LoggingHost {
  log(level: LogLevel, s: string): void;
}

export const enum LogLevel {
  Verbose,
  Info,
  Warning,
  Error,
  Off,
}

export namespace Debug {
  /* eslint-disable prefer-const */
  export let currentLogLevel = LogLevel.Warning;
  export let loggingHost: LoggingHost | undefined;
  /* eslint-enable prefer-const */

  function logMessage(level: LogLevel, s: string) {
    if (loggingHost && currentLogLevel <= level) {
      loggingHost.log(level, s);
    }
  }

  export namespace log {
    export const error = logMessage.bind(Object.create(null), LogLevel.Error);

    export const warn = logMessage.bind(Object.create(null), LogLevel.Warning);

    export const info = logMessage.bind(Object.create(null), LogLevel.Info);

    export const trace = logMessage.bind(Object.create(null), LogLevel.Verbose);
  }

  // assertions

  export function fail(message?: string): never {
    // This is a great place to put a breakpoint; whenever we fail, we'll stop here.
    const e = new Error(
      message ? `Debug Failure. ${message}` : "Debug Failure.",
    );

    throw e;
  }

  export function assert(
    expression: unknown,
    message?: string,
  ): asserts expression {
    if (!expression) {
      fail(message ? `False expression: ${message}` : "False expression.");
    }
  }

  export function assertEqual<T>(a: T, b: T, msg?: string, msg2?: string) {
    if (a !== b) {
      const message = msg ? (msg2 ? `${msg} ${msg2}` : msg) : "";
      fail(`Expected ${a} === ${b}. ${message}`);
    }
  }

  export function assertLessThan(a: number, b: number, msg?: string): void {
    if (a >= b) {
      fail(`Expected ${a} < ${b}. ${msg || ""}`);
    }
  }

  export function assertGreaterThan(a: number, b: number, msg?: string): void {
    if (a <= b) {
      fail(`Expected ${a} > ${b}. ${msg || ""}`);
    }
  }

  export function assertLessThanOrEqual(a: number, b: number): void {
    if (a > b) {
      fail(`Expected ${a} <= ${b}`);
    }
  }

  export function assertGreaterThanOrEqual(a: number, b: number): void {
    if (a < b) {
      fail(`Expected ${a} >= ${b}`);
    }
  }

  export function assertIsDefined<T>(
    value: T,
    message?: string,
  ): asserts value is NonNullable<T> {
    // intentional use of == to allow for undefined or null
    // eslint-disable-next-line eqeqeq
    if (value == undefined) {
      fail(message);
    }
  }

  export function checkDefined<T>(
    value: T | null | undefined,
    message?: string,
  ): T {
    assertIsDefined(value, message);
    return value;
  }

  export function assertEachIsDefined<T>(
    value: readonly T[],
    message?: string,
  ): asserts value is readonly NonNullable<T>[] {
    for (const v of value) {
      assertIsDefined(v, message);
    }
  }

  export function assertNever(
    value: never,
    message = "Expected function to never be called",
  ): never {
    return fail(message);
  }
}

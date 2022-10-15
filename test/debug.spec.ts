import { getErrorFromThrowingFunction } from "./helpers";
import { Debug, LoggingHost, LogLevel } from "utils/debug";
import { Semver, setGeneratorVersion } from "version";

interface Log {
  level: LogLevel;
  message: string;
}

describe("Debug logging", () => {
  let logs: Log[] = [];
  const logHost: LoggingHost = {
    log: (level, message) => {
      logs.push({ level, message });
    },
  };

  beforeEach(() => {
    Debug.loggingHost = logHost;
  });

  afterEach(() => {
    Debug.currentLogLevel = LogLevel.Warning;
    logs = [];
  });

  test("only logs equal to or above the current log level", () => {
    Debug.currentLogLevel = LogLevel.Info;

    Debug.log.error("error");
    Debug.log.warn("warn");
    Debug.log.info("info");
    Debug.log.trace("trace");

    expect(logs).toEqual([
      { level: LogLevel.Error, message: "error" },
      { level: LogLevel.Warning, message: "warn" },
      { level: LogLevel.Info, message: "info" },
    ]);
  });

  test("log level changes don't affect previous logs", () => {
    Debug.currentLogLevel = LogLevel.Warning;

    Debug.log.error("error");
    Debug.log.warn("warn");
    Debug.log.info("info");
    Debug.log.trace("trace");

    Debug.currentLogLevel = LogLevel.Info;

    Debug.log.error("error");
    Debug.log.warn("warn");
    Debug.log.info("info");
    Debug.log.trace("trace");

    expect(logs).toEqual([
      { level: LogLevel.Error, message: "error" },
      { level: LogLevel.Warning, message: "warn" },
      { level: LogLevel.Error, message: "error" },
      { level: LogLevel.Warning, message: "warn" },
      { level: LogLevel.Info, message: "info" },
    ]);
  });

  test("calls log host for every log that should be logged", () => {
    const logMock = jest.fn();

    Debug.currentLogLevel = LogLevel.Info;
    Debug.loggingHost = { log: logMock };

    Debug.log.error("error");
    Debug.log.warn("warn");
    Debug.log.info("info");
    Debug.log.trace("trace");

    expect(logMock).toHaveBeenCalledTimes(3);
  });
});

describe("Debug assertions", () => {
  test.each(["message", "ensuring that it doesn't throw a constant message"])(
    "fail throws an error with the given message",
    (message) => {
      expect(() => Debug.fail(message)).toThrow(message);
    }
  );

  test("takes a function that originated the error and generates the stack trace off of it", () => {
    // There isn't a great way to test this, since stack traces differ all the time
    // We can at least make sure that the stack trace is different than if no function was provided

    const errorWithNothingProvided = getErrorFromThrowingFunction(() =>
      Debug.fail("message")
    );
    const errorWithFunctionProvided = getErrorFromThrowingFunction(() =>
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      Debug.fail("message", () => {})
    );

    expect(errorWithNothingProvided.stack).not.toEqual(
      errorWithFunctionProvided.stack
    );
  });

  test("assert ensures that the condition is true", () => {
    expect(() => Debug.assert(true)).not.toThrow();
    expect(() => Debug.assert(false)).toThrow();
  });

  const assertEqualTests: [a: unknown, b: unknown][] = [
    [1, 1],
    [1, 2],
    [true, true],
    [true, false],
    [false, false],
    [false, true],
    ["a", "a"],
    ["a", "b"],
    [undefined, undefined],
    [undefined, null],
    [null, null],
    [null, undefined],
    [NaN, NaN],
    [NaN, 0],
    [0, NaN],
    [Infinity, Infinity],
    [Infinity, -Infinity],
    [-Infinity, -Infinity],
    [-Infinity, Infinity],
    [{}, {}],
    [{ a: 1 }, { b: 2 }],
  ];

  test.each(assertEqualTests)(
    "assertEqual ensures the two passed values are equal (using ===) %p === %p",
    (a, b) => {
      // assertEqual uses value checking, not deep equality
      /* eslint-disable jest/no-conditional-expect */
      if (Object.is(a, b)) {
        expect(() => Debug.assertEqual(a, b)).not.toThrow();
      } else {
        expect(() => Debug.assertEqual(a, b)).toThrow();
      }
      /* eslint-enable jest/no-conditional-expect */
    }
  );

  test("assertLessThan ensures the first value is less than the second", () => {
    expect(() => Debug.assertLessThan(1, 2)).not.toThrow();
    expect(() => Debug.assertLessThan(2, 1)).toThrow();
  });

  test("assertLessThanOrEqual ensures the first value is less than or equal to the second", () => {
    expect(() => Debug.assertLessThanOrEqual(1, 2)).not.toThrow();
    expect(() => Debug.assertLessThanOrEqual(2, 1)).toThrow();
    expect(() => Debug.assertLessThanOrEqual(1, 1)).not.toThrow();
  });

  test("assertGreaterThan ensures the first value is greater than the second", () => {
    expect(() => Debug.assertGreaterThan(2, 1)).not.toThrow();
    expect(() => Debug.assertGreaterThan(1, 2)).toThrow();
  });

  test("assertGreaterThanOrEqual ensures the first value is greater than or equal to the second", () => {
    expect(() => Debug.assertGreaterThanOrEqual(2, 1)).not.toThrow();
    expect(() => Debug.assertGreaterThanOrEqual(1, 2)).toThrow();
    expect(() => Debug.assertGreaterThanOrEqual(1, 1)).not.toThrow();
  });

  test("assertIsDefined ensures the value is not undefined", () => {
    expect(() => Debug.assertIsDefined(1)).not.toThrow();
    expect(() => Debug.assertIsDefined(undefined)).toThrow();
  });

  test("checkDefined only returns if the value is defined", () => {
    expect(Debug.checkDefined(1)).toBe(1);
    expect(() => Debug.checkDefined(1)).not.toThrow();
    expect(() => Debug.checkDefined(undefined)).toThrow();
  });

  test("assertEachIsDefined ensures each value of an array is defined", () => {
    expect(() => Debug.assertEachIsDefined([1, 2])).not.toThrow();
    expect(() => Debug.assertEachIsDefined([1, undefined])).toThrow();
  });

  // assertNever is for type-checking logic when CFA narrowing is involved
  test("assertNever throws", () => {
    expect(() => Debug.assertNever("" as never)).toThrow();
  });
});

describe("Debug deprecations", () => {
  let logs: Log[] = [];

  const beforeEachHook = () => {
    Debug.currentLogLevel = LogLevel.Warning;
    Debug.loggingHost = {
      log: (level, message) => {
        logs.push({ level, message });
      },
    };
    logs = [];
    setGeneratorVersion(new Semver("3.2.7"));
  };

  beforeEach(beforeEachHook);

  test("deprecation does nothing by default", () => {
    const deprecatedFunction = Debug.deprecate(() => "function result");

    expect(deprecatedFunction()).toBe("function result");
    expect(deprecatedFunction).not.toThrow();
    expect(logs).toBeEmpty();
  });

  test("warning deprecation still runs the function", () => {
    // ensuring that types don't get messed up by the deprecation function
    const warnDeprecatedFunction: () => string = Debug.deprecate(
      function someDeprecatedFunction() {
        return "function result";
      },
      {
        message: "function is deprecated",
        warnAfter: "2.0.0",
      }
    );

    expect(warnDeprecatedFunction()).toBe("function result");
  });

  test("warning deprecation logs a warning", () => {
    const warnDeprecatedFunction = Debug.deprecate(
      function someDeprecatedFunction() {
        return "function result";
      },
      {
        message: "function is deprecated",
        warnAfter: "2.0.0",
      }
    );

    warnDeprecatedFunction();

    expect(logs).toEqual([
      {
        level: LogLevel.Warning,
        message: expect.stringContaining("function is deprecated"),
      },
    ]);
    expect(logs[0]?.message).toMatchSnapshot();
  });

  const deprecationTests: [
    options: Debug.DeprecationOptions,
    warn: boolean,
    error: boolean
  ][] = [
    [{}, false, false],
    [{ warnAfter: "2.0.0" }, true, false],
    [{ message: "function is deprecated" }, false, false],
  ];

  test.each(deprecationTests)(
    "check errors %o",
    (deprecationOptions, _shouldWarn, shouldError) => {
      const warnDeprecatedFunction = Debug.deprecate(
        function deprecatedFunction() {
          return "function result";
        },
        deprecationOptions
      );

      /* eslint-disable jest/no-conditional-expect */
      if (shouldError) {
        expect(warnDeprecatedFunction).toThrowErrorMatchingSnapshot(
          "error snapshot"
        );
      } else {
        expect(warnDeprecatedFunction).not.toThrow();
      }
    }
  );

  test.each(deprecationTests)(
    "check warnings %o",
    (deprecationOptions, shouldWarn) => {
      const warnDeprecatedFunction = Debug.deprecate(
        function deprecatedFunction() {
          return "function result";
        },
        deprecationOptions
      );

      try {
        warnDeprecatedFunction();
      } catch (e) {
        // ignore
      }

      if (shouldWarn) {
        expect(logs).toEqual([
          {
            level: LogLevel.Warning,
            message: expect.stringContaining("function is deprecated"),
          },
        ]);
        expect(logs[0]?.message).toMatchSnapshot("warning snapshot");
      } else {
        expect(logs).toBeEmpty();
      }
    }
  );
  /* eslint-enable jest/no-conditional-expect */

  test("doesn't error before given version", () => {
    setGeneratorVersion(new Semver("1.0.0"));
    const warnDeprecatedFunction = Debug.deprecate(
      function deprecatedFunction() {
        return "function result";
      },
      {
        errorAfter: "2.0.0",
      }
    );

    // Should also not warn
    expect(logs).toBeEmpty();
    expect(warnDeprecatedFunction).not.toThrow();
  });

  test("errors after given version", () => {
    setGeneratorVersion(new Semver("3.0.0"));
    const warnDeprecatedFunction = Debug.deprecate(
      function deprecatedFunction() {
        return "function result";
      },
      {
        errorAfter: "2.0.0",
      }
    );

    expect(warnDeprecatedFunction).toThrowErrorMatchingSnapshot(
      "error snapshot"
    );
  });

  test("warn + error combo (post-warn)", () => {
    setGeneratorVersion(new Semver("2.1.0"));
    const warnDeprecatedFunction = Debug.deprecate(
      function deprecatedFunction() {
        return "function result";
      },
      {
        warnAfter: "2.0.0",
        errorAfter: "3.0.0",
      }
    );

    warnDeprecatedFunction();

    expect(logs).toEqual([
      {
        level: LogLevel.Warning,
        message: expect.toBeString(),
      },
    ]);
    expect(logs[0]?.message).toMatchSnapshot("warning snapshot");
  });

  test("warn + error combo (post-error)", () => {
    setGeneratorVersion(new Semver("3.1.0"));
    const warnDeprecatedFunction = Debug.deprecate(
      function deprecatedFunction() {
        return "function result";
      },
      {
        warnAfter: "2.0.0",
        errorAfter: "3.0.0",
      }
    );

    expect(warnDeprecatedFunction).toThrowErrorMatchingSnapshot(
      "error snapshot"
    );
  });

  test("warn + error combo (pre-warn)", () => {
    setGeneratorVersion(new Semver("1.0.0"));
    const warnDeprecatedFunction = Debug.deprecate(
      function deprecatedFunction() {
        return "function result";
      },
      {
        warnAfter: "2.0.0",
        errorAfter: "3.0.0",
      }
    );

    expect(warnDeprecatedFunction).not.toThrow();
    expect(logs).toBeEmpty();
  });
});

import { getErrorFromThrowingFunction } from "./helpers";
import { Debug, LoggingHost, LogLevel } from "utils/debug";

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
});

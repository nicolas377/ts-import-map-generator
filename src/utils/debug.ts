type JSONable =
  | string
  | number
  | boolean
  | undefined
  | JSONable[]
  | { [key: string]: JSONable };

interface IDebug {
  logs: Log[];

  error(...message: JSONable[]): void;
  warn(...message: JSONable[]): void;
  info(...message: JSONable[]): void;
  log(...message: JSONable[]): void;
  debug(...message: JSONable[]): void;
  trace(...message: JSONable[]): void;
}

export interface Log {
  dateNow: number;
  level: DebugLevel;
  message: string;
}

const enum DebugLevel {
  Error,
  Warning,
  Info,
  Log,
  Debug,
  Trace,
}

const debugLevelNames: Record<DebugLevel, string> = {
  [DebugLevel.Error]: "ERROR",
  [DebugLevel.Warning]: "WARN",
  [DebugLevel.Info]: "INFO",
  [DebugLevel.Log]: "LOG",
  [DebugLevel.Debug]: "DEBUG",
  [DebugLevel.Trace]: "TRACE",
};

// added by rollup during build
declare const productionBuild: boolean;

export const Debug: IDebug = class Debug {
  public static logs: Log[] = [];

  private static createMessageString(...message: JSONable[]): string {
    const stringifyItem = (item: JSONable): string =>
      item === undefined
        ? "undefined"
        : typeof item === "string"
        ? item
        : typeof item === "number"
        ? item.toString()
        : typeof item === "boolean"
        ? item.toString()
        : Array.isArray(item)
        ? `[${item.map(stringifyItem).join(", ")}]`
        : typeof item === "object"
        ? `{${Object.entries(item)
            .map(([key, value]) => `${key}: ${stringifyItem(value)}`)
            .join(", ")}}`
        : item;

    return message.map(stringifyItem).join(" ");
  }

  private static logMessage(level: DebugLevel, ...message: JSONable[]): void {
    if (productionBuild === false) {
      // We need to stringify the message before we log it, because if we don't, parts of the message could be altered.
      Debug.logs.push({
        dateNow: Date.now(),
        level,
        message: Debug.createMessageString(...message),
      });
    }
  }

  public static error(...message: JSONable[]): void {
    Debug.logMessage(DebugLevel.Error, ...message);
  }

  public static warn(...message: JSONable[]): void {
    Debug.logMessage(DebugLevel.Warning, ...message);
  }

  public static info(...message: JSONable[]): void {
    Debug.logMessage(DebugLevel.Info, ...message);
  }

  public static log(...message: JSONable[]): void {
    Debug.logMessage(DebugLevel.Log, ...message);
  }

  public static debug(...message: JSONable[]): void {
    Debug.logMessage(DebugLevel.Debug, ...message);
  }

  public static trace(...message: JSONable[]): void {
    Debug.logMessage(DebugLevel.Trace, ...message);
  }
};

export function quoteString(string: string): string {
  return `"${string}"`;
}

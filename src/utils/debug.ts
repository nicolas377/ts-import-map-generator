import { productionBuild } from "./generalHelpers";

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

export const enum DebugLevel {
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

class DebugClass implements IDebug {
  public logs: Log[] = [];

  private createMessageString(...message: JSONable[]): string {
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

  private logMessage(level: DebugLevel, ...message: JSONable[]): void {
    if (productionBuild === false) {
      // We need to stringify the message before we log it, because if we don't, parts of the message could be altered.
      this.logs.push({
        dateNow: Date.now(),
        level,
        message: this.createMessageString(...message),
      });
    }
  }

  public error(...message: JSONable[]): void {
    this.logMessage(DebugLevel.Error, ...message);
  }

  public warn(...message: JSONable[]): void {
    this.logMessage(DebugLevel.Warning, ...message);
  }

  public info(...message: JSONable[]): void {
    this.logMessage(DebugLevel.Info, ...message);
  }

  public log(...message: JSONable[]): void {
    this.logMessage(DebugLevel.Log, ...message);
  }

  public debug(...message: JSONable[]): void {
    this.logMessage(DebugLevel.Debug, ...message);
  }

  public trace(...message: JSONable[]): void {
    this.logMessage(DebugLevel.Trace, ...message);
  }
}

export function quoteString(string: string): string {
  return `"${string}"`;
}

export const Debug = new DebugClass();

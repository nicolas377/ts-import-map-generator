import { Debug } from "./debug";
import { ArgumentKind, ArgumentType, idToDataMap } from "cli/options/arguments";

const argumentKindToOptionNameMap = {
  [ArgumentKind.Help]: "printHelpAndExit",
  [ArgumentKind.Version]: "printVersionAndExit",
  [ArgumentKind.Entrypoint]: "entrypointLocation",
  [ArgumentKind.GraphMaxDepth]: "graphMaxDepth",
  [ArgumentKind.IgnoreFiles]: "ignoreFiles",
} as const satisfies Record<ArgumentKind, keyof IOptions>;

export interface IOptionsData {
  printHelpAndExit: boolean;
  printVersionAndExit: boolean;
  entrypointLocation: string;
  graphMaxDepth: number;
  ignoreFiles: string;
}

interface IOptions extends IOptionsData {
  getOption(kind: ArgumentKind): ArgumentType;
  setOption(kind: ArgumentKind, value: ArgumentType): void;
}

export const programOptions = class StaticOptionsClass {
  // Keep in mind that at runtime, these are strings, not numbers.
  // I've kept the type of the array as that of numbers to make it easier to read.
  // TODO: represent the true runtime value at compile-time.
  private static allOptions = Object.keys(
    argumentKindToOptionNameMap,
  ) as unknown as (keyof typeof argumentKindToOptionNameMap)[];

  private static options: Record<ArgumentKind, ArgumentType>;

  public static getOption(kind: ArgumentKind): ArgumentType {
    return StaticOptionsClass.options[kind];
  }

  public static setOption(kind: ArgumentKind, value: ArgumentType): void {
    StaticOptionsClass.options[kind] = value;
  }

  static {
    StaticOptionsClass.options = StaticOptionsClass.allOptions.reduce(
      (acc, kind: ArgumentKind) => {
        const { defaultValue } = idToDataMap.get(+kind) ?? {};

        Debug.assertIsDefined(
          defaultValue,
          `No default value for argument kind ${kind}`,
        );

        acc[kind] = defaultValue;
        return acc;
      },
      {} as Record<ArgumentKind, ArgumentType>,
    );

    for (const kind of StaticOptionsClass.allOptions) {
      const optionData = idToDataMap.get(+kind);

      Debug.assertIsDefined(
        optionData,
        `No option data for argument kind ${kind}`,
      );

      Object.defineProperty(
        StaticOptionsClass,
        argumentKindToOptionNameMap[kind],
        {
          configurable: false,
          enumerable: true,
          get: () => StaticOptionsClass.options[kind],
          set: (value: ArgumentType) => {
            // TODO: when TS supports merging function types, this assertion can be removed.
            (optionData.validator as (value: ArgumentType) => boolean)(value);
            StaticOptionsClass.options[kind] = value;
          },
        },
      );
    }
  }
} as unknown as IOptions;

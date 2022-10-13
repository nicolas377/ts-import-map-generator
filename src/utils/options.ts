import { Debug } from "./debug";
import { keysOfObject } from "./generalHelpers";
import { ArgumentKind, ArgumentType, idToDataMap } from "cli/options/arguments";

const argumentKindToOptionNameMap: Readonly<
  Record<ArgumentKind, keyof IOptions>
> = {
  [ArgumentKind.Help]: "printHelpAndExit",
  [ArgumentKind.Version]: "printVersionAndExit",
  [ArgumentKind.Entrypoint]: "entrypointLocation",
  [ArgumentKind.GraphMaxDepth]: "graphMaxDepth",
  [ArgumentKind.IgnoreFiles]: "ignoreFiles",
};

interface IOptions {
  getOption(kind: ArgumentKind): ArgumentType;
  setOption(kind: ArgumentKind, value: ArgumentType): void;
  printHelpAndExit: boolean;
  printVersionAndExit: boolean;
  entrypointLocation: string;
  graphMaxDepth: number;
  ignoreFiles: string;
}

class OptionsClass {
  private allOptions = keysOfObject(argumentKindToOptionNameMap);

  private options: Record<ArgumentKind, ArgumentType>;

  public getOption(kind: ArgumentKind): ArgumentType {
    return this.options[kind];
  }

  public setOption(kind: ArgumentKind, value: ArgumentType): void {
    this.options[kind] = value;
  }

  constructor() {
    // kind should be one of all of the options, so this validates that at compile-time.
    this.options = this.allOptions.reduce((acc, kind: ArgumentKind) => {
      const { defaultValue } = idToDataMap.get(+kind) ?? {};

      Debug.assertIsDefined(
        defaultValue,
        `No default value for argument kind ${kind}`
      );

      acc[kind] = defaultValue;
      return acc;
    }, {} as Record<ArgumentKind, ArgumentType>);

    for (const kind of this.allOptions) {
      const optionData = idToDataMap.get(+kind);

      Debug.assertIsDefined(
        optionData,
        `No option data for argument kind ${kind}`
      );

      Object.defineProperty(this, argumentKindToOptionNameMap[kind], {
        configurable: false,
        enumerable: true,
        get: () => this.options[kind],
        set: (value: ArgumentType) => {
          // TODO: when TS supports merging function types, this assertion can be removed.
          (optionData.validator as (value: ArgumentType) => boolean)(value);
          this.options[kind] = value;
        },
      });
    }
  }
}

export const programOptions = new OptionsClass() as unknown as IOptions;

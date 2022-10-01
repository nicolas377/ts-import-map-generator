import { ArgumentKind, ArgumentType, idToDataMap } from "options/arguments";

const argumentKindToOptionNameMap: Record<ArgumentKind, keyof IOptions> = {
  [ArgumentKind.Help]: "printHelpAndExit",
  [ArgumentKind.Version]: "printVersionAndExit",
};

interface IOptions {
  setOption(kind: ArgumentKind, value: ArgumentType): void;
  printHelpAndExit: boolean;
  printVersionAndExit: boolean;
}

class OptionsClass {
  private allOptions = [ArgumentKind.Help, ArgumentKind.Version] as const;

  private options: Record<ArgumentKind, ArgumentType>;

  public setOption(kind: ArgumentKind, value: ArgumentType): void {
    (this[
      argumentKindToOptionNameMap[kind] as keyof OptionsClass
    ] as unknown as ArgumentType) = value;
  }

  constructor() {
    // kind should be one of all of the options, so this validates that at compile-time.
    this.options = this.allOptions.reduce((acc, kind: ArgumentKind) => {
      const { defaultValue } = idToDataMap.get(kind) ?? {};

      if (defaultValue === undefined) {
        throw new Error(`No default value for argument kind: ${kind}`);
      }

      acc[kind] = defaultValue;
      return acc;
    }, {} as Record<ArgumentKind, ArgumentType>);

    for (const kind of this.allOptions) {
      const optionData = idToDataMap.get(kind);

      if (optionData === undefined) {
        throw new Error(`No option data for argument kind: ${kind}`);
      }

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

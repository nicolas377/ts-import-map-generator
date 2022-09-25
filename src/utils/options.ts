import { OptionType } from "./types";

interface IOptions {
  printHelpAndExit: boolean;
  printVersionAndExit: boolean;
}

class OptionsClass implements IOptions {
  [OptionType.Help] = false;
  [OptionType.Version] = false;

  set printHelpAndExit(value: boolean) {
    this[OptionType.Help] = value;
  }
  get printHelpAndExit() {
    return this[OptionType.Help];
  }

  set printVersionAndExit(value: boolean) {
    this[OptionType.Version] = value;
  }
  get printVersionAndExit(): boolean {
    return this[OptionType.Version];
  }
}

export const programOptions = new OptionsClass();

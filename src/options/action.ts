import { idToDataMap, nameToIdMap } from "./arguments";
import { NodeFlags, parseSyntaxTreeFromArgsString } from "./parser";

type OptionValue = string | boolean | number;

interface ActionToTake {
  name: string;
  value: OptionValue;
  isDefault: boolean;
}

export function takeActionFromCliArgs(argsString: string): void {
  // This is the real worker of the argument parser.
  // It takes the string of arguments, parses it, and then takes the appropriate action based on the parsed arguments.
  // We want everything to be as modular as possible, so we rely on data provided in arguments.ts to do the argument-specific work.
  // The goal of this function is to set everything in programOptions before starting the actual work.

  const syntaxTreeApi = parseSyntaxTreeFromArgsString(argsString);

  const actionsToTake: ActionToTake[] = [];

  for (const treeArgument of syntaxTreeApi.syntaxTree.arguments) {
    // Try to parse the argument's id from its name. If it can't be parsed, then it's an unknown argument and should be ignored.
    const argumentId = nameToIdMap.get(treeArgument.flag.text);

    if (argumentId === undefined) {
      continue;
    }

    // The argument is known, so we can get its data from the map.
    const optionDetails = idToDataMap.get(argumentId)!;
    const { value: argumentValue } = treeArgument;

    // TODO: pick up here
  }

  console.log(actionsToTake);
}

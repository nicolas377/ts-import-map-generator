import {
  ArgumentKind,
  ArgumentType,
  idToDataMap,
  nameToIdMap,
} from "./arguments";
import { parseSyntaxTreeFromArgsString } from "./parser";
import { Debug, programOptions } from "utils";

interface ActionToTake {
  id: ArgumentKind;
  value: ArgumentType;
}

export function takeActionFromCliArgs(argsString: string): void {
  // This is the real worker of the argument parser.
  // It takes the string of arguments, parses it, and then takes the appropriate action based on the parsed arguments.
  // We want everything to be as modular as possible, so we rely on data provided in arguments.ts to do the argument-specific work.
  // The goal of this function is to set everything in programOptions before starting the actual work.

  const syntaxTreeApi = parseSyntaxTreeFromArgsString(argsString);

  const actionsToTake: ActionToTake[] = [];

  for (const treeArgument of syntaxTreeApi.syntaxTree.arguments) {
    const argumentFlagName = treeArgument.flag.text;
    // Try to parse the argument's id from its name. If it can't be parsed, then it's an unknown argument and should be ignored.
    const [singleOrDoubleDash, argumentId] =
      nameToIdMap.get(argumentFlagName) ?? [];
    const optionDetails = idToDataMap.get(argumentId!);
    const { dash: argumentDash, value: argumentValue } = treeArgument;

    if (
      singleOrDoubleDash === undefined ||
      argumentId === undefined ||
      optionDetails === undefined ||
      // The argument is known, but has the wrong dash.
      (singleOrDoubleDash === "single" && argumentDash.singleDash === false) ||
      (singleOrDoubleDash === "double" && argumentDash.doubleDash === false)
    ) {
      // The argument is unknown, so we should ignore it.
      Debug.log.warn(`Unknown argument: ${argumentFlagName}`);
      continue;
    }

    // If the argument is a boolean argument, then it doesn't have a value.
    // If there's no value, then set the value to the default value.
    // If there is a value, then set the value to the parsed value.
    if (optionDetails.type === "boolean") {
      const value =
        argumentValue === undefined
          ? true
          : optionDetails.dataGetter(argumentValue.text);

      if (value instanceof Error) {
        Debug.log.warn(`Invalid value for argument: ${argumentFlagName}`);
        continue;
      }

      if (optionDetails.validator(value)) {
        if (value !== optionDetails.defaultValue)
          addAction(optionDetails.id, value);
      } else {
        Debug.log.warn(`Invalid value for argument: ${argumentFlagName}`);
      }
    } else {
      if (argumentValue === undefined) {
        Debug.log.warn(`Missing value for argument: ${argumentFlagName}`);
        continue;
      }

      // The argument is known and has a value, so we should parse it and take the appropriate action.
      const value = optionDetails.dataGetter(argumentValue.text);

      if (value instanceof Error) {
        Debug.log.warn(`Invalid value for argument: ${argumentFlagName}`);
        continue;
      }

      if (
        (optionDetails.validator as (value: string | number) => boolean)(
          value
        ) &&
        value !== optionDetails.defaultValue
      ) {
        addAction(optionDetails.id, value);
      } else {
        Debug.log.warn(
          `Invalid value ${argumentValue.text} for argument: ${argumentFlagName}`
        );
      }
    }
  }

  for (const { id, value } of actionsToTake) {
    programOptions.setOption(id, value);
  }

  function addAction(id: ArgumentKind, value: ArgumentType): void {
    actionsToTake.push({
      id,
      value,
    });
  }
}

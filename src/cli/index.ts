import {
  idToDataMap,
  missingArgumentSymbol,
  requiredArgumentIds,
} from "./options/arguments";
import { initializeOptionsFromCliArgs } from "./options/index";
import { Debug, LogLevel, newLineCharacter, programOptions } from "utils";
import { programVersion } from "version";

export function runCli(): void {
  Debug.loggingHost = {
    log(level: LogLevel, s: string) {
      if (level <= LogLevel.Warning) {
        console.log(s);
      }
    },
  };

  initializeOptionsFromCliArgs();

  if (programOptions.printHelpAndExit) {
    printVersion();
    printHelp();
  } else if (programOptions.printVersionAndExit) {
    printVersion();
  } else {
    // Check that all required arguments are present.
    for (const requiredArgumentId of requiredArgumentIds) {
      Debug.assert(
        (programOptions.getOption(requiredArgumentId) as unknown as symbol) !==
          missingArgumentSymbol,
        `Missing required argument: ${
          idToDataMap.get(requiredArgumentId)!.name
        }`
      );
    }
  }
}

function printVersion(): void {
  console.log(`Import Map Generator v${programVersion}`);
}

function printHelp(): void {
  let helpText =
    "Usage: import-map-generator [options]" +
    newLineCharacter +
    newLineCharacter +
    "Options:" +
    newLineCharacter;

  idToDataMap.forEach(
    ({ singleDashNames, doubleDashNames, description, required }) => {
      const singleDashNamesText = singleDashNames.map((name) => `-${name}`);
      const doubleDashNamesText = doubleDashNames.map((name) => `--${name}`);
      const namesText = [...singleDashNamesText, ...doubleDashNamesText].join(
        ", "
      );
      const requiredString = required ? " (required)" : "";

      helpText +=
        `${namesText} - ${description}${requiredString}` + newLineCharacter;
    }
  );

  console.log(helpText);
}

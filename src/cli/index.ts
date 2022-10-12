import {
  idToDataMap,
  missingArgumentSymbol,
  requiredArgumentIds,
} from "./options/arguments";
import { initializeOptionsFromCliArgs } from "./options/index";
import { programOptions } from "utils";
import { programVersion } from "version";

export function runCli(): void {
  initializeOptionsFromCliArgs();

  if (programOptions.printHelpAndExit) {
    printVersion();
    printHelp();
  } else if (programOptions.printVersionAndExit) {
    printVersion();
  } else {
    // Check that all required arguments are present.
    for (const requiredArgumentId of requiredArgumentIds) {
      if (
        (programOptions.getOption(requiredArgumentId) as unknown as symbol) ===
        missingArgumentSymbol
      ) {
        throw new Error(
          `Missing required argument: ${
            idToDataMap.get(requiredArgumentId)!.name
          }`
        );
      }
    }
  }
}

function printVersion(): void {
  console.log(`Import Map Generator v${programVersion}`);
}

function printHelp(): void {
  const newLine = "\n";
  let helpText = `Usage: import-map-generator [options]${newLine}${newLine}Options:${newLine}`;

  idToDataMap.forEach(
    ({ singleDashNames, doubleDashNames, description, required }) => {
      const singleDashNamesText = singleDashNames.map((name) => `-${name}`);
      const doubleDashNamesText = doubleDashNames.map((name) => `--${name}`);
      const namesText = [...singleDashNamesText, ...doubleDashNamesText].join(
        ", "
      );
      const requiredString = required ? " (required)" : "";

      helpText += `${namesText} - ${description}${requiredString}` + newLine;
    }
  );

  console.log(helpText);
}

import { version } from "../../package.json" assert { type: "json" };
import { initializeOptionsFromCliArgs } from "./options";
import {
  idToDataMap,
  missingArgumentSymbol,
  requiredArgumentIds,
} from "./options/arguments";
import { buildImportTree } from "api";
import { Debug, LogLevel } from "utils/debug";
import { programOptions } from "utils/options";

export function verifyAndRunCli(): void {
  Debug.loggingHost = {
    log(level: LogLevel, s: string) {
      if (level >= LogLevel.Warning) {
        console.log(s);
      }
    },
  };

  initializeOptionsFromCliArgs();

  if (programOptions.printHelpAndExit) {
    printVersion();
    printHelp();
    return;
  } else if (programOptions.printVersionAndExit) {
    printVersion();
    return;
  }

  for (const argumentId of requiredArgumentIds) {
    Debug.assert(
      // casting because if this does happen, then getOption will return the symbol
      // in all other cases, this won't trigger and all is well
      (programOptions.getOption(argumentId) as unknown as symbol) !==
        missingArgumentSymbol,
      `Missing required argument: ${idToDataMap.get(argumentId)!.name}`,
    );
  }

  runCliWorker();

  function printVersion(): void {
    console.log(`Import Map Generator v${version}`);
  }

  function printHelp(): void {
    const newLineCharacter = "\n";
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
          ", ",
        );
        const requiredString = required ? " (required)" : "";

        helpText +=
          `${namesText} - ${description}${requiredString}` + newLineCharacter;
      },
    );

    console.log(helpText);
  }
}

// This is the real worker function. When this is called, all options have been initialized, verified, and we're ready to start work.
function runCliWorker(): void {
  const tree = buildImportTree(programOptions.entrypointLocation);
}

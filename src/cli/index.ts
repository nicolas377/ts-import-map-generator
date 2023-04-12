import { version } from "../../package.json" assert { type: "json" };
import { initializeOptionsFromCliArgs } from "./options";
import {
  idToDataMap,
  missingArgumentSymbol,
  requiredArgumentIds,
} from "./options/arguments";
import { Debug } from "utils/debug";
import { programOptions } from "utils/options";

export function runCli(): void {
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
      (programOptions.getOption(argumentId) as unknown as symbol) !==
        missingArgumentSymbol,
      `Missing required argument: ${idToDataMap.get(argumentId)!.name}`
    );
  }

  console.log(programOptions);

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
          ", "
        );
        const requiredString = required ? " (required)" : "";

        helpText +=
          `${namesText} - ${description}${requiredString}` + newLineCharacter;
      }
    );

    console.log(helpText);
  }
}

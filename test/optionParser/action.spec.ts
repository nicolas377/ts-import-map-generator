// Integration tests for the option parser

import { objectWithoutProperties } from "../helpers";
import { takeActionFromCliArgs } from "cli/options/action";
import { programOptions } from "utils/options";

describe("Option parser integration", () => {
  const emptyProgramOptions = { ...programOptions };

  afterEach(() => {
    Object.assign(programOptions, emptyProgramOptions);
  });

  const testCases: [
    commandLineArgv: string,
    optionClassKey: keyof typeof programOptions,
    expectedValue: unknown
  ][] = [
    ["--help", "printHelpAndExit", true],
    ["--version", "printVersionAndExit", true],
    ["--entrypoint=./src/index.ts", "entrypointLocation", "./src/index.ts"],
    ['--entrypoint="./src/index.ts"', "entrypointLocation", "./src/index.ts"],
    ["--graph-max-depth=900", "graphMaxDepth", 900],
    ["--ignore-files=**/*.test.ts", "ignoreFiles", "**/*.test.ts"],
    ['--ignore-files="**/*.test.ts"', "ignoreFiles", "**/*.test.ts"],
  ];

  test.each(testCases)(
    "should parse the %p option correctly",
    (commandLineArgv, optionClassKey, expectedValue) => {
      takeActionFromCliArgs(commandLineArgv);

      expect(programOptions[optionClassKey]).toBe(expectedValue);
    }
  );

  test.each(testCases)(
    "should not touch anything but the %p option",
    (commandLineArgv, optionClassKey) => {
      takeActionFromCliArgs(commandLineArgv);

      expect(objectWithoutProperties(programOptions, [optionClassKey])).toEqual(
        objectWithoutProperties(emptyProgramOptions, [optionClassKey])
      );
    }
  );

  test.each(testCases)("snapshot of the %p option", (commandLineArgv) => {
    takeActionFromCliArgs(commandLineArgv);

    expect(programOptions).toMatchSnapshot();
  });

  test("should not touch anything if no options are passed", () => {
    takeActionFromCliArgs("");

    expect(programOptions).toEqual(emptyProgramOptions);
  });

  test("empty snapshot", () => {
    expect(emptyProgramOptions).toMatchSnapshot();
  });
});

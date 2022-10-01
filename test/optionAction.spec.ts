import { removeDateFromLog } from "./helpers";
import { takeActionFromCliArgs } from "options/action";
import { Debug, programOptions } from "utils";

describe("takeActionFromCliArgs", () => {
  afterEach(() => {
    Debug.logs = [];
  });

  it("should take action based on the arguments", () => {
    const argsString = "--help --version";
    takeActionFromCliArgs(argsString);

    expect(programOptions.printHelpAndExit).toBe(true);
    expect(programOptions.printVersionAndExit).toBe(true);

    expect(Debug.logs.map(removeDateFromLog)).toMatchSnapshot();
  });

  const testStrings = [
    "--help",
    "--version",
    "--help --version",
    "--version --help",
    "-hv",
    "--version=false --help=true",
    "--version=false --help=true --version --help",
  ];

  test.each(testStrings)(
    "should take the same action every time '%s'",
    (argsString) => {
      takeActionFromCliArgs(argsString);

      expect(Debug.logs.map(removeDateFromLog)).toMatchSnapshot("logs");
      expect(programOptions).toMatchSnapshot("programOptions");
    }
  );
});

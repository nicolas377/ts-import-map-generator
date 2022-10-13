import { takeActionFromCliArgs } from "cli/options/action";
import { programOptions } from "utils";

describe("takeActionFromCliArgs", () => {
  it("should take action based on the arguments", () => {
    const argsString = "--help --version";
    takeActionFromCliArgs(argsString);

    expect(programOptions.printHelpAndExit).toBe(true);
    expect(programOptions.printVersionAndExit).toBe(true);
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

      expect(programOptions).toMatchSnapshot("programOptions");
    }
  );
});

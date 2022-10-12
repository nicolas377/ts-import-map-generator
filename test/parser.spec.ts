import { removeDateFromLog } from "./helpers";
import { parseSyntaxTreeFromArgsString } from "cli/options/parser";
import { Debug, DebugLevel } from "utils";

describe("parseSyntaxTreeFromArgsString", () => {
  afterEach(() => {
    Debug.logs = [];
  });

  it("should parse a string of arguments into a syntax tree", () => {
    const argsString = "--help --version";
    const { syntaxTree } = parseSyntaxTreeFromArgsString(argsString);

    expect(syntaxTree.arguments).toHaveLength(2);
    expect(syntaxTree.arguments[0]?.flag.text).toBe("help");
    expect(syntaxTree.arguments[0]?.dash.doubleDash).toBe(true);
    expect(syntaxTree.arguments[1]?.flag.text).toBe("version");
    expect(syntaxTree.arguments[1]?.dash.doubleDash).toBe(true);
  });

  const testCases: string[] = [
    "--help=false",
    "--version",
    "--help --version",
    "-abcdefghijk",
    "-a -b -c -d -e -f -g -h -i -j -k",
    "--some-val=value --name=value --name value --bool-name -b",
  ];

  // expect no warnings or errors for all test cases
  test.each(testCases)("no warnings for %p", (argString) => {
    parseSyntaxTreeFromArgsString(argString);
    expect(
      Debug.logs.filter((log) => log.level <= DebugLevel.Warning)
    ).toHaveLength(0);
  });

  test.each(testCases)("snapshot testing for %s", (argsString) => {
    const { syntaxTree } = parseSyntaxTreeFromArgsString(argsString);

    expect(syntaxTree).toMatchSnapshot();
    expect(Debug.logs.map(removeDateFromLog)).toMatchSnapshot();
  });
});

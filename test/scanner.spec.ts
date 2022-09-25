import { removeDateFromLog } from "./helpers";
import { scanArgs } from "optionsInitializer/scanner";
import { Debug } from "utils";

describe.each([
  "--name=value --name value --bool-name= --bool-name -b --name=",
  "-a -b -c -d -e -f -g -h -i -j",
  "-abc",
])("scanner %p", (argString) => {
  test("Syntax tree snapshot", () => {
    const syntaxTree = [...scanArgs(argString)];

    expect(syntaxTree).toMatchSnapshot();
  });

  test("Log snapshot", () => {
    // just running the generator all the way through
    [...scanArgs(argString)];

    expect(Debug.logs.map(removeDateFromLog)).toMatchSnapshot();
  });
});

import { scanArgs } from "cli/options/scanner";

describe.each([
  "--name=value --name value --bool-name= --bool-name -b --name=",
  "-a -b -c -d -e -f -g -h -i -j",
  "-abc",
])("scanner %p", (argString) => {
  test("Syntax tree snapshot", () => {
    const syntaxTree = [...scanArgs(argString)];

    expect(syntaxTree).toMatchSnapshot();
  });
});

import { argv } from "node:process";
import { parseSyntaxTreeFromArgsString } from "./parser";

export function initializeOptionsFromCliArgs(): void {
  const argsString: string = argv.slice(2).join(" ");
  const testString =
    "--name=value --name value --bool-name= --bool-name -b --name=";

  const syntaxTree = parseSyntaxTreeFromArgsString(testString);
  console.log(syntaxTree);
}

import { argv } from "node:process";
import { parseSyntaxTreeFromArgsString } from "./parser";

export function initializeOptionsFromCliArgs(): void {
  const argsString: string = argv.slice(2).join(" ");
  // TODO: something's wrong when parsing "--bool-name", it's parsed as "--b"
  const testString = "--name=value --name value --bool-name -b";

  const syntaxTree = parseSyntaxTreeFromArgsString(testString);
  console.log(syntaxTree);
}

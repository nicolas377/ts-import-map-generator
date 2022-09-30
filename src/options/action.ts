import { parseSyntaxTreeFromArgsString } from "./parser";

export function takeActionFromCliArgs(argsString: string): void {
  const syntaxTreeApi = parseSyntaxTreeFromArgsString(argsString);

  for (const arg of syntaxTreeApi.syntaxTree.arguments) {
    console.log(arg);
  }
}

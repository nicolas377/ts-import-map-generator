import { argv } from "node:process";
import { takeActionFromCliArgs } from "./action";

export function initializeOptionsFromCliArgs(): void {
  // TODO: just a space is too narrow
  const argsString: string = argv.slice(2).join(" ");

  takeActionFromCliArgs(argsString);
}

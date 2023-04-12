import { argv } from "node:process";
import { takeActionFromCliArgs } from "./action";

export function initializeOptionsFromCliArgs(): void {
  const argsString: string = argv.slice(2).join(" ");

  takeActionFromCliArgs(argsString);
}

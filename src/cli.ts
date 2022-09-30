import { initializeOptionsFromCliArgs } from "options";

export function runCli(): void {
  console.time("arg initialization");
  initializeOptionsFromCliArgs();
  console.timeEnd("arg initialization");
}

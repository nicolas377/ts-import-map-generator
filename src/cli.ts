import { initializeOptionsFromCliArgs } from "optionsInitializer";

export function runCli(): void {
  console.time("arg initialization");
  initializeOptionsFromCliArgs();
  console.timeEnd("arg initialization");
}

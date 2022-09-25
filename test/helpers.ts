import { Log } from "utils";

export function removeDateFromLog(log: Log): Omit<Log, "dateNow"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dateNow, ...rest } = log;
  return rest;
}

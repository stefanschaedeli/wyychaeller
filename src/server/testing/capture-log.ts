import { configureLogging } from "../logging/logger";

/** Collects every activity log line from now on; pair it with `resetLogging()` in `afterEach`. */
export function captureLogLines(level: "debug" | "info" = "info"): string[] {
  const lines: string[] = [];
  const record = (line: string) => void lines.push(line);
  configureLogging({ level, sink: { log: record, warn: record, error: record } });
  return lines;
}

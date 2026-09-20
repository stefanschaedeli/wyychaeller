import { LOG_LEVELS } from "@/domain/constants";
import { readEnvironment, type LogLevel } from "@/server/config/environment";

export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

/** Where finished lines go; the default is the console, which Docker captures. */
export interface LogSink {
  log(line: string): void;
  warn(line: string): void;
  error(line: string): void;
}

interface LoggingConfiguration {
  level?: LogLevel;
  sink?: LogSink;
  now?: () => Date;
}

type WritableLevel = Exclude<LogLevel, "silent">;

const CONSOLE_SINK: LogSink = {
  // The one place that may write to stdout: everything else logs through this module.
  // eslint-disable-next-line no-console
  log: (line) => console.log(line),
  warn: (line) => console.warn(line),
  error: (line) => console.error(line),
};

// Padded so the scope column lines up in the container log.
const LEVEL_LABELS: Record<WritableLevel, string> = {
  debug: "DEBUG",
  info: "INFO ",
  warn: "WARN ",
  error: "ERROR",
};

const PLAIN_VALUE_PATTERN = /^[^\s"=]+$/;

let configuration: LoggingConfiguration = {};
let levelFromEnvironment: LogLevel | null = null;

/** Tests inject a sink, a level or a clock; production never calls this. */
export function configureLogging(next: LoggingConfiguration): void {
  configuration = next;
}

export function resetLogging(): void {
  configuration = {};
  levelFromEnvironment = null;
}

function currentLevel(): LogLevel {
  if (configuration.level !== undefined) return configuration.level;
  levelFromEnvironment ??= readEnvironment().logLevel;
  return levelFromEnvironment;
}

function isEnabled(level: WritableLevel): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(currentLevel());
}

function renderValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(renderValue).join(",");
  if (value instanceof Error) return JSON.stringify(`${value.name}: ${value.message}`);
  const text = typeof value === "string" ? value : String(value);
  // Quoting also escapes line breaks, so foreign text can never fake a log line.
  return PLAIN_VALUE_PATTERN.test(text) ? text : JSON.stringify(text);
}

function renderFields(fields: LogFields): string {
  return Object.entries(fields)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => ` ${key}=${renderValue(value)}`)
    .join("");
}

function renderStacks(fields: LogFields): string {
  return Object.values(fields)
    .filter((value): value is Error => value instanceof Error && value.stack !== undefined)
    .map((error) => `\n${error.stack?.split("\n").slice(1).join("\n") ?? ""}`)
    .join("");
}

function write(level: WritableLevel, scope: string, message: string, fields: LogFields): void {
  if (!isEnabled(level)) return;
  const time = (configuration.now?.() ?? new Date()).toISOString();
  const line = `${time} ${LEVEL_LABELS[level]} [${scope}] ${message}${renderFields(fields)}${renderStacks(fields)}`;
  const sink = configuration.sink ?? CONSOLE_SINK;
  if (level === "error") sink.error(line);
  else if (level === "warn") sink.warn(line);
  else sink.log(line);
}

/** One logger per area ("http", "analysis", "claude", …); the scope shows up in every line. */
export function createLogger(scope: string): Logger {
  return {
    debug: (message, fields = {}) => write("debug", scope, message, fields),
    info: (message, fields = {}) => write("info", scope, message, fields),
    warn: (message, fields = {}) => write("warn", scope, message, fields),
    error: (message, fields = {}) => write("error", scope, message, fields),
  };
}

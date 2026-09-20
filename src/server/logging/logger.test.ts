import { afterEach, describe, expect, it } from "vitest";
import { configureLogging, createLogger, resetLogging, type LogSink } from "./logger";

interface RecordingSink extends LogSink {
  lines: { channel: "log" | "warn" | "error"; line: string }[];
}

function createRecordingSink(): RecordingSink {
  const lines: RecordingSink["lines"] = [];
  return {
    lines,
    log: (line) => lines.push({ channel: "log", line }),
    warn: (line) => lines.push({ channel: "warn", line }),
    error: (line) => lines.push({ channel: "error", line }),
  };
}

const FIXED_TIME = new Date("2026-09-20T12:03:11.482Z");

describe("createLogger", () => {
  afterEach(() => resetLogging());

  it("writes one line with time, level, scope, message and fields", () => {
    const sink = createRecordingSink();
    configureLogging({ level: "info", sink, now: () => FIXED_TIME });

    createLogger("analysis").info("Label read", { wineId: 12, durationMs: 8421 });

    expect(sink.lines).toEqual([
      {
        channel: "log",
        line: "2026-09-20T12:03:11.482Z INFO  [analysis] Label read wineId=12 durationMs=8421",
      },
    ]);
  });

  it("routes warnings and errors to their own channels", () => {
    const sink = createRecordingSink();
    configureLogging({ level: "debug", sink, now: () => FIXED_TIME });
    const logger = createLogger("http");

    logger.debug("d");
    logger.warn("w");
    logger.error("e");

    expect(sink.lines.map((entry) => entry.channel)).toEqual(["log", "warn", "error"]);
    expect(sink.lines[0].line).toContain("DEBUG [http] d");
    expect(sink.lines[1].line).toContain("WARN  [http] w");
    expect(sink.lines[2].line).toContain("ERROR [http] e");
  });

  it("drops lines below the configured level", () => {
    const sink = createRecordingSink();
    configureLogging({ level: "warn", sink });
    const logger = createLogger("http");

    logger.debug("d");
    logger.info("i");
    logger.warn("w");

    expect(sink.lines).toHaveLength(1);
  });

  it("writes nothing when silent", () => {
    const sink = createRecordingSink();
    configureLogging({ level: "silent", sink });

    createLogger("http").error("e");

    expect(sink.lines).toEqual([]);
  });

  it("quotes text with spaces or line breaks so one event stays one line", () => {
    const sink = createRecordingSink();
    configureLogging({ level: "info", sink, now: () => FIXED_TIME });

    createLogger("dish").info("Dish asked", { dish: "Rindsfilet\nINFO fake", plain: "Pinot" });

    expect(sink.lines[0].line).toContain('dish="Rindsfilet\\nINFO fake" plain=Pinot');
    expect(sink.lines[0].line).not.toContain("\n");
  });

  it("skips missing values and renders lists", () => {
    const sink = createRecordingSink();
    configureLogging({ level: "info", sink, now: () => FIXED_TIME });

    createLogger("wine").info("Updated", { vintage: null, notes: undefined, fields: ["a", "b"] });

    expect(sink.lines[0].line).toMatch(/Updated fields=a,b$/);
  });

  it("renders an error with name, message and stack", () => {
    const sink = createRecordingSink();
    configureLogging({ level: "info", sink, now: () => FIXED_TIME });

    createLogger("http").error("Unexpected", { error: new TypeError("boom") });

    const { line } = sink.lines[0];
    expect(line).toContain('error="TypeError: boom"');
    expect(line).toContain("\n    at ");
  });

  it("reads the level from LOG_LEVEL when nothing is configured", () => {
    // vitest.config.mts sets LOG_LEVEL=silent for the whole suite.
    const sink = createRecordingSink();
    configureLogging({ sink });

    createLogger("http").error("e");

    expect(sink.lines).toEqual([]);
  });
});

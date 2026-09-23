import { MAXIMUM_BOTTLE_COUNT } from "@/domain/constants";
import { parseBottleCount } from "./form-values";

const NO_BOTTLES = 0;

/** Keeps a count within the server's allowed range, so the field can never exceed it. */
function clampToMaximum(count: number): number {
  return Math.min(count, MAXIMUM_BOTTLE_COUNT);
}

/**
 * The count a freshly typed text commits, or null when nothing should be committed yet:
 * an empty field (the user is clearing it to retype) or text that is not a usable count.
 */
export function parseCountWhileTyping(text: string): number | null {
  if (text.trim() === "") return null;
  const parsedCount = parseBottleCount(text, NO_BOTTLES);
  return parsedCount === null ? null : clampToMaximum(parsedCount);
}

/** The count a field settles on when it loses focus: empty means none, unusable keeps it. */
export function commitCountText(text: string, committedValue: number): number {
  if (text.trim() === "") return NO_BOTTLES;
  const parsedCount = parseBottleCount(text, NO_BOTTLES);
  return parsedCount === null ? committedValue : clampToMaximum(parsedCount);
}

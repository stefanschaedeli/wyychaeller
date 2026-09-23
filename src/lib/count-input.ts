import { parseBottleCount } from "./form-values";

const NO_BOTTLES = 0;

/**
 * The count a freshly typed text commits, or null when nothing should be committed yet:
 * an empty field (the user is clearing it to retype) or text that is not a usable count.
 */
export function parseCountWhileTyping(text: string): number | null {
  if (text.trim() === "") return null;
  return parseBottleCount(text, NO_BOTTLES);
}

/** The count a field settles on when it loses focus: empty means none, unusable keeps it. */
export function commitCountText(text: string, committedValue: number): number {
  if (text.trim() === "") return NO_BOTTLES;
  return parseBottleCount(text, NO_BOTTLES) ?? committedValue;
}

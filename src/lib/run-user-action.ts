import { toErrorCode } from "./use-api-resource";

export interface RunUserActionHandlers {
  onStart: () => void;
  onSuccess: () => void;
  onError: (errorCode: string) => void;
}

/**
 * Runs a user-triggered API call with a clean start: `onStart` always fires first (so a
 * previous attempt's error is cleared before this one begins), then the action, then either
 * `onSuccess` or `onError` with the failure's error code. Never rethrows.
 */
export async function runUserAction(
  action: () => Promise<unknown>,
  handlers: RunUserActionHandlers,
): Promise<void> {
  handlers.onStart();
  try {
    await action();
    handlers.onSuccess();
  } catch (error) {
    handlers.onError(toErrorCode(error));
  }
}

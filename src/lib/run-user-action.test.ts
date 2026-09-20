import { describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./api-client";
import { runUserAction } from "./run-user-action";

describe("runUserAction", () => {
  it("calls onStart, then the action, then onSuccess, in order", async () => {
    const callOrder: string[] = [];
    const onStart = vi.fn(() => callOrder.push("onStart"));
    const onSuccess = vi.fn(() => callOrder.push("onSuccess"));
    const onError = vi.fn();
    const action = vi.fn(async () => {
      callOrder.push("action");
    });

    await runUserAction(action, { onStart, onSuccess, onError });

    expect(callOrder).toEqual(["onStart", "action", "onSuccess"]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onStart before the action even when the action fails", async () => {
    const callOrder: string[] = [];
    const onStart = vi.fn(() => callOrder.push("onStart"));
    const onSuccess = vi.fn();
    const onError = vi.fn(() => callOrder.push("onError"));
    const action = vi.fn(async () => {
      callOrder.push("action");
      throw new ApiClientError("unavailable", 503);
    });

    await runUserAction(action, { onStart, onSuccess, onError });

    expect(callOrder).toEqual(["onStart", "action", "onError"]);
  });

  it("passes the error code to onError and never calls onSuccess on failure", async () => {
    const onStart = vi.fn();
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const action = vi.fn(async () => {
      throw new ApiClientError("budgetExceeded", 429);
    });

    await runUserAction(action, { onStart, onSuccess, onError });

    expect(onError).toHaveBeenCalledWith("budgetExceeded");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("does not reject when the action fails", async () => {
    const action = async () => {
      throw new Error("unexpected failure");
    };

    await expect(
      runUserAction(action, { onStart: vi.fn(), onSuccess: vi.fn(), onError: vi.fn() }),
    ).resolves.toBeUndefined();
  });
});

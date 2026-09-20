import { describe, expect, it, vi } from "vitest";
import { notifyWineUploaded, subscribeToWineUploaded } from "./wine-upload-events";

describe("wine upload events", () => {
  it("calls subscribers when a wine upload is announced", () => {
    const onUploaded = vi.fn();
    const unsubscribe = subscribeToWineUploaded(onUploaded);

    notifyWineUploaded();

    expect(onUploaded).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("stops calling a subscriber after it unsubscribes", () => {
    const onUploaded = vi.fn();
    const unsubscribe = subscribeToWineUploaded(onUploaded);
    unsubscribe();

    notifyWineUploaded();

    expect(onUploaded).not.toHaveBeenCalled();
  });
});

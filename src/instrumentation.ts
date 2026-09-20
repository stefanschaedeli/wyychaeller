import type { Instrumentation } from "next";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { initializeServer } = await import("./server/startup");
  await initializeServer();
}

/** Page rendering failures never pass through `handleRoute`, so they are logged here. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { createLogger } = await import("./server/logging/logger");
  const [pathWithoutQuery] = request.path.split("?");
  createLogger("http").error("Request failed outside the API routes", {
    method: request.method,
    path: pathWithoutQuery,
    routeType: context.routeType,
    error,
  });
};

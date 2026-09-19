export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { initializeServer } = await import("./server/startup");
  await initializeServer();
}

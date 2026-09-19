import { rm } from "node:fs/promises";

/** Every run starts with an empty cellar. */
export default async function globalSetup(): Promise<void> {
  await rm("./.e2e-data", { recursive: true, force: true });
}

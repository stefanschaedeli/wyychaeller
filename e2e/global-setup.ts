// Every run starts with an empty cellar. The cleanup itself lives in the `webServer.command`
// in playwright.config.ts: Playwright starts globalSetup and webServer concurrently, so a
// cleanup here could race the server's own startup and delete a directory it just created.
export default async function globalSetup(): Promise<void> {}

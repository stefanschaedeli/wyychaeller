/** Tracks fire-and-forget work so tests can wait for it. Tasks must handle their own errors. */
export class BackgroundTasks {
  private readonly runningTasks = new Set<Promise<void>>();

  run(task: Promise<void>): void {
    const trackedTask = task
      .catch((error: unknown) => console.error("Background task failed", error))
      .finally(() => this.runningTasks.delete(trackedTask));
    this.runningTasks.add(trackedTask);
  }

  async waitUntilIdle(): Promise<void> {
    while (this.runningTasks.size > 0) {
      await Promise.all(this.runningTasks);
    }
  }
}

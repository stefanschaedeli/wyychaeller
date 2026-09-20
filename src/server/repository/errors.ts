export class RecordNotFoundError extends Error {
  constructor(recordDescription: string) {
    super(`${recordDescription} was not found`);
    this.name = "RecordNotFoundError";
  }
}

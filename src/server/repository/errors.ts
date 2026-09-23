export class RecordNotFoundError extends Error {
  constructor(recordDescription: string) {
    super(`${recordDescription} was not found`);
    this.name = "RecordNotFoundError";
  }
}

export class InvalidPlacementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPlacementError";
  }
}

export class PlacementChoiceRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlacementChoiceRequiredError";
  }
}

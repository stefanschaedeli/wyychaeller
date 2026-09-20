/** Builds a JSON POST/PATCH request for calling route handlers directly in tests. */
export function jsonRequest(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Builds a plain GET request for route handlers that only need the URL. */
export function getRequest(path: string): Request {
  return new Request(`http://localhost${path}`);
}

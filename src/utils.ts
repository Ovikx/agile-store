export function convertDOMException(err: DOMException | null): Error {
  if (!err) return new Error("Null error; no error output available");
  return new Error(`[${err.name}] ${err.message}`);
}

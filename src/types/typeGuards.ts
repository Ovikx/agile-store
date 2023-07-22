// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isKeyRange(obj: any): obj is IDBKeyRange {
  return (obj as IDBKeyRange).lower !== undefined;
}

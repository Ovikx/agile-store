export interface StoreConfig<T> {
  readonly name: string;
  readonly keyPath: keyof T & string;
  readonly autoIncrement?: boolean;
  readonly indices: (keyof T & string)[];
}

export type SearchQualifier<T> = (record: T) => boolean;

export interface SearchRange<T, K extends keyof T = keyof T> {
  lower: T[K];
  upper: T[K];
  lowerOpen: boolean;
  upperOpen: boolean;
  only: T[K];
}

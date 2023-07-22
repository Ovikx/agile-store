export interface StoreConfig<T> {
  readonly name: string;
  readonly keyPath: keyof T & string;
  readonly autoIncrement?: boolean;
  readonly indices: (keyof T & string)[];
}

export type SearchQualifier<T> = (record: T) => boolean;

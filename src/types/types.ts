export interface StoreConfig<T> {
  name: string;
  keyPath?: keyof T & string;
  autoIncrement?: boolean;
  indices?: (keyof T)[];
}

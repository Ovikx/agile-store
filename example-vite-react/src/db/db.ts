import { Store } from "agile-store";
import { Item } from "../types/types";
export const itemsStore = new Store<Item>({
  name: "items",
  keyPath: "name",
  autoIncrement: false,
  indices: [],
});

export const dbConfig = {
  dbName: "test-db",
  version: 2,
};

import { Store } from "agile-store";
import { Item } from "../types/types";
export const itemsStore = new Store<Item>({
  name: "items",
  keyPath: "name",
  autoIncrement: false,
  indices: [],
});

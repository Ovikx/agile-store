import { Store } from "../core/Store";
import { Person } from "./types";

export const peopleStore = new Store<Person>({
  name: "people",
  keyPath: "name",
  indices: ["registrationDate"],
});

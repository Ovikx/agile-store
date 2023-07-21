import "fake-indexeddb/auto";
import { Store, createStores } from "../core/Store";
import { Person } from "./types";

const store = new Store<Person>({
  name: "people",
  keyPath: "name",
  indices: ["registrationDate"],
});

beforeAll(() => {
  return new Promise<void>((resolve, reject) => {
    createStores("test", 1, [store])
      .then(() => resolve())
      .catch(() => reject());
  });
});

describe("test", () => {
  test("test", () => {
    expect(store._cfg.name).toBe("people");
  });
});

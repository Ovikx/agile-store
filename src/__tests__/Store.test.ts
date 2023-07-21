import "fake-indexeddb/auto";
import { createStores } from "../core/Store";
import { peopleStore } from "./stores";
import { populate } from "./populator";

beforeAll(() => {
  return new Promise<void>((resolve, reject) => {
    createStores("test", 1, [peopleStore])
      .then(() => populate(peopleStore, 1000).then(() => resolve()))
      .catch(() => reject());
  });
});

describe("test", () => {
  test("test", () => {
    expect(peopleStore._cfg.name).toBe("people");
  });
});

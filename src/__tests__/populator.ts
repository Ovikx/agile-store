import { Store } from "../core/Store";
import { Person } from "./types";
import { faker } from "@faker-js/faker";

faker.seed(1);

/**
 * Populates the store with fake data
 * @param store Store to populate
 */
export async function populate(
  store: Store<Person>,
  numRecords: number,
): Promise<void> {
  for (let i = 0; i < numRecords; i++) {
    store
      .add({
        name: faker.person.fullName(),
        age: faker.number.int({
          min: 13,
          max: 60,
        }),
        registrationDate: faker.date.recent().getMilliseconds(),
        verified: faker.datatype.boolean(),
      })
      .catch(() => {}); // Ignore failed inserts
  }
}

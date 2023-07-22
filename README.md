# agile-store

The goal of this library is to provide developers with a more direct way of interfacing with their stores with type-safety in mind. It keeps transaction handling implicit for simple operations, keeping the headache away for trivial tasks.

## Installation

```sh
npm install agile-store@latest
```

## Basic usage

### Initializing the database and stores

The library provides the method `createStores` to activate all of your stores all at once.

#### Initializing a store

Each store follows one schema that's defined via an interface. Note that only calling the constructor doesn't make the store ready to use yet.

<blockquote>

#### **`db.ts`**

```ts
import { Store } from "agile-store";

interface Item {
  name: string;
  price: number;
  onSale: boolean;
}

export const itemsStore = new Store<Item>({
  name: "items",
  keyPath: "name",
  autoIncrement: false,
  indices: ["price"],
});
```

</blockquote>

#### Opening the store

`createStores` asynchronously creates the database and opens the provided stores. After that, you can use the methods provided in the stores you made earlier. You may want to perform any main rendering logic _after_ `createStores` executes (usually through `.then()`).

<blockquote>

#### **`main.ts`**

```ts
import { createStores } from "agile-store";
import { itemsStore } from "./db";

createStores("test-db", 1, [itemsStore]);
```

</blockquote>

### CRUD operation docs coming soon

## License

[MIT](https://en.wikipedia.org/wiki/MIT_License)

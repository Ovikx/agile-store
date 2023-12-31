import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { dbConfig, itemsStore } from "./db/db";
import { useStore } from "../../src/core/Store";

function App() {
  const [count, setCount] = useState(0);

  useStore(itemsStore, dbConfig)
    .then((store) => {
      store
        .add({
          name: "HEHHHLOO WORLD!!!!",
          price: 1000,
          onSale: true,
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  useStore(itemsStore, dbConfig)
    .then((store) => {
      store
        .getOneByKey("HEHHHLOO WORLD!!!!")
        .then((res) =>
          console.log(res ? JSON.stringify(res) : "could not find"),
        )
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;

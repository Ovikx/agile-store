import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { itemsStore } from "./db/db";

function App() {
  const [count, setCount] = useState(0);

  itemsStore
    .add({
      name: "HEHHHLOO WORLD!!!!",
      price: 1000,
      onSale: true,
    })
    .catch((err) => console.log(err));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  void itemsStore
    .getByKey("HEHHHLOO WORLD!!!!")
    .then((res) => console.log(res ? JSON.stringify(res) : "could not find"));

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

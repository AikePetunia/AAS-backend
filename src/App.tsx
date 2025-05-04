import { useState } from "react";
import "./assets/css/App.css";
import { Products } from "./components/Products";
import { Header } from "./components/navBar/Header";

function App() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <>
      <Header onSearch={setSearchTerm} />
      <Products searchTerm={searchTerm} />
    </>
  );
}

export default App;
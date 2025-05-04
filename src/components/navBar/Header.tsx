import { useState } from "react";
import { Sidebar } from "./Sidebar";
import "../../assets/css/header.css";

interface NavBarProps {
  onSearch: (searchTerm: string) => void;
}

export function Header({ onSearch }: NavBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSideBarOn, setIsSideBarOn] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  function sideBarToggle() {
    setIsSideBarOn(!isSideBarOn);
  }

  return (
    <>
      <nav>
        <div className="nav-container">
          <button onClick={sideBarToggle} className="sideBar-activer">
            <i className="fa-solid fa-bars"></i>
          </button>
          <div className="search-container">
            <input
              type="text"
              placeholder="Aike comprar..."
              value={searchTerm}
              onChange={handleSearch}
            />
            <button>
              <i className="fa-solid fa-search"></i>
            </button>
          </div>

          <h1>
            Aike
            <img
              className="nav-icon"
              src="https://cdn5.dibujos.net/dibujos/pintados/201553/ordenador-de-sobremesa-la-casa-la-habitacion-10339873.jpg"
              alt="Computer icon"
            />
          </h1>
        </div>
      </nav>
      <Sidebar isActive={isSideBarOn} />
    </>
  );
}

// navbar -> Gráficas -> (Nuevas, usadas -> (Nvidia, amd, intel))
// navbar -> Armar -> (PC, Setup, etc)

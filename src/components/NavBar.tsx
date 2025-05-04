import { useState } from 'react'
import "../assets/css/navBar.css"

interface NavBarProps {
  onSearch: (searchTerm: string) => void;
}

export function NavBar({ onSearch }: NavBarProps) {
    const [searchTerm, setSearchTerm] = useState('')

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearchTerm(value)
        onSearch(value)
    }

    return (
        <nav>
            <div className="nav-container">
                <h1>
                    Aike
                    <img className="nav-icon" src="https://cdn5.dibujos.net/dibujos/pintados/201553/ordenador-de-sobremesa-la-casa-la-habitacion-10339873.jpg" alt="Computer icon" />
                </h1>

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
                
                <div className="nav-links">
                    <a href="https://github.com/AikePetunia/AikeArmarUnSetup" target="_blank" className="github-project">
                        <i className="fa-brands fa-github"></i>
                    </a>
                    <a href="https://venuss.me" target="_blank" className="me">
                        <i className="fa-solid fa-seedling"></i>
                    </a>
                </div>
            </div>
        </nav>
    )
}

// navbar -> Gráficas -> (Nuevas, usadas -> (Nvidia, amd, intel))
// navbar -> Armar -> (PC, Setup, etc)
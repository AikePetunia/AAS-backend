import React from "react";
import { PcComponents } from "./sideBarComponents/PcComponents";
import { SetupDecoration } from "./sideBarComponents/SetupDecoration";
import "../../assets/css/sidebar.css";

export function Sidebar({ isActive }) {
  return (
    <>
      <div className={`sideBar-toggler ${isActive ? "active" : ""}`}>
        <div className="sideBar-links">
          <i class="fa-solid fa-computer"></i>
          <h6>Componentes de PC</h6>
          <PcComponents />
          <i className="fa-solid fa-desktop">
            <h6>Componentes de PC</h6>
            <SetupDecoration />
          </i>
          <a
            href="https://github.com/AikePetunia/AikeArmarUnSetup"
            target="_blank"
            className="github-project"
          >
            <h6>Código fuente.</h6>
            <i className="fa-brands fa-github"></i>
          </a>
          <a href="https://venuss.me" target="_blank" className="me">
            <i className="fa-solid fa-seedling"></i>
            <h6>Hecho por Venuss.</h6>
          </a>
        </div>
      </div>
    </>
  );
}

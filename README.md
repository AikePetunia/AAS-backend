# Aike armar un setup.

> This project is part of my personal learning journey. I'm not an expert developer, sorry for bad code and those things.

> ⚠️ This tool scrapes public product listings. It does not access private data or databases.

> ⚠️ This page part from the idea of [HardGamers](https://www.hardgamers.com.ar/), but with more features and with a more setup/workstation vision, not only a gaming PC. It's not my intention to compite.

A web scraping project focused on finding the best prices across Argentinian tech stores. The goal is to automate the process of watching productos one by one.

I'll try my best to not put ads on the page, or sponsored brands and be transparent with the costs.

## Tech Stack used so far

- Figma (?)
- Css
- React + Typescript
- Node + playwright
- Python + scikit-learn

## General Roadmap (2025)

- [x] Very basic front-end to show products
- [x] Get paths and classes from pages with playwright to get datasets to train AI
- [x] Train AI to predict valid paths, classes from pages to automate scrappig new pages.
- [ ] Learn figma, do the UI/UX
- [ ] Create a basic, styled and functional front-end, that only show products by category and Deploy a very first version.

## 💡 Future Features

- [ ] Countdown for sales (hot sale, prime day, black friday)
- [ ] Services near you (Pc builders, windows optimization, software recommendations)
- [ ] A reputation system for companies, based on google reviews or a system like reddit (Basic, no account required).
- [ ] 3D interactive object on playcanvas.
- [ ] Account creation, save products, build setups/pcs, etc. With pages recommendations to see the final build on your setup.

## Things learnt so far in the project

- Scikit-learn, LMM, and re-learned python
-

## ✨ Creator

Made by [Venuss](https://venuss.me) 🇦🇷

npm init playwright@latest

todo:

- [x] re format files and names
- [] centralize in one file the running of all the files required for the final response
- [] make a final file with the errors, todo, thiungs to improve, how to handle non paths, non classes, etc

  https://miro.com/app/board/uXjVGGZlam0=/?share_link_id=870584074040


IDEA DE BRANCH:

Simplemente extraer la pagina entera, y a traves de los modelos entrenados que detectan que es un producto y sus partes, clasifique bien.

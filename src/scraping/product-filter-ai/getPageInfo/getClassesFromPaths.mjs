import { chromium } from "playwright";
import fs from "fs/promises";

const sites = [
	//"https://www.armytech.com.ar/405-hardware",
	//"https://www.venex.com.ar/componentes-de-pc",
	"https://cellplay.com.ar/perifericos-gamer/teclados",
	"https://epocasvideogames.com.ar/consolas",
	"https://gztienda.com.ar/notebooks",
	"https://compragamer.com/productos?cate=58",
	"https://www.ngtechnologies.com.ar/search/?q=*",
	"https://mgmgamers.store/search/?q=*",
	"https://www.slot-one.com.ar/search/?q=*",
	"https://www.710tech.com.ar/almacenamiento/",
	"https://www.37bytes.com.ar/productos/",
	"https://www.gamerspoint.com.ar/categoria/componentes-de-pc/",
	"https://www.gamingcity.com.ar/placa-de-video",
	"https://www.gezatek.com.ar/tienda/mouse/",
	"https://goldentechstore.com.ar/almacenamiento/",
];

async function getClassesFromPaths() {
  for  (let i = 0; sites.length; i++) {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(sites[i]);
    const classes = await page.evaluate(() => {
      const classes = new Set();
      const elements = document.querySelectorAll("*:not(body):not(header):not(html)");

      elements.forEach((element) => {
        classes.add(element.className);
      });
      return Array.from(classes);
    });
    const pageName = new URL(sites[i]).hostname.replace('www.', '').split('.')[0];
    await fs.writeFile(`classes_${pageName}.json`, JSON.stringify(classes, null, 2));
    await browser.close
  }
}

getClassesFromPaths();
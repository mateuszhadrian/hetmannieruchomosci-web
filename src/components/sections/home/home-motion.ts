// Ruch strony głównej — wejście chunku ładowanego DYNAMICZNIE z index.astro
// wyłącznie przy prefers-reduced-motion: no-preference (bramka
// html.js-motion nadawana inline przed malowaniem). Bez tego modułu
// strona jest w pełni statyczna i kompletna: hero pokazuje zdjęcie,
// sekcje są widoczne od razu, zdjęcia stoją w kadrach.
import { initContentMotion } from "../content-motion";
import { initHomeHero } from "./home-hero";

initContentMotion();
initHomeHero();

export {};

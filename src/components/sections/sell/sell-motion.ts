// Ruch /sprzedaj-z-nami/ — wejście chunku ładowanego DYNAMICZNIE ze strony
// wyłącznie przy prefers-reduced-motion: no-preference (bramka
// html.js-motion: MotionGate.astro). Bez tego modułu strona jest w pełni
// statyczna i kompletna: kroki i formularz widoczne od razu, zdjęcie hero
// stoi w kadrze. Reveale i parallax hero daje wspólny content-motion.ts.
import { initContentMotion } from "../content-motion";

initContentMotion();

export {};

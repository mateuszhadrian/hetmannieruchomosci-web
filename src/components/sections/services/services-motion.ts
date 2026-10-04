// Ruch /uslugi/ — wejście chunku ładowanego DYNAMICZNIE ze strony wyłącznie
// przy prefers-reduced-motion: no-preference (bramka html.js-motion:
// MotionGate.astro). Bez tego modułu strona jest w pełni statyczna
// i kompletna. Reveale sekcji i parallax zdjęć daje wspólny
// content-motion.ts.
import { initContentMotion } from "../content-motion";

initContentMotion();

export {};

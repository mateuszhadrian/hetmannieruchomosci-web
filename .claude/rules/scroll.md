---
paths:
  - "src/scripts/overlay.ts"
  - "src/layouts/BaseLayout.astro"
  - "tests/helpers/scroll.ts"
---

# Scroll — reguły

**Scroll w serwisie jest NATYWNY, wszędzie i na każdym urządzeniu** —
także scroll dokumentu jako trigger animacji. Żadna biblioteka nie
pośredniczy w kółku ani w dotyku; strażnik e2e „scroll jest natywny" wraca
ze specami widoków (Etapy 3–4).

## Dlaczego bez wygładzacza scrolla (lekcja szablonu projektu)

Reguła odziedziczona z poprzednich wdrożeń wraz z pomiarem — obowiązuje
tu od pierwszego dnia:

- Objaw: na stronie głównej w Safari na macOS scroll klatkował,
  **wyłącznie dopóki widać było pierwszy ekran**.
- Sesja pomiarowa (15 wariantów na fizycznym MacBooku) ustaliła: koszt to
  **duże zdjęcie przycinane maską** w typografii hero. Osobno maska
  i zdjęcie są tanie, razem są drogie do PRZEMALOWANIA — a przemalowanie
  zdarzało się przy każdej zmianie pozycji scrolla, bo biblioteka pchała
  scroll JS-em klatka po klatce. Przy scrollu natywnym robi to kompozytor
  i koszt znika.
- Wniosek nadrzędny: koszt nie był w bibliotece, tylko w spotkaniu
  JS-owego scrolla z drogą do przemalowania warstwą. **Wróci
  wygładzacz — wróci klatkowanie.**

## Konsekwencje w kodzie

- `BaseLayout` nie ma propa `smoothScroll` ani atrybutu
  `data-smooth-scroll` — nie ma czego przełączać.
- Kontrakt karuzel i galerii to **`scroll-snap-stop: always`** (bez tego
  szybki swipe przeskakuje kilka pozycji naraz).
- `overlay.ts` blokuje scroll `body { position: fixed }` + zapamiętana
  pozycja, a odblokowuje natywnym `window.scrollTo`. Ta ścieżka jest
  jedyna — nie ma gałęzi alternatywnej. Własnej blokady scrolla z eksportu
  designu (`html.mnav-lock`) NIE portujemy.
- Dekoracje zależne od scrolla (przemalowanie paska nad hero strony
  głównej, parallax zdjęć) wygładzaj WYŁĄCZNIE własną pętlą rAF na samej
  dekoracji: Safari dostarcza zdarzenia `scroll` rzadziej, niż przewija
  (async scrolling). Elementy przypięte (pasek dolny detalu oferty, panel
  boczny) czytają prawdziwą pozycję scrolla i muszą trzymać się jej co do
  piksela.

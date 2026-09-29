---
paths:
  - "scripts/sync/**"
  - "src/lib/offers/**"
  - "data/**"
  - "tests/fixtures/offers/**"
  - ".github/workflows/sync.yml"
---

# Dane ofert i sync — reguły

Oferty pochodzą z systemu CRM klientki. Nocny sync pobiera je, przepuszcza
przez allow-listę, normalizuje do schematu `Offer`, kopiuje zdjęcia do
zasobnika mediów i zapisuje `data/*.json`; build czyta wyłącznie te pliki.
Szczegóły (katalog pól, schemat, reguły statusu, kolejność kroków):
`docs/kb/` part3 i `docs/plan/` Etap 2 — dokumenty lokalne, poza repo.

STAN po Etapie 0: kod syncu NIE istnieje (`pnpm sync`, `sync:dry`,
`fixtures:build` to zaślepki), katalogu `data/` nie ma.

## Zasady twarde

- **CRM jest jedynym źródłem prawdy o ofertach.** Treści ofert nie
  redagujemy: dopuszczalna jest sanityzacja HTML i decyzje o prezentacji.
  Status oferty ustawia człowiek — nigdy nie wnioskuj go z tego, że
  oferta zniknęła z danych.
- **Allow-lista, nie blacklista.** Do `data/offers.json` trafiają
  WYŁĄCZNIE pola z `PUBLIC_FIELDS`; wszystko inne sync odrzuca. Nowe pole
  w źródle nie pojawia się na stronie, dopóki ktoś świadomie nie dopisze
  go do listy.
- **`FORBIDDEN_FIELDS` to kontrakt testowy.** Żadna nazwa z tej listy nie
  może wystąpić jako klucz w danych publicznych (skan głęboki, na `data/`
  i na fixture). Wartości tych pól nie wolno wpisywać NIGDZIE: w kodzie,
  testach, fixture, logach, dokumentach, komunikatach commitów
  i odpowiedziach w sesji.
- **Surowa odpowiedź API żyje wyłącznie w pamięci procesu syncu** — nigdy
  na dysku runnera, w artefakcie, w logu ani w repo.
- **Dane pisze wyłącznie skrypt:** pliki w `data/` zapisuje bot syncu,
  katalog `tests/fixtures/offers/` buduje `pnpm fixtures:build`. Żadnych
  ręcznych edycji (blokada w `.claude/settings.json` i hook
  `guard-data.sh`). Dwa wyjątki: `tests/fixtures/offers/selection.json`
  (lista numerów ofert i nadpisań — pisany ręcznie, to WEJŚCIE skryptu)
  oraz `data/legacy-redirects.json` (buduje go skrypt uruchamiany przez
  Mateusza, w osobnym PR).
- **API: wyłącznie `GET`, wyłącznie przez `scripts/sync`.** Adres
  zapytania niesie token — nigdy nie loguj URL-a ani obiektu błędu, który
  go zawiera. Claude nie wywołuje API: pracuje w trybie `--source=file` na
  danych syntetycznych; przebiegi z API uruchamia Mateusz.
- **Logi GitHub Actions są PUBLICZNE** (repo publiczne). Do logu idą
  wyłącznie kody ostrzeżeń i liczności. Numery ofert niewidocznych na
  stronie, ich statusy i pola kontrolne — tylko w raporcie mailowym.
- Nie czytaj `.env*`, `~/.config/hetman/` ani `**/devtools/api/**`.

## Odporność

- **Zero ofert to stan dopuszczalny dla BUILDA** (brak `data/` = pusta
  lista, strona się buduje), ale **niedopuszczalny dla SYNCU**: zero
  ofert albo spadek o ponad połowę przerywa sync bez zapisu (bezpiecznik;
  obejście tylko świadomym `force`).
- Oferty w testach czyta się wyłącznie przez `tests/helpers/offers.ts`;
  test zależny od składu ofert robi `test.skip` z jawnym powodem.
- Bramka syncu (testy + build + skan `dist`) stoi w `sync.yml` PRZED
  commitem — commit bota omija PR i required checks.
- Zmiana schematu `Offer` albo allow-listy = jeden PR obejmujący listę
  pól, schemat, normalizację, testy kontraktu i przebudowany fixture;
  schemat czyta stary kształt do czasu pierwszego syncu (nowe pola jako
  opcjonalne).
- Wartość `0` jest daną, nie brakiem (piętro 0 = parter) — nie testuj pól
  liczbowych przez `falsy`.

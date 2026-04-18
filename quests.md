# Plan Implementacji Zadań (Quests) dla Modułu Roadmapy

Poniżej znajdują się 3 najważniejsze podpunkty planu implementacji systemu zadań (quests) w widoku Roadmapy z uwzględnieniem dynamicznego i narastającego doczytywania grafu.

## 1. Interakcja z Tematem (Węzłem) i Weryfikacja Wiedzy

Gdy użytkownik kliknie na dany węzeł (temat) na mapie, powinien otworzyć się specjalny modal lub panel boczny ("Quest Hub"). 

**Co powinno się tam znaleźć:**
- **Pigułka Wiedzy:** Krótki przegląd merytoryczny wygenerowany wcześniej przez LLM do zaznajomienia się z problemem przed startem zadań.
- **Zadania w hexie (Dokładnie 2 zadania):** Pojedynczy hex nie będzie przeładowany zadaniami – zaoferuje po prostu 2 wyzwania o z góry narzuconej tematyce oraz konkretnym stopniu trudności zgodnym z miejscem na grafie. Pomoże to szybko "skonsumować" kafelkę.
- **Weryfikacja wiedzy:**
  - *Zadanie 1 (np. Teoria/Zamknięte):* Sprawdzone szybkim walidatorem po stronie klienta/backendu bez zużycia tokenów LLM. Automatyczna odpowiedź co poszło nie tak.
  - *Zadanie 2 (np. Praktyka/Otwarte):* Ocena semantyczna "Sędziego AI", weryfikująca kod użykownika ułożony w edytorze lub krótką odpowiedź tekstową opisującą podejście logiczne (np. Zaliczone/Niezaliczone z 1 zdaniem feedbacku).

## 2. Globalna Progresja Tematyczna (Dynamiczny Graf 10 Poziomów)

Ten podpunkt dotyczy samego systemu pączkowania i wypełniania grafu, dającego wrażenie wciągającej "Drabiny Umiejętności", w której poziom trudności nieustannie rośnie w miarę odkrywania mapy.

**Implementacja Drzewa Tematów:**
- **Start (Generowanie wstępne - Poziom 1/10):** Na samym początku pytamy LLM o **10 początkowych tematów/węzłów** bliskich wybranej przez usera specjalizacji/ścieżce, zaznaczając jasno do LLM'a stopień trudności `Level 1/10`. W tych wynikach przyjdzie sam zarys hexów oraz prawdopodobnie ich 2 zadanka.
- **Uzupełnianie Hexów i Stos (`topicStack`):** System zapełnia pola startowe na grafie i zapamiętuje nieużyte jeszcze przez ucznia wygenerowane komórki w parametrze `topicStack`.
- **Wyzwalacz (Trigger) "Przejście wyżej":** W mechanizmie przypisywania tematów do grafu, nasłuchujemy na stan stosu. Jeśli ilość tematów na `topicStack` w obiekcie spadnie poniżej **6**, generowany jest backendowy wniosek: "Wygeneruj w tle 10 kolejnych tematów z obszaru X, tym razem podnosząc stopień od razu o 1 wyżej: `Level 2/10`".
- I tak proces postępuje automatycznie, aż do odblokowywania potężnych zagadnień klasy 10/10 na obrzeżach grafu.

## 3. Przemyślenia Architektoniczne, UX i Główne Wyzwania

Dzięki temu genialnemu systemowi "Prefetchingu" opartemu na limicie wielkości stosu możemy zarazem zaoszczędzić i usprawnić działanie grafu.

- **Bezbłędny "Prefetching" (Ukryty UX delay):** Mechanizm pobierania pakiety kolejnych 10 sztuk tematów wyższego rzędu (kiedy zejdziemy na stosie poniżej 6) jest ujęciem "Lazy Loadingu". Użytkownik klikając drugie zadanie na jednym z 6 hexów nawet nie poczuje, że system w ciągu 2-3s przemielił i przygotował zaplecze pod nowy szczebel wyzwań.
- **Odpowiedzialność JSON i formatowanie w jednym strzale:** Żeby prefetching działał bezkolizyjnie i był "tani" dla API, nasza prośba o "10 tematów" musi w odpowiedzi zwaracając JSON-a oddawać od razu wygenerowane po 2 "Zadania/Pytania" dla każdego hexa. Aby nie trzeba było pytać o zadanie wtórnie przy kliknięciu modal'a. Oznacza to spory JSON - wymagany tu jest Structured Output (np. Function Calling API).
- **Zarządzanie Poziomem (Śledzenie GlobalDifficultyLevel):** Frontendowa logika `saveCurrentState` w pliku `roadmap-component.ts` (oraz powiązany Storage do DB) będzie musiała na stałe zapisać stan aktualnego *Globalnego Poziomu Trudności* (zaczynając od `1`). Zwiększenie np. zmiennej `this.currentLevel` ma nastąpić po wydaniu triggera API dobierającego nowe elementy.

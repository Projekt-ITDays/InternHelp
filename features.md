# 5 Propozycji Ulepszeń Funkcjonalności (UX / UI)

Na podstawie przeglądu obecnych komponentów (Dashboard, Roadmapa, Ankieta), poniżej znajduje się lista 5 konkretnych usprawnień, które bezpośrednio przełożą się na jakość korzystania z platformy przez użytkowników:

## 1. 🏷️ Interaktywny selektor tagów dla "Umiejętności" w Ankiecie
**Gdzie:** `survey.html` (sekcja "Umiejętności Twarde / Narzędzia")
- **Obecnie:** Użytkownik wpisuje swoje umiejętności w zwykłe, płaskie pole tekstowe (`<textarea>`), używając przecinków (np. "JavaScript, Docker, AWS"). 
- **Propozycja zmiany:** Zastąpienie zwykłego pola tekstowego komponentem wprowadzania znaczników (Tag Input / Chips w stylu np. Angular Material). Gdy użytkownik wpisze "JavaScript" i kliknie Enter lub przecinek, tekst zamienia się w przypięty, wizualny kafelek z przyciskiem (❌), którym można go usunąć. 
- **Dlaczego warto?** Zapobiega literówkom, ułatwia modelowi AI lepsze i czytelniejsze wyciągnięcie danych, oraz uprzyjemnia użytkownikowi żmudny i nudny proces wypełniania formularza Survey.

## 2. 🗑️ Możliwość usunięcia / zarchiwizowania planów na Dashboardzie
**Gdzie:** `dashboard.html` (kafelki z planami / nakładka szczegółów planu)
- **Obecnie:** Wygenerowane plany widnieją jako ciągła lista w interfejsie Dashboardu. Aktualnie w kodzie kliknięcie planu wywołuje `openPlan(plan)`, lecz w szczegółach (`plan-detail`) nie ma żadnej przemyślanej logiki, żeby niewłaściwie wygenerowany plan móc po prostu usunąć.
- **Propozycja zmiany:** Dodać czerwoną ikonę śmietnika w prawym górnym rogu na nakładce wybranego planu (obok X), która wywoła alert "Czy na pewno chcesz usunąć?". Jeśli tak, plan zostaje trwale skasowany z backendu, odświeżając po tym listę w dashboardzie. Poprawia to zarządzanie profilami, jeśli sztuczna inteligencja zwróci wadliwą ścieżkę.

## 3. 🔗 Aktywne linki URL w sekcji "Zasoby edukacyjne"
**Gdzie:** `roadmap-component.html` 
- **Obecnie:** Model generujący często poleca materiały, używając w liście `res` odnośników np. `https://kurs...`. Na nakładce (modal) pojedynczego etapu są one renderowane w całości jako czysty, niedotykowy tekst w elemencie `<li>{{ res }}</li>`. Użytkownik chcąc przejść do materiału, musi go ręcznie, żmudnie zaznaczać i kopiować.
- **Propozycja zmiany:** Dodanie niestandardowego filtra tzn. "Pipa" do Angulara (np. `UrlifyPipe`), który weźmie tekst zwracany z AI, znajdzie Regexem wszystko co jest URL-em i na poziomie bindowania HTML utworzy interaktywny znacznik `<a href="..." target="_blank" class="text-[var(--ih-accent)] hover:underline">...</a>`.

## 4. 🎉 Satysfakcjonująca animacja i ulepszenie gamifikacji zdobywania XP
**Gdzie:** `roadmap-component.html` (funkcja `onCompleteTask()`) oraz sekcja levelowania w Dashboardzie.
- **Obecnie:** Komponent roadmapy (`honeycomb-cells`) wspiera awansowanie (`xpCurrent()`, `level()`). Kiedy użytkownik w modalach klika "Ukończ", zadanie po cichu ukazuje znaczek "✔" i ładuje dane. Gamifikacja nie daje natychmiastowej nagrody dla umysłu użytkownika.
- **Propozycja zmiany:** Podczas naciśnięcia "Ukończ", powinna generować animacja lekkich particles (konfetti) nad klikniętym komsem, a do używanego już `sweetalert2` (lub toasta z Angular CDK) podążać komunikat w rogu "Świetnie! +50 XP, Jesteś coraz bliżej!". Wprowadzi to poczucie faktycznego nagradzania za zaangażowanie w korzystanie z platformy.

## 5. 📥 Opcja "Eksportuj do PDF" jako wizytówka CV / Profilu AI
**Gdzie:** Okno podglądu planu (`dashboard.html` -> `plan-detail`) oraz w głownej belce powrotnej w `roadmap-component.html`.
- **Obecnie:** Użytkownik widzi piękny wynik analizy. Gdy chce go zachować fizycznie by pokazać znajomym, mentorowi lub dodać do swojego CV jako "proponowana i przebyta ścieżka", musi wykonywać zrzuty ekranu, co ucina zawartość ukrytą niżej przy przeijaniu i źle wygląda.
- **Propozycja zmiany:** Po lewej obok przycisku `Zobacz graf 🗺️` dodać `Eksportuj plan do PDF 📥`. Za pomocą paczki np. `pdfmake` lub `html2pdf-js` kliknięcie tego pobiera sformatowany dokment w formie jednej strony, uwzględniający wygenerowane podsumowanie kariery, etapy i twarde umiejętności, stanowiąc swoistą teczkę z wygenerowanym kierunkiem kształcenia.

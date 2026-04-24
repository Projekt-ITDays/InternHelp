# 10 Najważniejszych Celów w Projekcie (InternHelp)

Poniżej znajduje się lista 10 kluczowych celów do zrealizowania w projekcie, podzielona na luki bezpieczeństwa (Security Vulnerabilities), rzeczy do poprawy z punktu widzenia długu technologicznego, oraz propozycje nowych funkcjonalności.

## 🚨 Bezpieczeństwo (Security Vulnerabilities)

1. **Zarządzanie Sekretami i Wyciek Danych (Twarde kodowanie zmiennych):**
   W pliku `backend/.env` znajdują się jawnie wpisane produkcyjne sekrety (hasła do bazy PostgreSQL, instancji MongoDB, klucze JWT, klucze Google OAuth oraz Google/Gemini API). 
   - **Cel:** Należy natychmiastowo wygenerować i podmienić nowe klucze (klucze mogły ulec kompromitacji) oraz zaimplementować bezpieczne rozwiązanie z ukrywaniem kluczy środowiskowych np. poprzez Azure Key Vault. Upewnić się, że plik `.env` produkcyjny nie trafia do repozytorium.

2. **Wyciek tokenu JWT w URL (Google Auth Callback):**
   W pliku `backend/src/auth/auth.controller.ts` metoda auth przekierowuje po zalogowaniu na `http://localhost?token=...`. Przekazywanie sekretnego Access Tokenu w parametrach URL to duże zagrożenie bezpieczeństwa (token loguje się m.in. w historii przeglądarki). 
   - **Cel:** Należy refaktorować logikę i przekazywać token np. przy pomocy zabezpieczonych ciasteczek (HttpOnly) lub jednorazowego kodu wymienianego przez frontend na token post-login.

3. **Brakujące Guardy na CORS i Cookie (Twarde wpisanie `secure: false`):**
   Ciasteczka w `auth.controller.ts` mają na stałe ustawione `secure: false` ("bo nie mamy https"). W systemie produkcyjnym doprowadza to przesyłania ciastek jawnym textem. CORS (`main.ts`) dopuszcza również wezwania bez ustawionego Origin (`!origin`), ułatwiając potencjalne złośliwie wykonania kodu z zewnątrz (CSRF).
   - **Cel:** Skonfigurować dynamicznie CORS i ciasteczka względem `process.env.NODE_ENV`, by na produkcji flaga `secure: true` była bezwzględnie wymuszana a nieautoryzowane originy blokowane.

4. **Brak zabezpieczenia CAPTCHA przy wariancie 'Register':**
   Aplikacja posiada `validateRecaptcha` przy logowaniu w `auth.service.ts`, ale brakuje analogicznej weryfikacji CAPTCHA w metodzie `register` w tym samym pliku. Otwiera to drogę do zalania bazy fikcyjnymi kontami przez boty (Spam/DDoS).

5. **Sanityzacja danych wejściowych w usługach AI (Prompt Injection):**
   Aplikacja korzysta z usług LLM (Langchain/Gemini). Każdy wejściowy format od użytkownika przesłany prosto do modelu AI rodzi potencjalne ryzyko nadpisywania promptów (Prompt Injection). 
   - **Cel:** Wdrożyć rygorystyczne parsowanie i system "Input Sanitization" zanim dane trafią z Survey/Wiadomosci od strony frontendowej do generatorów AI po stronie backendu.

## ⚙️ Do załatwienia (Rzeczy techniczne / Reworking) 

6. **Zarządzanie Błędami z HTTP Code w NestJS:**
   Większość walidacji (np. błędne hasło, użytkownik nie znalezony) w `auth.service.ts` jest przechwytywana przez rzucanie ogólnego wyjątku `throw new Error('User not found')`. Powoduje to domyślne, nieszczegółowe błędy HTTP 500 w Nest.
   - **Cel:** Użyć prawidłowych klas `HttpException` zgodnych ze specyfikacją frameworku np. `throw new UnauthorizedException()`, aby frontend mógł poprawnie interpretować kody błędów (401/403).

7. **Konfiguracja środowiskowa dla Frontendu (Angular `environment.ts`):**
   Aplikacja pomimo flagi `production: true`, nadal przypisuje `apiUrl` na ścieżkę sztywną do `http://localhost:3000`. 
   - **Cel:** Wdrożyć poprawne pliki `environment.prod.ts` celujące w poprawne adresy w chmurze Azure (`https://api.carriersign.batko.it`), aby aplikacja w środowisku kontenerowym nie odwoływała się poprzez localhost.

8. **Optymalizacja Środowiska Produkcyjnego (Docker/Deploy):**
   `docker-compose.yml` jest aktualnie przeznaczony typowo do developingu - mapuje wolumeny i aplikuje skrypty deweloperskie z live reloadem. 
   - **Cel:** Stworzenie dedykowanej wersji plików CI/CD (np. `docker-compose.prod.yml` i wielostopniowych `Dockerfile`), aby budowały ostateczny branch frontendu bez zależności node_modules dla Nginx, optymalizując wagę instancji.

## ✨ Dodatkowa funkcjonalność (Features)

9. **Wdrożenie pełnego autoryzowania na podstawie RBAC (Modele ról):**
   Logowanie pomyślnie zwraca `role` dla użytkownika, jednak brakuje backendowych restrykcji, np. `@Roles('admin')`.
   - **Cel:** Dodać `RolesGuard` sprawdzający, czy użytkownik modyfikujący zasoby ma prawidłową rolę. Zapobiegnie to eskalacji uprawnień ze strony zwykłych użytkowników.

10. **Implementacja Limitowania Zbapytań (Rate Limiting) pod moduły AI:**
    Zapytania do modeli sztucznej inteligencji potrafią kosztować sporą część API Quoty. Bez limitu, aplikacja jest narażona na szybkie i bezproblemowe zużycie limitów Google AI / Gemini API.
    - **Cel:** Dołączenie i konfiguracja paczki `@nestjs/throttler` (ThrottleGuard), który powstrzyma użytkowników od notorycznego odświeżania dashboardu/promptu co sekundę.

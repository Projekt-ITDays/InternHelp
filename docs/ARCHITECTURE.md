# InternHelp — Architektura i przepływ danych

Dokument opisuje jak system faktycznie działa, na podstawie kodu źródłowego.

---

## 1. Co robi system

Student wypełnia ankietę (kierunek, rok studiów, umiejętności, cele) → AI agent generuje spersonalizowany plan rozwoju → student pracuje przez interaktywną siatkę hexagonalną (roadmapę) z zadaniami na 3 poziomy trudności → zdobywa XP i awansuje na level.

System ma **dwa tryby pracy**:

1. **Tryb ankiety + agent** — pełny flow: survey → prompt → LangChain agent z narzędziami → plan w MongoDB → roadmapa
2. **Tryb szybki** — bez ankiety: `/ai/ask` → Gemini zwraca 3 ścieżki kariery → `/ai/roadmap/:careerPath` → streaming Markdown + hexagonal grid z zadaniami generowanymi przez Gemini

---

## 2. Infrastruktura

### Serwisy (docker-compose.yml)

| Serwis | Obraz | Port | Opis |
|--------|-------|------|------|
| `db` | postgres:15 | 5432 | Baza relacyjna — użytkownicy, ankiety, osiągnięcia, refresh tokeny |
| `api` | backend/dockerfile (target: dev) | 3000 | NestJS API + AI agent |
| `web` | frontend/dockerfile (Nginx) | 80 | Angular SPA serwowany przez Nginx |

### Sieci

- `db-network` — db ↔ api (PostgreSQL)
- `app-network` — api ↔ web (HTTP)

### Bazy danych

**PostgreSQL** (TypeORM, synchronize: true):
- `User` — użytkownicy (UUID, username, password bcrypt, role, experience, level)
- `surveys` — ankiety (int PK, userId, 12 pól: Major, YearOfStudy, PreferredInternshipType, TimeLeft, Inrest, Expierience, skills, AbilitiesLevel, SideProjectsHobby, Strengths, Weaknesses, University, GraduationYear)
- `Achievement` — osiągnięcia (UUID, userId, title, description, xpReward, completed)
- `refresh_tokens` — refresh tokeny JWT (userId, token UUID, expiresAt)

**MongoDB Atlas** (Mongoose):
- `AgentResponse` — plany AI (userId, customTitle, status, planData, fullHistory, gridState)
- `Advices` — baza wiedzy z embeddingami do vector search (tekst + wektor)

### Produkcja

Wdrożenie na **Azure Container Apps** przez GitHub Actions:
- Backend: `api.carriersign.batko.it` (port 3000)
- Frontend: `carriersign.batko.it` (port 80)
- Obrazy w Azure Container Registry (ACR)
- Zmienne środowiskowe z GitHub Secrets

---

## 3. Backend — NestJS

### 3.1 Bootstrap (main.ts)

```
ValidationPipe (whitelist, forbidNonWhitelisted, transform)
  → CORS (allowedOrigins lista, credentials: true)
    → cookieParser
      → Swagger na /api
        → app.listen(3000)
```

### 3.2 Moduł Auth (auth/)

**Cel:** Uwierzytelnianie użytkowników przez JWT + Google OAuth2.

#### Przepływ logowania klasycznego

1. Frontend → `POST /auth/login` z `{username, password, captchaToken}`
2. Backend waliduje reCAPTCHA przez Google reCAPTCHA Enterprise API
3. Sprawdza użytkownika w PostgreSQL, porównuje hasło przez bcrypt
4. Generuje JWT access token (1h) + refresh token (UUID, 3 dni)
5. Refresh token zapisany w DB i w httpOnly cookie (`secure: false` — brak HTTPS)
6. Zwraca `{accesstoken, userId, username, role}`

#### Przepływ Google OAuth2

1. Frontend redirect → `GET /auth/google/login`
2. Passport.js redirect do Google, scope: email + profile
3. Callback → `GET /auth/google/callback`
4. Jeśli użytkownik nie istnieje — automatyczna rejestracja z losowym hasłem `google-${uuid}`
5. **Token JWT przekazywany w URL** przez redirect do frontend: `?token=JWT&username=...&role=...&userId=...`
   - ⚠️ To jest luka bezpieczeństwa — token w logach serwera, historii przeglądarki

#### Refresh token

`POST /auth/refresh` — czyta refresh token z cookie, weryfikuje w DB, usuwa stary, generuje nowy access + refresh token.

#### Rejestracja

`POST /auth/register` z `{username, password, captchaToken}` — password musi mieć 8-20 znaków, wielką literę, małą literę, cyfrę/znak specjalny. reCAPTCHA wymagana.

#### Guard

`AuthGuard` — ręczna implementacja (nie Passport JWT): czyta `Authorization: Bearer <token>` z nagłówka, weryfikuje przez `jwtService.verify()`, ustawia `request.user`.

### 3.3 Moduł AI (ai/)

**Cel:** Komunikacja z Google Gemini API + LangChain agent z narzędziami.

#### AiService — bezpośrednie wywołania Gemini

Używa modelu `gemini-2.5-flash-lite` przez `@google/generative-ai`.

| Endpoint | Metoda | Auth | Co robi |
|----------|--------|------|---------|
| `/ai/ask` | POST | Brak | Zwraca 3 ścieżki kariery jako JSON na podstawie promptu użytkownika |
| `/ai/roadmap` | SSE | Brak | Streamuje roadmapę w Markdown (chunk po chunku) |
| `/ai/roadmap-concepts` | GET | Brak | Zwraca 10 tematów nauki (JSON) z paginacją po levelu i wykluczeniem |
| `/ai/verify-task` | POST | Brak | AI ocenia odpowiedź na zadanie otwarte (score 0-2 + feedback) |
| `/ai/generate-tasks` | GET | Brak | Generuje zadania (closed/open) w zależności od trudności |
| `/ai/survey` | POST | JWT | Zapisuje ankietę, wykrywa duplikaty (porównuje wszystkie pola) |
| `/ai/surveys` | GET | JWT | Pobiera ankiety użytkownika |
| `/ai/surveys/:id` | DELETE | JWT | Usuwa ankietę |
| `/ai/survey-results` | POST | JWT | **Główny endpoint** — wywołuje LangChain agenta |
| `/ai/plans` | GET | JWT | Lista planów użytkownika z MongoDB |
| `/ai/plans/:id/grid-state` | PATCH/GET | JWT | Zapis/odczyt stanu siatki hexagonalnej |
| `/ai/plans/:id` | DELETE | JWT | Usuwa plan |
| `/ai/plans/:id/title` | PATCH | JWT | Zmienia tytuł planu |

**Uwaga:** Endpointy Gemini (`/ai/ask`, `/ai/roadmap`, `/ai/roadmap-concepts`, `/ai/verify-task`, `/ai/generate-tasks`) są **publiczne** — bez autoryzacji.

#### AiAgentService — LangChain agent

**Architektura agenta:**

```
Użytkownik → POST /ai/survey-results {prompt}
  → Rate limit check (5 req/min, 1 in-flight per user)
    → createAgent({
        model: ChatGoogle('gemini-2.5-flash'),
        tools: [8 narzędzi],
        middleware: [dynamicModelSelection, handleToolErrors],
        systemPrompt: [długi prompt + userId]
      })
      → agent.invoke({messages: [{role: "user", content: prompt}]})
        → extractAndSavePlan() → MongoDB
```

**8 narzędzi agenta (tools):**

| Narzędzie | Co zwraca | Źródło danych |
|-----------|-----------|---------------|
| `get_profile_snapshot({userId})` | Pełny profil z ankiety (edukacja, doświadczenie, zainteresowania, cele, umiejętności, czas) | PostgreSQL surveys |
| `get_education({userId})` | Kierunek, rok studiów, uczelnia, rok ukończenia | PostgreSQL surveys |
| `get_experience({userId})` | Doświadczenie, side projects | PostgreSQL surveys |
| `get_intrest({userId})` | Zainteresowania, mocne/słabe strony | PostgreSQL surveys |
| `get_goal({userId})` | Cel zawodowy (PreferredInternshipType) | PostgreSQL surveys |
| `get_abilities({userId})` | Mocne/słabe strony | PostgreSQL surveys |
| `get_time_left({userID})` | Czas do dyspozycji w miesiącach | PostgreSQL surveys |
| `retrive({query})` | Dokumenty z bazy wiedzy | MongoDB Atlas Vector Search |

**Dynamiczny wybór modelu** (middleware):
- ≤ 5 wiadomości w konwersacji → `gemini-3-flash-preview`
- > 5 wiadomości → `gemini-2.5-flash`

**Cache ankiet:** 60s TTL w pamięci (`Map<string, {data, expiresAt}>`)

**Rate limiting:** In-memory, per-user:
- Maks. 5 żądań na 60s
- Maks. 1 żądanie w toku jednocześnie
- Maks. długość promptu: 2000 znaków

**Vector Search:** MongoDB Atlas, kolekcja `Advices`, indeks `vector_index`, embedding model `gemini-embedding-001` (RETRIEVAL_DOCUMENT), zwraca 5 najbardziej podobnych dokumentów.

**System prompt agenta** (aiAgent.service.ts:115-170):
- Agent jest "elitarnym Architektem Kariery"
- Najpierw musi wywołać `get_profile_snapshot(userId)`
- Plan zwraca jako JSON ze strukturą: `podsumowanie_profilu`, `szacowany_czas_tygodniowo`, `plan[]` (etapy z celami, umiejętnościami, zasobami, projektem portfolio, KPI)
- Nie-planowe pytania odpowiada naturalnym językiem

**Zapis planu:** Jeśli odpowiedź zawiera `plan[]` lub `kamienie_milowe[]` → sanitizacja → zapis w MongoDB jako `AgentResponse` z `planData`, `fullHistory`, `customTitle` (wyekstrahowany z pierwszego etapu).

### 3.4 Moduł Gamifikacji (experience-handler/)

**Cel:** System XP i leveli.

#### Formuła leveli

```
XP na level N = N × (N-1) × 50
Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, Level 4: 600 XP
```

Obliczane jako: `floor(0.5 + sqrt(0.25 + totalXp / 50))`

#### Endpointy (wszystkie wymagają JWT)

| Endpoint | Co robi |
|----------|---------|
| `POST /experience-handler/achievements` | Tworzy osiągnięcie (title, description, xpReward) |
| `PATCH /experience-handler/achievements/:id/complete` | Ukończenie osiągnięcia — **transakcja DB**: oznacza jako completed + atomowy increment XP + przelicza level |
| `GET /experience-handler/progress` | Pobiera postęp: level, XP, progressPercent, achievements (JOIN) |
| `POST /experience-handler/add` | Dodaje XP (transakcja: increment + przelicz level) |
| `POST /experience-handler/remove` | Odejmuje XP (min 0, transakcja) |

#### Transakcje

`completeAchievement` i `addExperience` używają `dataSource.transaction()` z `manager.increment()` — atomowe operacje bezpieczne przy równoczesnych requestach.

### 3.5 DTO (walidacja)

| DTO | Walidacja |
|-----|-----------|
| `LoginDto` | username, password, captchaToken (wszystkie required) |
| `LoggingCredentialsDto` | username, password (8-20 znaków, regex: wielka+mała+cyfra), captchaToken |
| `SurveyDto` | userId, Major, YearOfStudy (min 1), PreferredInternshipType, TimeLeft (min 0), Inrest, Expierience, skills, AbilitiesLevel, SideProjectsHobby, Strengths, Weaknesses, University, GraduationYear |
| `AgentPayloadDto` | prompt (string) |
| `CreateAchievementDto` | title (required), description (optional), xpReward (min 1) |

---

## 4. Frontend — Angular 18

### 4.1 Routing

| Ścieżka | Komponent | Auth |
|---------|-----------|------|
| `/` | WelcomeScreen | Brak |
| `/survey` | Survey | Brak (sprawdza token w ngOnInit) |
| `/ai/ask` | PromptComponent | Brak (sprawdza token w sendRequest) |
| `/ai/roadmap/:careerPath` | RoadmapComponent | Brak (sprawdza token w ngOnInit) |
| `/dashboard` | Dashboard | Brak (sprawdza token w ngOnInit) |
| `/**` | redirect → `/` | — |

**Uwaga:** `canActivate` jest pusty na wszystkich route'ach — autoryzacja jest sprawdzana asynchronicznie w komponentach przez `authService.ensureAccessToken()`.

### 4.2 Serwisy

#### AuthService
- Przechowuje access token w pamięci (`private accessToken: string | null`)
- `userId` i `username` w localStorage
- `ensureAccessToken()` — jeśli brak tokena w pamięci, próbuje refresh z cookie
- Google login — redirect do `/auth/google/login`
- Refresh token — `POST /auth/refresh` z `withCredentials: true`

#### Auth Interceptor
- Automatycznie dodaje `Authorization: Bearer <token>` do requestów do `environment.apiUrl`
- Token z pamięci, nie z localStorage

#### Ai service
- `askGemini()` — POST do `/ai/ask`
- `streamRoadmap()` — SSE (EventSource) do `/ai/roadmap`
- `getHexagonConcepts()` — GET `/ai/roadmap-concepts` z parametrami level + exclude
- `verifyOpenTask()` — POST `/ai/verify-task`
- `generateTasksForTopic()` — GET `/ai/generate-tasks`
- `submitSurveyPrompt()` — POST `/ai/survey-results` (agent)
- `getUserPlans()`, `deleteUserPlan()`, `updatePlanTitle()` — CRUD planów
- `getUserSurveys()`, `deleteUserSurvey()` — CRUD ankiet
- `saveGridState()`, `getGridState()` — stan siatki roadmapy

#### ExperienceService
- `getProgress()` — pobiera level, XP, achievements
- `addExperience(amount)` — dodaje XP
- `removeExperience(amount)` — odejmuje XP

#### SurveyService
- `postSurvey(payload)` — wysyła ankietę

#### RoadmapStorageService
- `saveGridState(planId, state)` — PATCH do MongoDB
- `getGridState(planId)` — GET z MongoDB

### 4.3 Komponenty

#### WelcomeScreen
- Logowanie z reCAPTCHA (ngx-captcha, site key: `6LeRc7ws...`)
- Rejestracja (komponent Registration)
- Google login — redirect
- Obsługa callback Google OAuth — parsuje `?token=...&username=...&role=...&userId=...` z URL
- Landing page z feature cards

#### Survey
- Formularz ankiety z 12 polami
- Komponenty: UniversityPicker, SkillsChips, HardSkillsChips, TimeLeftPicker
- Historia ankiet — użytkownik może przywrócić poprzedni profil
- Detekcja duplikatów — jeśli wszystkie pola takie same, odświeża createdAt
- Dwa tryby: "Zapisz tylko" (zapisuje i zostaje) i "Wyślij" (zapisuje i redirect do /prompt)
- Normalizacja: usuwa duplikaty z Strengths/Weaknesses, filtruje Strengths z Weaknesses

#### PromptComponent
- Pole tekstowe do wpisywania promptu dla agenta AI
- `POST /ai/survey-results` z promptem
- Jeśli odpowiedź zawiera `plan[]` → plan wygenerowany
- Jeśli `message` → odpowiedź tekstowa agenta
- Redirect do dashboard po sukcesie

#### Dashboard
- Pobiera plany z MongoDB przez `aiService.getUserPlans()`
- Pobiera postęp XP przez `experienceService.getProgress()`
- Drag & drop planów (CDK), kolejność zapisana w localStorage
- Edycja tytułu planu (SweetAlert2)
- Usuwanie planów z potwierdzeniem
- Lista zadań do wykonania — z localStorage roadmap state
- Kliknięcie zadania → redirect do roadmapy z query param `?topic=...&diff=...`
- Maks. 6 planów widocznych, reszta za "Pokaż więcej"

#### RoadmapComponent (712 linii — najskładniejszy komponent)
- **Siatka hexagonalna** — 150 komórek, algorytm sąsiadów dla hex grid
- **Ładowanie stanu:** MongoDB → localStorage (fallback) → inicjalizacja od zera
- **Inicjalizacja:** Pobiera 10 tematów przez `getHexagonConcepts()`, pierwszy w komórce 30, reszta w `topicStack`
- **Auto-expand:** Gdy `topicStack < 6` i `currentLevel < 10`, doczytuje kolejne tematy z AI, wykluczając już użyte
- **Każda komórka** ma 3 poziomy trudności: Łatwy, Średni, Trudny
- **Zadania:** Zamknięte (multiple choice) i otwarte (tekstowe, weryfikacja przez AI)
- **Punktacja:**
  - Quiz (closed): +1 punkt za poprawną odpowiedź
  - Otwarte: 0-2 punkty (AI ocenia)
  - XP: Łatwy = 25, Średni = 75, Trudny = 200 (mnożone przez score dla otwartych)
- **Ukończenie komórki:** Gdy wszystkie zadania na danym poziomie są zrobione → odblokowuje sąsiadów
- **Zapis stanu:** localStorage + MongoDB (RoadmapStorageService)
- **Panning:** Mouse drag + touch, clamp: -2000 do 2000 w obu osiach
- **Markdown rendering:** `marked.parse()` + `DomSanitizer.bypassSecurityTrustHtml()`
- **Sidebar** z etapami planu (z `planData.plan[]`)

### 4.4 Środowiska

| Środowisko | apiUrl |
|------------|--------|
| Development | `http://localhost:3000` |
| Production | `https://api.carriersign.batko.it` |

---

## 5. Przepływy danych

### 5.1 Pełny flow — od ankiety do roadmapy

```
1. Użytkownik loguje się (login/password lub Google)
   → JWT access token (1h) + refresh token cookie (3d)

2. Użytkownik wypełnia ankietę (/survey)
   → POST /ai/survey {surveyData}
   → Zapis w PostgreSQL (surveys tabela)
   → Detekcja duplikatów

3. Użytkownik wpisuje prompt (/ai/ask)
   → POST /ai/survey-results {prompt}
   → Agent pobiera dane z ankiety przez narzędzia
   → Agent generuje plan JSON
   → Plan zapisany w MongoDB (AgentResponse)
   → Odpowiedź zwrócona do frontendu

4. Użytkownik przechodzi do dashboardu (/dashboard)
   → GET /ai/plans → Lista planów z MongoDB
   → GET /experience-handler/progress → Level i XP

5. Użytkownik otwiera roadmapę (/ai/roadmap/:planId)
   → GET /ai/plans/:id/grid-state → Stan siatki z MongoDB
   → Fallback: localStorage
   → Inicjalizacja: GET /ai/roadmap-concepts → 10 tematów z Gemini
   → Kliknięcie komórki → GET /ai/generate-tasks → Zadania z Gemini
   → Zamknięte zadania: lokalna weryfikacja
   → Otwarte zadania: POST /ai/verify-task → AI ocenia
   → XP: POST /experience-handler/add → Transakcja w PostgreSQL
   → Zapis stanu: PATCH /ai/plans/:id/grid-state → MongoDB + localStorage
```

### 5.2 Szybki flow — bez ankiety

```
1. Użytkownik wpisuje zainteresowania (/ai/ask)
   → POST /ai/ask {prompt}
   → Gemini zwraca 3 ścieżki kariery (JSON)

2. Użytkownik wybiera ścieżkę
   → Redirect do /ai/roadmap/:careerPath
   → SSE /ai/roadmap?careerPath=... → Streaming Markdown
   → Hex grid z zadaniami jak wyżej
```

---

## 6. Zmienne środowiskowe

### Backend (.env)

| Zmienna | Wymagana | Opis |
|---------|----------|------|
| `DB_HOST` | Tak | Host PostgreSQL |
| `DB_USER` | Tak | Użytkownik PostgreSQL |
| `DB_PASSWORD` | Tak | Hasło PostgreSQL |
| `DB_NAME` | Tak | Nazwa bazy PostgreSQL |
| `DB_SSL` | Nie | `true`/`false` (domyślnie false) |
| `JWT_SECRET` | Tak | Klucz JWT (⚠️ fallback: `default_secret`) |
| `GEMINI_API_KEY` | Tak | Klucz Google Gemini API |
| `MANGO_URL` | Tak | URI MongoDB Atlas |
| `GOOGLE_CLIENT_ID` | Tak | Google OAuth Client ID |
| `GOOGLE_SECRET` | Tak | Google OAuth Client Secret |
| `GOOGLE_CALLBACK_URL` | Tak | URL callback Google OAuth |
| `RECAPTCHA_PROJECT_ID` | Dev: nie | reCAPTCHA Enterprise project |
| `RECAPTCHA_API_KEY` | Dev: nie | reCAPTCHA API key |
| `RECAPTCHA_SITE_KEY` | Dev: nie | reCAPTCHA site key |
| `FRONTEND_URL` | Nie | URL frontend (domyślnie `http://localhost`) |
| `PORT` | Nie | Port (domyślnie 3000) |

---

## 7. Kluczowe decyzje architektoniczne

### Dlaczego dwie bazy danych?

- **PostgreSQL** — dane relacyjne, które wymagają transakcji: użytkownicy, ankiety, osiągnięcia, XP
- **MongoDB** — elastyczne dane AI: plany (zagnieżdżony JSON), pełna historia konwersacji, stan siatki hexagonalnej + vector search dla bazy wiedzy

### Dlaczego LangChain agent, a nie bezpośrednie wywołanie Gemini?

Agent ma narzędzia (tools) do pobierania danych z bazy — nie trzeba wstrzykiwać wszystkich danych ankiety do promptu. Agent sam decyduje, które narzędzia wywołać. Vector search pozwala na RAG (Retrieval-Augmented Generation) z bazy wiedzy.

### Dlaczego hex grid?

Roadmapa to wizualna siatka 150 komórek hexagonalnych. Tematy są odblokowywane inkrementalnie — ukończenie jednego odblokowuje sąsiadów. Każdy temat ma 3 poziomy trudności z różnymi typami zadań.

### Dlaczego SSE dla roadmapy?

`/ai/roadmap` używa Server-Sent Events do streamowania Markdown chunk po chunku — użytkownik widzi generowanie w czasie rzeczywistym, zamiast czekać na całą odpowiedź.

---

## 8. Problemy i ograniczenia

### Krytyczne

1. **JWT w URL po Google OAuth** — `auth.controller.ts:65` przekazuje token w query param przy redirect. Token trafia do logów serwera, historii przeglądarki, referer headers.
2. **Hard-coded JWT_SECRET** — `app.module.ts:53` używa `'default_secret'` jeśli brak zmiennej środowiskowej. Atakujący może podpisać dowolny token.
3. **synchronize: true w produkcji** — `app.module.ts:46`. TypeORM automatycznie modyfikuje schemat DB, co może usunąć kolumny w produkcji.
4. **Publiczne endpointy AI** — `/ai/ask`, `/ai/roadmap`, `/ai/verify-task`, `/ai/generate-tasks` nie mają autoryzacji. Każdy może korzystać z Gemini API bez limitów.
5. **XSS** — `roadmap-component.ts:95` używa `bypassSecurityTrustHtml()` na Markdown z AI. Jeśli AI zwróci złośliwy HTML, zostanie wykonany.

### Wysokiego ryzyka

1. **Cookies bez secure flag** — `secure: false` w auth.controller.ts. Refresh token przesyłany przez HTTP bez szyfrowania.
2. **Brak walidacji na agentPayload** — `AgentPayloadDto` tylko sprawdza `IsString()`, bez limitu długości na poziomie DTO (limit 2000 jest w serwisie).
3. **Rate limiting w pamięci** — `requestCounters` i `inFlightByUser` to `Map` w pamięci. Restart procesu resetuje limity. Przy wielu instancjach każdy ma własny counter.
4. **Open redirect** — Google OAuth redirect do `FRONTEND_URL` z tokenem. Jeśli `FRONTEND_URL` jest źle skonfigurowany, token może trafić do innej domeny.
5. **MongoDB URI w logach** — `aiAgent.service.ts:39` — `mongoUri` z hasłem może trafić do logów.

### Średniego ryzyka

1. **console.log w produkcji** — Wiele `console.log` w auth.service, aiAgent.service, experience-handler.
2. **Brak unique constraint na userId w surveys** — Możliwe ankiety od innych użytkowników z tym samym ID.
3. **SSE bez autoryzacji** — `/ai/roadmap` nie wymaga JWT.
4. **Typ `any` w gridState** — `roadmap-component.ts` — brak typów TypeScript dla stanu siatki.

---

## 9. Jak uruchomić lokalnie

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/Projekt-ITDays/InternHelp.git
cd InternHelp

# 2. Stwórz backend/.env (patrz sekcja 7)

# 3. Uruchom przez Docker
docker-compose up --build

# Frontend: http://localhost (port 80, Nginx)
# Backend API: http://localhost:3000
# Swagger docs: http://localhost:3000/api
```

### Lokalny dev bez Dockera

```bash
# Terminal 1 — Backend
cd backend
npm install
# edytuj .env
npm run start:dev

# Terminal 2 — Frontend
cd frontend
npm install
ng serve
```

---

## 10. Gdzie szukać kodu

| Chcę zrozumieć... | Plik |
|-------------------|------|
| Jak działa logowanie | `backend/src/auth/auth.service.ts` |
| Jak działa agent AI | `backend/src/ai/aiAgent.service.ts` |
| System prompt agenta | `aiAgent.service.ts:115-170` |
| Narzędzia agenta | `aiAgent.service.ts:228-383` |
| Jak działa roadmapa | `frontend/src/app/pages/roadmap/roadmap-component.ts` |
| Hex grid algorytm | `roadmap-component.ts:245-311` |
| Punktacja i XP | `roadmap-component.ts:611-703` |
| Leveli i XP formuła | `backend/src/experience-handler/experience-handler.service.ts:18-32` |
| Vector search | `aiAgent.service.ts:590-609` |
| CI/CD pipeline | `.github/workflows/deploy.yml` |
| Konfiguracja środowisk | `frontend/src/environments/environment*.ts` |

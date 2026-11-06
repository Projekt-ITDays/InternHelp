# InternHelp — Raport błędów bezpieczeństwa

Raport zawiera zidentyfikowane luki bezpieczeństwa w projekcie InternHelp, posortowane według krytyczności.

---

## 🔴 CRITICAL (5)

### 1. JWT przekazywany w URL po Google OAuth

**Plik:** `backend/src/auth/auth.controller.ts:65`

**Problem:** Po zalogowaniu przez Google, token JWT przekazywany jest jako parametr query w URL przy redirect do frontendu:

```typescript
// auth.controller.ts:65
return res.redirect(`${frontendUrl}?token=${accessToken}&username=${user.username}&role=${user.role}&userId=${user.id}`);
```

**Wpływ:**
- Token trafia do logów serwera proxy/serwera
- Token widoczny w historii przeglądarki
- Token może wycieknąć przez nagłówki `Referer`
- Token zapisany w plikach historii przeglądarki na dysku

**Rekomendacja:** Użyć session-based flow — zapisać token w sesji serwera, przekazać tylko session ID w cookie, a frontend pobiera token z bezpiecznego endpointu.

---

### 2. Hard-coded JWT_SECRET jako fallback

**Plik:** `backend/src/app.module.ts:53`

**Problem:** Jeśli zmienna środowiskowa `JWT_SECRET` nie jest ustawiona, używany jest domyślny sekret:

```typescript
// app.module.ts:53
secret: process.env.JWT_SECRET || 'default_secret',
```

**Wpływ:** Atakujący zna klucz do podpisywania tokenów JWT i może podpisać dowolny token, uzyskując dostęp do konta dowolnego użytkownika (nawet admina).

**Rekomendacja:** Rzucać błąd przy starcie aplikacji, jeśli `JWT_SECRET` nie jest ustawiony:

```typescript
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
secret: process.env.JWT_SECRET,
```

---

### 3. synchronize: true w produkcji

**Plik:** `backend/src/app.module.ts:46`

**Problem:** TypeORM skonfigurowany z `synchronize: true`, co oznacza automatyczne modyfikowanie schematu bazy danych:

```typescript
// app.module.ts:46
synchronize: true,
```

**Wpływ:** Jeśli usuniesz lub zmienisz pole w encji, TypeORM automatycznie usunie lub zmodyfikuje kolumnę w bazie danych produkcyjnej — trwała utrata danych.

**Rekomendacja:** Użyć `synchronize: false` w produkcji i migracje TypeORM do zarządzania schematem.

---

### 4. Publiczne endpointy AI bez autoryzacji

**Plik:** `backend/src/ai/ai.controller.ts`

**Problem:** Endpointy `/ai/ask`, `/ai/roadmap`, `/ai/roadmap-concepts`, `/ai/verify-task`, `/ai/generate-tasks` nie mają guardu JWT — każdy może korzystać z Gemini API bez autoryzacji.

**Wpływ:**
- Każdy może generować roadmapy, zadania, oceniać odpowiedzi — bez limitów
- Koszty API Gemini mogą być nieograniczone
- Brak kontroli nad tym, kto korzysta z AI

**Rekomendacja:** Dodać `@UseGuards(AuthGuard)` do endpointów AI, które powinny wymagać autoryzacji.

---

### 5. XSS przez bypassSecurityTrustHtml

**Plik:** `frontend/src/app/pages/roadmap/roadmap-component.ts:95`

**Problem:** Markdown generowany przez AI renderowany jest jako HTML bez sanitizacji:

```typescript
// roadmap-component.ts:95
this.sanitizer.bypassSecurityTrustHtml(marked.parse(task.description))
```

**Wpływ:** Jeśli AI zwróci złośliwy HTML (np. `<script>` tagi), zostanie wykonany w przeglądarce użytkownika — kradzież tokenów, sesji, danych.

**Rekomendacja:** Użyć biblioteki do sanitizacji HTML (np. `DOMPurify`) przed `bypassSecurityTrustHtml`:

```typescript
import DOMPurify from 'dompurify';
this.sanitizer.bypassSecurityTrustHtml(DOMPurify.sanitize(marked.parse(task.description)))
```

---

## 🟠 HIGH (7)

### 6. Cookies bez secure flag

**Plik:** `backend/src/auth/auth.controller.ts:42`

**Problem:** Refresh token zapisywany w cookie z `secure: false`:

```typescript
// auth.controller.ts:42
res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 3 * 24 * 60 * 60 * 1000 });
```

**Wpływ:** Cookie przesyłane przez HTTP bez szyfrowania — atakujący na sieci może przechwycić refresh token i uzyskać dostęp do konta.

**Rekomendacja:** Użyć `secure: true` i wymusić HTTPS, przynajmniej w produkcji.

---

### 7. Timing attack przy porównywaniu haseł

**Plik:** `backend/src/auth/auth.service.ts:35`

**Problem:** Hasło porównywane przez `===` zamiast bezpiecznej funkcji porównania:

```typescript
// auth.service.ts:35
if (user.password !== hashedPassword) { ... }
```

**Wpływ:** Atakujący może na podstawie czasu odpowiedzi zgadywać hasło znak po znaku.

**Rekomendacja:** Użyć `bcrypt.compare()` zamiast ręcznego porównania.

---

### 8. Brak walidacji DTO na agentPayload

**Plik:** `backend/src/dto/agentPayload.dto.ts`

**Problem:** DTO tylko sprawdza `IsString()`, bez limitu długości na poziomie DTO — limit 2000 znaków jest tylko w serwisie:

```typescript
// agentPayload.dto.ts
export class AgentPayloadDto {
  @IsString()
  prompt: string;
}
```

**Wpływ:** Atakujący może wysłać bardzo długi prompt, który ominie walidację DTO i zostanie ograniczony dopiero w serwisie — potencjalny DoS.

**Rekomendacja:** Dodać `@MaxLength(2000)` do DTO.

---

### 9. Rate limiting tylko w pamięci

**Plik:** `backend/src/ai/aiAgent.service.ts:30-35`

**Problem:** Rate limiting oparty na `Map` w pamięci — restart procesu resetuje limity, a przy wielu instancjach każda ma własny counter:

```typescript
// aiAgent.service.ts:30-35
private requestCounters = new Map<string, { count: number; resetAt: number }>();
private inFlightByUser = new Map<string, number>();
```

**Wpływ:** Atakujący może obejść limity po restarcie serwera lub przy użyciu wielu instancji.

**Rekomendacja:** Użyć Redis do przechowywania counterów rate limiting.

---

### 10. Open redirect w Google OAuth

**Plik:** `backend/src/auth/auth.controller.ts:65`

**Problem:** Redirect po OAuth używa zmiennej `FRONTEND_URL` bez walidacji — jeśli zmienna jest źle skonfigurowana, token może trafić do innej domeny.

**Wpływ:** Token JWT może zostać przekierowany do złośliwej domeny.

**Rekomendacja:** Walidować `FRONTEND_URL` na białą listę dozwolonych domen.

---

### 11. MongoDB URI z hasłem w logach

**Plik:** `backend/src/ai/aiAgent.service.ts:39`

**Problem:** URI MongoDB z hasłem może trafić do logów:

```typescript
// aiAgent.service.ts:39
const mongoUri = process.env.MANGO_URL;
```

**Wpływ:** Jeśli URI zostanie zalogowany, atakujący uzyskuje dostęp do MongoDB.

**Rekomendacja:** Nigdy nie logować `mongoUri` — maskować hasło w logach.

---

### 12. Brak unique constraint na userId w surveys

**Plik:** `backend/src/entities/Surveys.entity.ts`

**Problem:** Brak unikalnego constraintu na `userId` — użytkownik może podać inną `userId` i uzyskać dostęp do ankiet innego użytkownika.

**Wpływ:** Wyciek danych ankiet innych użytkowników.

**Rekomendacja:** Dodać walidację, że `userId` z requestu odpowiada zalogowanemu użytkownikowi.

---

## 🟡 MEDIUM (4)

### 13. console.log w produkcji

**Pliki:** `auth.service.ts`, `aiAgent.service.ts`, `experience-handler.service.ts`

**Problem:** Wiele `console.log` w kodzie produkcyjnym — mogą wyciekać dane użytkowników, tokeny, URI baz danych.

**Rekomendacja:** Użyć loggera z poziomami logowania i wyłączyć debug w produkcji.

---

### 14. SSE bez autoryzacji

**Plik:** `backend/src/ai/ai.controller.ts`

**Problem:** `/ai/roadmap` używa SSE i nie wymaga JWT — każdy może streamować roadmapy.

**Wpływ:** Nieautoryzowany dostęp do generowania roadmap przez AI.

**Rekomendacja:** Dodać `@UseGuards(AuthGuard)` do endpointu.

---

### 15. Typ `any` w gridState

**Plik:** `frontend/src/app/pages/roadmap/roadmap-component.ts`

**Problem:** Stan siatki hexagonalnej używa typu `any` — brak typów TypeScript dla struktury danych.

**Wpływ:** Brak安全检查 typów w czasie kompilacji — potencjalne błędy w czasie wykonania.

**Rekomendacja:** Zdefiniować interfejsy TypeScript dla gridState, hexagon, task itp.

---

### 16. Brak walidacji promptu w agentPayload

**Plik:** `backend/src/ai/aiAgent.service.ts:115-170`

**Problem:** System prompt agenta jest bardzo długi i zawiera dane użytkownika — brak sanitizacji promptu przed wysłaniem do AI.

**Wpływ:** Prompt injection — użytkownik może wstrzyknąć złośliwe instrukcje do promptu agenta.

**Rekomendacja:** Sanitizować prompt użytkownika przed połączeniem z system promptem.

---

## Priorytety napraw

### Natychmiastowe (Critical)
1. JWT w URL — zmienić na session-based flow
2. Hard-coded JWT_SECRET — wymusić ustawienie zmiennej
3. synchronize: true — wyłączyć w produkcji
4. Publiczne endpointy AI — dodać autoryzację
5. XSS — dodać sanitizację HTML

### Krótkoterminowe (High)
1. Cookies bez secure flag — włączyć HTTPS
2. Timing attack — użyć bcrypt.compare
3. Brak walidacji DTO — dodać MaxLength
4. Rate limiting w pamięci — użyć Redis
5. Open redirect — biała lista domen
6. MongoDB URI w logach — maskować hasło
7. Brak unique constraint — dodać walidację userId

### Średnioterminowe (Medium)
1. console.log — użyć loggera
2. SSE bez autoryzacji — dodać guard
3. Typ any — zdefiniować interfejsy
4. Prompt injection — sanitizować prompty

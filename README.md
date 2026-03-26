
## Informacje na temat commita potem usunąć ##

Narazie wstępna implementacja SSE (takie troszke żeby zobaczyć jak to działa) jest to kombinacja Websocketa i zwykłego starego podejścia jak widać generuje szybciutko i wydaje się działać fajnie jak to ogarnąć pod względem css i wygladu i potem integracji z expem i bazami danych to jeszcze się zastanowimy

Pamiętać o placeholder w welcome_screen.ts (ustawiłem to żeby przechodzić bez auth do mojej sekcji)

## Stare info ##

Znowu odpaliłem tylko baze danych z dockera reszta rzeczy na moim komputerze, pominąłem też auth więc niby powinno wszystko działać ale mam nadzieje że auth niczego nie popsuje (jakby co postaram się naprawić), usunąłem gemini-api folder bo go nie używamy po prostu tylko folder ai też wiekszosc zmian w folderze ai i prompt component na frontendzie wiec konfliktów powinno być mało

## General info (zostawić) ##

Chłopaki tak  na poczatku docker compose , musi miec docker desktop oraz sugureuje miec node.js
wpisujecie docker compose up --build 
a pozniej zeby nie miec bledow w vs 
cd backend && npm install
cd ../frontend && npm install


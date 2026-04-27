import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, InternalServerErrorException, ServiceUnavailableException, MessageEvent } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { SurveyDto } from 'src/dto/survey.dto';
import { SurveysEntity } from 'src/entities/Surveys.entity';
import { Repository } from 'typeorm/repository/Repository.js';


// pamietac o npm install @google/generative-ai
@Injectable()
export class AiService {
  constructor(
    @InjectRepository(SurveysEntity) private surveysRepository: Repository<SurveysEntity>
  ) { }
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  private readonly DEFAULT_MODEL = 'gemini-2.5-flash-lite';

  async getGeminiResponse(userPrompt: string) {

    const prompt = `Student szuka pomocy z wybraniem swojej ścieżki kariery. Oto opis jego zainteresowań: "${userPrompt}". Proszę, zaproponuj mu 3 możliwe ścieżki kariery, które pasują do jego zainteresowań i umiejętności. Każda ścieżka powinna zawierać krótki opis oraz przykładowe stanowiska pracy. 
    Odpowiedź powinna być w formacie JSON, gdzie kluczami będą nazwy ścieżek kariery, a wartościami będą obiekty
     z opisem i przykładami stanowisk.
     Przykładowa odpowiedź:
     {
       "Data Science": { 
         "description": "Ścieżka kariery związana z analizą danych, statystyką i uczeniem maszynowym.",
         "examples": ["Data Analyst", "Data Scientist", "Machine Learning Engineer"]
         },
         "Web Development": {
            "description": "Ścieżka kariery związana z tworzeniem stron internetowych i aplikacji webowych.",
            "examples": ["Frontend Developer", "Backend Developer", "Full Stack Developer"]
            }, 
            "Cybersecurity": {
              "description": "Ścieżka kariery związana z ochroną systemów komputerowych i sieci przed cyberatakami.",
              "examples": ["Cybersecurity Analyst", "Penetration Tester", "Security Engineer"]
              }`    ;

    const model = this.genAI.getGenerativeModel({
      model: this.DEFAULT_MODEL,
      generationConfig: {
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
      }
    });

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const jsonObject = JSON.parse(text);
      return jsonObject;

    } catch (error) {
      console.error("Błąd podczas parsowania JSON od AI:", error);
      throw new InternalServerErrorException("Błąd podczas przetwarzania danych od AI.");
    }

  }
  // funkcja do pobierania 10 nowych elementów roadmapy
  // level odnosi się do poziomu progresu nie levelu konkretnego uzytkownika (cos co moze byc w przyszłości)
  async getRoadmapConcepts(careerPath: string, level: number = 1, excludeTopics: string[] = []) {
    const prompt = `Zwróć dokładnie 10 etapów nauki/tematów na ścieżce kariery "${careerPath}".
    Poziom zaawansowania (od 1 do 10, gdzie 1 to fundamenty, a 10 to ekspert): ${level}/10.
    
    WAŻNE: Nie powtarzaj tematów. Musisz pominąć i omijać następujące tematy, które już zostały wygenerowane: ${excludeTopics.join(', ') || 'brak'}. 
    
    Odpowiedź MUSI być w poprawnym formacie JSON, pod kluczem "concepts" ma znaleźć się tablica obiektów:
    {
      "concepts": [
        {
          "title": "Krótki Tytuł Tematu",
          "description": "Zwięzła pigułka wiedzy wygenerowana przez AI (2-3 zdania)."
        }
      ]
    }`;

    const model = this.genAI.getGenerativeModel({
      model: this.DEFAULT_MODEL,
      generationConfig: {
        maxOutputTokens: 6000,
        responseMimeType: "application/json",
      }
    });

    try {
      const result = await model.generateContent(prompt);
      let text = result.response.text();

      // Czyszczenie ewentualnego formatowania markdown (```json ... ```) z odpowiedzi
      text = text.replace(/```json\n?|```\n?/g, '').trim();

      const jsonObject = JSON.parse(text);
      return jsonObject.concepts || [];
    } catch (error: any) {
      console.error("Błąd podczas parsowania JSON dla Roadmap Concepts:", error);
      if (error?.status === 503 || error?.message?.includes('503')) {
        throw new ServiceUnavailableException("Serwery Google Gemini są aktualnie przeciążone.");
      }
      throw new ServiceUnavailableException("Błąd podczas generowania konceptów roadmapy (API AI niedostępne).");
    }
  }

  getRoadmapStream(careerPath: string): Observable<MessageEvent> {
    const model = this.genAI.getGenerativeModel({
      model: this.DEFAULT_MODEL,
      generationConfig: {
        maxOutputTokens: 2000,
        responseMimeType: "text/plain",
      }
    });

    return new Observable((subscriber) => {
      (async () => {
        try {
          const prompt = `Stwórz szczegółową roadmapę nauki dla ścieżki: ${careerPath}. Zwróć to w czytelnym formacie (użyj Markdown: pogrubienia, listy). Nie używaj formatu JSON.`;

          const result = await model.generateContentStream(prompt);

          // wysyłanie tokenów "na żywo" z gemini do angulara przez SSE
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            subscriber.next({ data: { chunk: chunkText } });
          }
          subscriber.complete();
        } catch (error) {
          console.error("Błąd streamingu w NestJS:", error);
          subscriber.error(error);
        }
      })();
    });
  }


  async sendSurveyData(userId: string, surveyData: SurveyDto) {
    const existingSurveys = await this.getUserSurveys(userId);
    const normalize = (val: any) => String(val || "").trim().toLowerCase();

    const duplicate = existingSurveys.find(s => {
      const sSkills = Array.isArray(s.skills) ? [...s.skills].sort() : [];
      const dSkills = Array.isArray(surveyData.skills) ? [...surveyData.skills].sort() : [];
      
      return (
        normalize(s.Major) === normalize(surveyData.Major) &&
        Number(s.YearOfStudy || 0) === Number(surveyData.YearOfStudy || 0) &&
        normalize(s.PreferredInternshipType) === normalize(surveyData.PreferredInternshipType) &&
        Number(s.TimeLeft || 0) === Number(surveyData.TimeLeft || 0) &&
        normalize(s.Inrest) === normalize(surveyData.Inrest) &&
        normalize(s.Expierience) === normalize(surveyData.Expierience) &&
        JSON.stringify(sSkills) === JSON.stringify(dSkills) &&
        normalize(s.AbilitiesLevel) === normalize(surveyData.AbilitiesLevel) &&
        normalize(s.SideProjectsHobby) === normalize(surveyData.SideProjectsHobby) &&
        normalize(s.Strengths) === normalize(surveyData.Strengths) &&
        normalize(s.Weaknesses) === normalize(surveyData.Weaknesses) &&
        normalize(s.University) === normalize(surveyData.University) &&
        Number(s.GraduationYear || 0) === Number(surveyData.GraduationYear || 0)
      );
    });

    if (duplicate) {
      duplicate.createdAt = new Date();
      await this.surveysRepository.save(duplicate);
      return { isDuplicate: true, id: duplicate.id };
    }

    const surveyEntity = this.surveysRepository.create({
      ...surveyData,
      userId,
      createdAt: new Date()
    });
    const saved = await this.surveysRepository.save(surveyEntity);
    return { isDuplicate: false, id: saved.id };
  }
  async getUserSurveys(userId: string) {
    return this.surveysRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  async deleteUserSurvey(id: number, userId: string) {
    return this.surveysRepository.delete({ id, userId });
  }

  async verifyOpenTask(challenge: string, userAnswer: string) {
    const prompt = `Jesteś sędzią sprawdzającym odpowiedź na zadanie koncepcyjne/programistyczne ucznia.
    Polecenie: "${challenge}"
    Rozwiązanie ucznia: "${userAnswer}"
    
    Oceń powierzchownie i pobłażliwie, czy uczeń mniej więcej dobrze zrozumiał działanie zagadnienia. Zależy Ci na zachęcaniu do nauki, nie dyskwalifikuj za drobne uchybienia.
    UWAGA: Preferujemy zwięzłe odpowiedzi (ok. 200 znaków), więc nie obniżaj punktacji za brak rozbudowanych opisów, jeśli sedno jest poprawne.
    
    Zwróć JSON:
    {
      "score": 0 | 1 | 2,
      "feedback": "Krótki argument i ewentualna poprawka"
    }
    
    Skala punktacji:
    0 - błędna odpowiedź lub brak związku z tematem.
    1 - poprawny kierunek, ale z błędami lub niepełna.
    2 - bardzo dobra i pełna odpowiedź.`;

    const model = this.genAI.getGenerativeModel({
      model: this.DEFAULT_MODEL,
      generationConfig: {
        maxOutputTokens: 600,
        responseMimeType: "application/json",
      }
    });

    try {
      const result = await model.generateContent(prompt);
      let text = result.response.text();
      text = text.replace(/```json\n?|```\n?/g, '').trim();
      const jsonObj = JSON.parse(text);
      return {
        score: jsonObj.score ?? 0,
        feedback: jsonObj.feedback || "Brak informacji od AI."
      };
    } catch (error) {
      console.error("Błąd podczas weryfikacji zadania otwartego:", error);
      return { score: 0, feedback: "Wystąpił błąd podczas sędziowania AI." };
    }
  }

  async generateTasksForTopic(topic: string, difficulty: string) {
    let specificRequirements = '';

    if (difficulty === 'Łatwy') {
      specificRequirements = `Wygeneruj dokładnie TRZY zadania ZAMKNIĘTE (multiple choice). 
      Zadania powinny mieć rosnący poziom trudności (1. bardzo łatwe, 2. średnie, 3. nieco trudniejsze).
      Nie generuj żadnych zadań otwartych.`;
    } else if (difficulty === 'Średni') {
      specificRequirements = `Wygeneruj dokładnie TRZY zadania OTWARTE.
      Dwa z nich powinny być proste/podstawowe, a jedno o średnim stopniu trudności.
      Wymagaj krótkich odpowiedzi (do 200 znaków). Nie generuj żadnych zadań zamkniętych.`;
    } else {
      specificRequirements = `Wygeneruj dokładnie JEDNO zadanie OTWARTE o WYSOKIM poziomie trudności.
      Powinno to być wyzwanie programistyczne, analiza pseudokodu lub trudny problem logiczny.
      Zadanie musi być wymagające, ale możliwe do rozwiązania zwięźle (odpowiedź do 200 znaków). 
      Nie przesadzaj z poziomem trudności - ma to być wyzwanie, nie bariera nie do przejścia. 
      Nie generuj żadnych zadań zamkniętych.`;
    }

    const prompt = `Jesteś mentorem w dziedzinie IT. 
    Twoim zadaniem jest wygenerować zadania ŚCIŚLE związane z tematem: "${topic}". 
    Poziom trudności zadania (Łatwy/Średni/Trudny): ${difficulty}.
    
    Wymagania dla poziomu ${difficulty}:
    ${specificRequirements}
    
    WAŻNE ZASADY:
    1. Zadanie MUSI dotyczyć tylko i wyłącznie tematu "${topic}". Jeśli temat to np. "Git", nie generuj zadań z algorytmiki C++.
    2. Jeśli poziom jest "Trudny", wymyśl zaawansowany problem wewnątrz tematu "${topic}" (np. skomplikowany merge conflict lub optymalizacja workflow), a nie losowe zadanie programistyczne.
    
    ZWRÓĆ TYLKO I WYŁĄCZNIE STRUKTURĘ JSON PODANĄ NIŻEJ BEZ ŻADNYCH INNYCH SŁÓW:
    {
      "closedTasks": [
        { "question": "?", "options": ["Odp A", "Odp B", "Odp C", "Odp D"], "correctAnswer": 0 }
      ],
      "openTasks": [
        { "challenge": "Praktyczne polecenie związane z ${topic}" }
      ]
    }
    
    UWAGA: Jeśli dany typ zadań nie jest wymagany dla tego poziomu, zwróć pustą tablicę [].`;

    const model = this.genAI.getGenerativeModel({
      model: this.DEFAULT_MODEL,
      generationConfig: {
        maxOutputTokens: 5000,
        responseMimeType: "application/json",
      }
    });

    try {
      const result = await model.generateContent(prompt);
      let text = result.response.text();
      text = text.replace(/```json\n?|```\n?/g, '').trim();
      return JSON.parse(text);
    } catch (error: any) {
      console.error("Błąd ładowania zadań dynamicznych:", error);
      if (error?.status === 503 || error?.message?.includes('503')) {
        throw new ServiceUnavailableException("AI przeciążone.");
      }
      throw new InternalServerErrorException("Nie udało się pobrać zadań dla tego poziomu.");
    }
  }
}

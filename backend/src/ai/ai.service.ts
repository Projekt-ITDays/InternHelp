import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, InternalServerErrorException, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';

// pamietac o npm install @google/generative-ai
@Injectable()
export class AiService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
        // tańszy model
        model: "gemini-2.5-flash-lite",
        // model: "gemini-2.5-flash",
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

  getRoadmapStream(careerPath: string): Observable<MessageEvent> {
    const model = this.genAI.getGenerativeModel({
      // tańszy model 
      model: "gemini-2.5-flash-lite",
      // model: "gemini-2.5-flash",
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
}

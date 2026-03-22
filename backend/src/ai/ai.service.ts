import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

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
        model: "gemini-2.5-flash-lite",
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

    // stary approach
    // let result = await model.generateContent(prompt);

    // let text = await result.response.text();
    
    // text = text.slice(8, -3); // Usuwamy "```json" z początku i "```" z końca

    //return text;
  }
}

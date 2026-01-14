import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const getMotivation = async (days: number, goal: number): Promise<string> => {
  if (!ai) {
    return "Keep going! The beginning is always the hardest.";
  }

  try {
    const prompt = `
      I am tracking my abstinence streak. I am currently on day ${days}. My goal is ${goal} days.
      Give me a single, powerful, stoic, short sentence of motivation to keep me disciplined. 
      Do not be preachy. Be strong and direct.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }, // Disable thinking for speed
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return "Stay strong.";
    
    const data = JSON.parse(jsonText);
    return data.message || "Discipline is freedom.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Focus on the path, not the obstacle.";
  }
};

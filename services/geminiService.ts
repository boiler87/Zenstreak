
import { GoogleGenAI, Type } from "@google/genai";
import { SOURCE_MATERIAL } from "./knowledgeBase";

let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getMotivation = async (days: number, goal: number): Promise<string> => {
  if (!ai) {
    return "Cum denial is power.";
  }

  try {
    // Tailor context based on streak length (Phases of Denial)
    let context = "";
    if (days <= 3) {
      context = "Phase: Default/Voluntary. The user may still be used to the 'ejaculatory imperative'. Encourage them that the goal of stroking is NOT to cum.";
    } else if (days <= 14) {
      context = "Phase: Optional/Experimentation. The user is feeling the intense horniness and 'chaser effect'. Frame this frustration as 'intensity' and 'power' to be enjoyed, not fixed.";
    } else if (days <= 30) {
      context = "Phase: Exclusionary. The user is actively excluding orgasm to build energy. Remind them that the 'brake and gas pedal' are both mashed to the floor.";
    } else {
      context = "Phase: Transcendent. The user is rewiring their mind. Orgasm is no longer the goal; the state of high charge is the goal.";
    }

    const prompt = `
      You are a mentor in the practice of 'Extreme Edging' and 'Extended Cum Denial'.
      
      User Stats:
      - Days without Orgasm: ${days}
      - Goal: ${goal} days
      - Context: ${context}

      REFERENCE MATERIAL (Use this specific philosophy):
      """
      ${SOURCE_MATERIAL}
      """

      Task: Generate a SINGLE, powerful, short sentence of motivation. 
      
      Guidelines:
      - Use the specific philosophy from the Reference Material (Cum Denial is Power, Intensifying the Cock, The Zone).
      - Do NOT be puritanical or advocate for 'monk-like' celibacy. 
      - Advocate for *active* sexual energy and intensity, but *denying* the release.
      - Contrast 'The Pain of Discipline' with the 'Pleasure of Intensity'.
      - Refer to the urge to cum as a demand to be overruled for greater power.
    `;

    // Retry logic for transient errors (503, Deadline Exceeded)
    let lastError;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            thinkingConfig: { thinkingBudget: 0 },
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
        if (!jsonText) return "Deny the release to intensify the power.";
        
        const data = JSON.parse(jsonText);
        return data.message || "The goal is not to cum, but to ride the edge.";

      } catch (e: any) {
        lastError = e;
        
        // Check for 503 Service Unavailable, 504 Gateway Timeout, or "Deadline expired"
        const isTransientError = 
          e.status === 503 || 
          e.code === 503 || 
          e.status === 504 || 
          (e.message && (e.message.includes("Deadline expired") || e.message.includes("UNAVAILABLE")));

        if (isTransientError && attempt < maxRetries - 1) {
          console.warn(`Gemini API attempt ${attempt + 1} failed. Retrying...`, e.message);
          // Exponential backoff: 1000ms, 2000ms, 4000ms
          await wait(1000 * Math.pow(2, attempt));
          continue;
        }
        
        // If not transient or last attempt, throw
        throw e;
      }
    }
    throw lastError;

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback message in case of total failure
    return "Keep the energy high, deny the release.";
  }
};

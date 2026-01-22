
import { GoogleGenAI, Type } from "@google/genai";
import { SOURCE_MATERIAL } from "./knowledgeBase";
import { StreakHistoryItem, ForecastResponse } from "../types";

/**
 * Generates motivation using the Gemini API based on the user's current streak and goal.
 */
export const getMotivation = async (days: number, goal: number): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key is missing. AI features disabled.");
    return "Cum denial is power. (AI Unavailable)";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: {
              type: Type.STRING,
              description: 'The generated motivation sentence.',
            }
          },
          propertyOrdering: ["message"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return "Deny the release to intensify the power.";
    
    const data = JSON.parse(jsonText.trim());
    return data.message || "The goal is not to cum, but to ride the edge.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Keep the energy high, deny the release.";
  }
};

/**
 * Predicts streak success and provides pattern analysis.
 */
export const getStreakForecast = async (history: StreakHistoryItem[], currentDays: number, goal: number): Promise<ForecastResponse> => {
  const defaultResponse: ForecastResponse = {
    prediction: "Maintain your discipline to reach the goal.",
    confidenceLevel: "Medium",
    insight: "Consistency creates the rewiring."
  };

  if (!process.env.API_KEY) return defaultResponse;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Calculate Stats
    const totalEntries = history.length;
    const totalDays = history.reduce((acc, curr) => acc + curr.days, 0);
    const avgStreak = totalEntries > 0 ? (totalDays / totalEntries).toFixed(1) : "0";
    const maxStreak = Math.max(...history.map(h => h.days), 0);
    // Sort desc by date
    const sortedHistory = [...history].sort((a,b) => b.endDate - a.endDate);
    const last3 = sortedHistory.slice(0, 3).map(h => `${h.days} days`).join(", ");

    const prompt = `
      You are a data-driven coach specializing in 'extended cum denial'. Analyze the user's performance.

      Current Context:
      - Current Streak: ${currentDays} days
      - Target Goal: ${goal} days
      - Personal Best: ${maxStreak} days
      - Average Streak: ${avgStreak} days
      - Recent Performance (Last 3): ${last3 || "None"}

      Task: Provide a structured forecast.
      
      Guidelines:
      - 'prediction': A direct statement (max 15 words) on whether they will hit their goal based on momentum.
      - 'confidenceLevel': 'High', 'Medium', or 'Low' based on past consistency vs current goal.
      - 'insight': A specific pattern recognition or tactical advice (max 15 words) derived from the data.
      - Tone: Clinical, intense, encouraging but realistic.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prediction: { type: Type.STRING },
            confidenceLevel: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            insight: { type: Type.STRING }
          },
          required: ["prediction", "confidenceLevel", "insight"],
          propertyOrdering: ["prediction", "confidenceLevel", "insight"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return defaultResponse;

    const data = JSON.parse(jsonText.trim()) as ForecastResponse;
    return data;
  } catch (error) {
    console.error("Gemini Forecast Error:", error);
    return defaultResponse;
  }
};

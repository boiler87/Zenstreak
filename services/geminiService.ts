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

    // Determine phase based on Source Material definitions
    let context = "";
    if (days <= 3) {
      context = "Phase: Default/Voluntary. The user is just starting. The goal is NOT to cum.";
    } else if (days <= 14) {
      context = "Phase: Optional. The user feels the intense horniness. Frame this as 'intensity' to be enjoyed.";
    } else if (days <= 30) {
      context = "Phase: Exclusionary. Actively excluding orgasm. 'Brake and gas pedal both mashed to the floor'.";
    } else {
      context = "Phase: Transcendent. Orgasm is no longer the goal. The state of high charge is the goal.";
    }

    // Dynamic Context to force variety
    const metaphors = [
        "building a mental fortress", 
        "forging steel in fire", 
        "holding back the ocean tide", 
        "climbing a steep mountain", 
        "accumulating massive electrical potential", 
        "charging a high-capacity battery",
        "taming a wild beast within", 
        "ancient stoic endurance", 
        "biohacking the nervous system",
        "withstanding deep sea pressure", 
        "orbital mechanics and gravity", 
        "containing volcanic pressure",
        "tuning a high-performance engine",
        "sharpening a blade to a razor edge",
        "pulling back a heavy bowstring"
    ];
    const randomMetaphor = metaphors[Math.floor(Math.random() * metaphors.length)];

    const prompt = `
      You are the author of the REFERENCE MATERIAL below. You are intense, direct, and obsessed with the power of 'Extended Cum Denial'.
      
      REFERENCE MATERIAL (Your Philosophy):
      """
      ${SOURCE_MATERIAL}
      """

      SITUATION:
      - User Streak: ${days} days
      - Goal: ${goal} days
      - Phase: ${context}
      - Metaphor to use: ${randomMetaphor}

      TASK:
      Generate a SINGLE, powerful, short sentence of motivation (max 20 words).

      STRICT GUIDELINES:
      1. USE YOUR VOICE: Speak like the author of the text. Use terms like "intensity", "power", "lustful", "voltage", "The Zone", "rewiring". 
      2. REJECT GENERIC ADVICE: Do not sound like a generic life coach. Do not say "you can do it".
      3. PHILOSOPHY: Remind the user that the urge to cum is a demand to be overruled for greater power. 
      4. METAPHOR: Weave the assigned metaphor (${randomMetaphor}) into the author's specific philosophy of 'intensity over release'.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 1.3, // Very High creativity to mix the specific philosophy with random metaphors
        topP: 0.95,
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
    
    const totalEntries = history.length;
    const totalDays = history.reduce((acc, curr) => acc + curr.days, 0);
    const avgStreak = totalEntries > 0 ? (totalDays / totalEntries).toFixed(1) : "0";
    const maxStreak = Math.max(...history.map(h => h.days), 0);
    const sortedHistory = [...history].sort((a,b) => b.endDate - a.endDate);
    const last3 = sortedHistory.slice(0, 3).map(h => `${h.days} days`).join(", ");

    const prompt = `
      You are the author of the text below. Analyze the user's data using your philosophy.

      REFERENCE MATERIAL:
      """
      ${SOURCE_MATERIAL}
      """

      User Data:
      - Current Streak: ${currentDays} days
      - Goal: ${goal} days
      - Best: ${maxStreak} days
      - Avg: ${avgStreak} days
      - Recent: ${last3 || "None"}

      Task: Provide a structured forecast.
      
      Guidelines:
      - prediction: Direct statement (max 15 words).
      - confidenceLevel: 'High', 'Medium', or 'Low'.
      - insight: A short piece of tactical advice (max 15 words). MUST USE VOCABULARY FROM THE REFERENCE MATERIAL (e.g. "rewiring", "mashed pedals", "intensity", "muscle control", "The Zone").
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 1.1, 
        topP: 0.95,
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
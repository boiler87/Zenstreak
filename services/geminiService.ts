
import { GoogleGenAI, Type } from "@google/genai";
import { SOURCE_MATERIAL } from "./knowledgeBase";
import { StreakHistoryItem, ForecastResponse, CelebrationResponse } from "../types";

// Fix: Removed FALLBACK_KEY and getApiKey helper. Guidelines require exclusive use of process.env.API_KEY.

export const getMotivation = async (days: number, goal: number, whyStatement?: string): Promise<string> => {
  try {
    // Fix: Initialize GoogleGenAI directly with process.env.API_KEY in the function scope
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const personalContext = whyStatement ? `THE USER'S PERSONAL INTENT (THE "WHY"): "${whyStatement}"` : "";
    const prompt = `
      You are an intense growth mentor based on the philosophy in the SOURCE MATERIAL.
      MATERIAL: ${SOURCE_MATERIAL}
      USER STATUS: Day ${days} of ${goal}. 
      ${personalContext}

      TASK:
      Generate 1 powerful, short motivational sentence (max 15 words). 
      IMPORTANT: If the user provided their personal intent, incorporate its themes to make it hyper-personal.
      Avoid all metaphors to electricity, grids, voltage, or wiring. Use general terms like 'focus', 'mastery', 'discipline', 'intensity', 'clarity', and 'growth'.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { message: { type: Type.STRING } },
          required: ["message"]
        }
      }
    });
    // Fix: response.text is a property, not a method. Using it directly.
    const jsonStr = response.text || "{}";
    return JSON.parse(jsonStr).message || "Focus on the growth that comes from discipline.";
  } catch (e) { 
    console.error("Gemini Motivation Error:", e);
    return "True strength is found in discipline."; 
  }
};

export const getStreakForecast = async (history: StreakHistoryItem[], currentDays: number, goal: number, whyStatement?: string): Promise<ForecastResponse> => {
  try {
    // Fix: Initialize GoogleGenAI directly with process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const personalContext = whyStatement ? `THE USER'S CORE INTENT: "${whyStatement}"` : "";
    const prompt = `
      Analyze this user's progress and provide a forecast based on the philosophy in the SOURCE MATERIAL: ${SOURCE_MATERIAL}. 
      Current Progress: ${currentDays} days, Goal: ${goal} days.
      ${personalContext}
      
      IMPORTANT: Use the Core Intent to tailor the advice. Do not use electrical, grid, or wiring metaphors. Use terms related to psychological resilience and personal mastery.
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
          required: ["prediction", "confidenceLevel", "insight"]
        }
      }
    });
    // Fix: accessing text as a property
    return JSON.parse(response.text || "{}") as ForecastResponse;
  } catch (e) { 
    console.error("Gemini Forecast Error:", e);
    return { prediction: "System stable.", confidenceLevel: "Medium", insight: "Stay committed to the path." }; 
  }
};

export const getMilestoneCelebration = async (milestoneName: string, days: number, rankName: string): Promise<CelebrationResponse> => {
  try {
    // Fix: Initialize GoogleGenAI directly with process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      The user has reached a major milestone: "${milestoneName}" at ${days} days. 
      Their current rank is "${rankName}".
      
      Based on the philosophy in the SOURCE MATERIAL (${SOURCE_MATERIAL}), write a short, intense celebration message.
      
      TASK:
      1. 'title': A punchy 2-3 word headline.
      2. 'message': A powerful acknowledgment of their discipline (max 25 words).
      3. 'rankInsight': A brief comment on what this rank represents in terms of personal mastery.

      CRITICAL: Use NO electrical, grid, or wiring metaphors. Use terms like 'willpower', 'clarity', 'ascension', 'mastery', and 'focus'.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 1.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            message: { type: Type.STRING },
            rankInsight: { type: Type.STRING }
          },
          required: ["title", "message", "rankInsight"]
        }
      }
    });
    // Fix: accessing text as a property
    return JSON.parse(response.text || "{}") as CelebrationResponse;
  } catch (e) {
    console.error("Gemini Celebration Error:", e);
    return { title: "Strength Found", message: "You have reached a new level of discipline.", rankInsight: "Your path to mastery continues." };
  }
};
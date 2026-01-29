
import { GoogleGenAI, Type } from "@google/genai";
import { SOURCE_MATERIAL } from "./knowledgeBase";
import { StreakHistoryItem, ForecastResponse, CelebrationResponse } from "../types";

const FALLBACK_KEY = "AIzaSyDygmVHR9CQaC-00NZHFcWxQh1Gw6-N0eg";

const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (key && key.length > 0 && key !== 'undefined') {
    return key;
  }
  return FALLBACK_KEY;
};

export const getMotivation = async (days: number, goal: number, whyStatement?: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "Focus on the growth that comes from discipline.";

  try {
    const ai = new GoogleGenAI({ apiKey });
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
        }
      }
    });
    return JSON.parse(response.text).message;
  } catch (e) { return "True strength is found in discipline."; }
};

export const getStreakForecast = async (history: StreakHistoryItem[], currentDays: number, goal: number, whyStatement?: string): Promise<ForecastResponse> => {
  const apiKey = getApiKey();
  if (!apiKey) return { prediction: "Maintain your focus.", confidenceLevel: "Medium", insight: "Growth is a process." };

  try {
    const ai = new GoogleGenAI({ apiKey });
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
    return JSON.parse(response.text);
  } catch (e) { return { prediction: "System stable.", confidenceLevel: "Medium", insight: "Stay committed to the path." }; }
};

export const getMilestoneCelebration = async (milestoneName: string, days: number, rankName: string): Promise<CelebrationResponse> => {
  const apiKey = getApiKey();
  if (!apiKey) return { title: "Milestone Reached", message: "Great job on your progress!", rankInsight: "Your discipline is growing." };

  try {
    const ai = new GoogleGenAI({ apiKey });
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
    return JSON.parse(response.text);
  } catch (e) {
    return { title: "Strength Found", message: "You have reached a new level of discipline.", rankInsight: "Your path to mastery continues." };
  }
};
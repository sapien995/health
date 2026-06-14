import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { PrismaClient } from "@prisma/client";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Prisma Client
  const prisma = new PrismaClient();

  // JSON body parser with limit configuration
  app.use(express.json({ limit: "15mb" }));

  // Initialize Gemini client on the server side
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // User Profile configuration REST endpoints
  app.get("/api/user", async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: "default_user" }
      });
      res.json({ user });
    } catch (error: any) {
      console.error("GET /api/user error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/user", async (req, res) => {
    try {
      const { 
        name, 
        lastPeriodDate, 
        cycleLength, 
        periodLength, 
        onboardingComplete, 
        hasFibroids, 
        isPremiumUnlocked, 
        notificationsEnabled, 
        notificationTime,
        skinType,
        skinTone
      } = req.body;

      const user = await prisma.user.upsert({
        where: { id: "default_user" },
        update: {
          name: name ?? "",
          lastPeriodDate: lastPeriodDate ?? "",
          cycleLength: cycleLength !== undefined ? Number(cycleLength) : 28,
          periodLength: periodLength !== undefined ? Number(periodLength) : 5,
          onboardingComplete: onboardingComplete !== undefined ? Boolean(onboardingComplete) : false,
          hasFibroids: hasFibroids !== undefined ? Boolean(hasFibroids) : false,
          isPremiumUnlocked: isPremiumUnlocked !== undefined ? Boolean(isPremiumUnlocked) : false,
          notificationsEnabled: notificationsEnabled !== undefined ? Boolean(notificationsEnabled) : false,
          notificationTime: notificationTime ?? "20:00",
          skinType: skinType ?? "normal",
          skinTone: skinTone ?? "medium"
        },
        create: {
          id: "default_user",
          name: name ?? "",
          lastPeriodDate: lastPeriodDate ?? "",
          cycleLength: cycleLength !== undefined ? Number(cycleLength) : 28,
          periodLength: periodLength !== undefined ? Number(periodLength) : 5,
          onboardingComplete: onboardingComplete !== undefined ? Boolean(onboardingComplete) : false,
          hasFibroids: hasFibroids !== undefined ? Boolean(hasFibroids) : false,
          isPremiumUnlocked: isPremiumUnlocked !== undefined ? Boolean(isPremiumUnlocked) : false,
          notificationsEnabled: notificationsEnabled !== undefined ? Boolean(notificationsEnabled) : false,
          notificationTime: notificationTime ?? "20:00",
          skinType: skinType ?? "normal",
          skinTone: skinTone ?? "medium"
        }
      });

      res.json({ user });
    } catch (error: any) {
      console.error("POST /api/user error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mood Tracker REST endpoints
  app.get("/api/mood", async (req, res) => {
    try {
      const entries = await prisma.moodEntry.findMany({
        orderBy: { date: "desc" }
      });
      const parsed = entries.map(item => ({
        ...item,
        symptoms: JSON.parse(item.symptoms || "[]")
      }));
      res.json({ entries: parsed });
    } catch (error: any) {
      console.error("GET /api/mood error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/mood", async (req, res) => {
    try {
      const { entries } = req.body;
      if (Array.isArray(entries)) {
        const results = [];
        for (const entry of entries) {
          const item = await prisma.moodEntry.upsert({
            where: { date: entry.date },
            update: {
              mood: entry.mood,
              medication: entry.medication || null,
              symptoms: JSON.stringify(entry.symptoms || []),
              painLevel: entry.painLevel !== undefined ? Number(entry.painLevel) : null
            },
            create: {
              date: entry.date,
              mood: entry.mood,
              medication: entry.medication || null,
              symptoms: JSON.stringify(entry.symptoms || []),
              painLevel: entry.painLevel !== undefined ? Number(entry.painLevel) : null
            }
          });
          results.push(item);
        }
        return res.json({ success: true, count: results.length });
      }

      const { date, mood, medication, symptoms, painLevel } = req.body;
      const entry = await prisma.moodEntry.upsert({
        where: { date },
        update: {
          mood,
          medication: medication || null,
          symptoms: JSON.stringify(symptoms || []),
          painLevel: painLevel !== undefined ? Number(painLevel) : null
        },
        create: {
          date,
          mood,
          medication: medication || null,
          symptoms: JSON.stringify(symptoms || []),
          painLevel: painLevel !== undefined ? Number(painLevel) : null
        }
      });
      res.json({ entry: { ...entry, symptoms: JSON.parse(entry.symptoms) } });
    } catch (error: any) {
      console.error("POST /api/mood error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Fibroid symptoms tracker REST endpoints
  app.get("/api/fibroids", async (req, res) => {
    try {
      const entries = await prisma.fibroidEntry.findMany({
        orderBy: { date: "desc" }
      });
      const parsed = entries.map(item => ({
        ...item,
        symptoms: JSON.parse(item.symptoms || "[]")
      }));
      res.json({ entries: parsed });
    } catch (error: any) {
      console.error("GET /api/fibroids error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/fibroids", async (req, res) => {
    try {
      const { entries } = req.body;
      if (Array.isArray(entries)) {
        const results = [];
        for (const entry of entries) {
          const item = await prisma.fibroidEntry.upsert({
            where: { date: entry.date },
            update: {
              painLevel: Number(entry.painLevel),
              bleedingIntensity: entry.bleedingIntensity,
              symptoms: JSON.stringify(entry.symptoms || []),
              notes: entry.notes || ""
            },
            create: {
              date: entry.date,
              painLevel: Number(entry.painLevel),
              bleedingIntensity: entry.bleedingIntensity,
              symptoms: JSON.stringify(entry.symptoms || []),
              notes: entry.notes || ""
            }
          });
          results.push(item);
        }
        return res.json({ success: true, count: results.length });
      }

      const { date, painLevel, bleedingIntensity, symptoms, notes } = req.body;
      const entry = await prisma.fibroidEntry.upsert({
        where: { date },
        update: {
          painLevel: Number(painLevel),
          bleedingIntensity,
          symptoms: JSON.stringify(symptoms || []),
          notes: notes || ""
        },
        create: {
          date,
          painLevel: Number(painLevel),
          bleedingIntensity,
          symptoms: JSON.stringify(symptoms || []),
          notes: notes || ""
        }
      });
      res.json({ entry: { ...entry, symptoms: JSON.parse(entry.symptoms) } });
    } catch (error: any) {
      console.error("POST /api/fibroids error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Skincare tracking and photo logs endpoints
  app.get("/api/skincare", async (req, res) => {
    try {
      const entries = await prisma.skinDiaryEntry.findMany({
        orderBy: { date: "desc" }
      });
      const parsed = entries.map(item => ({
        ...item,
        routinesCompleted: JSON.parse(item.routinesCompleted || "[]"),
        completedAmSteps: JSON.parse(item.completedAmSteps || "[]"),
        completedPmSteps: JSON.parse(item.completedPmSteps || "[]")
      }));
      res.json({ entries: parsed });
    } catch (error: any) {
      console.error("GET /api/skincare error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/skincare", async (req, res) => {
    try {
      const { entries } = req.body;
      if (Array.isArray(entries)) {
        const results = [];
        for (const entry of entries) {
          const item = await prisma.skinDiaryEntry.upsert({
            where: { date: entry.date },
            update: {
              glowRating: Number(entry.glowRating),
              routinesCompleted: JSON.stringify(entry.routinesCompleted || []),
              completedAmSteps: JSON.stringify(entry.completedAmSteps || []),
              completedPmSteps: JSON.stringify(entry.completedPmSteps || []),
              breakoutLevel: entry.breakoutLevel,
              notes: entry.notes || "",
              photo: entry.photo || null
            },
            create: {
              date: entry.date,
              glowRating: Number(entry.glowRating),
              routinesCompleted: JSON.stringify(entry.routinesCompleted || []),
              completedAmSteps: JSON.stringify(entry.completedAmSteps || []),
              completedPmSteps: JSON.stringify(entry.completedPmSteps || []),
              breakoutLevel: entry.breakoutLevel,
              notes: entry.notes || "",
              photo: entry.photo || null
            }
          });
          results.push(item);
        }
        return res.json({ success: true, count: results.length });
      }

      const { date, glowRating, routinesCompleted, completedAmSteps, completedPmSteps, breakoutLevel, notes, photo } = req.body;
      const entry = await prisma.skinDiaryEntry.upsert({
        where: { date: date },
        update: {
          glowRating: Number(glowRating),
          routinesCompleted: JSON.stringify(routinesCompleted || []),
          completedAmSteps: JSON.stringify(completedAmSteps || []),
          completedPmSteps: JSON.stringify(completedPmSteps || []),
          breakoutLevel,
          notes: notes || "",
          photo: photo || null
        },
        create: {
          date: date,
          glowRating: Number(glowRating),
          routinesCompleted: JSON.stringify(routinesCompleted || []),
          completedAmSteps: JSON.stringify(completedAmSteps || []),
          completedPmSteps: JSON.stringify(completedPmSteps || []),
          breakoutLevel,
          notes: notes || "",
          photo: photo || null
        }
      });

      res.json({ 
        entry: { 
          ...entry, 
          routinesCompleted: JSON.parse(entry.routinesCompleted),
          completedAmSteps: JSON.parse(entry.completedAmSteps || "[]"),
          completedPmSteps: JSON.parse(entry.completedPmSteps || "[]")
        } 
      });
    } catch (error: any) {
      console.error("POST /api/skincare error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/skincare/:date", async (req, res) => {
    try {
      const { date } = req.params;
      await prisma.skinDiaryEntry.delete({
        where: { date }
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("DELETE /api/skincare error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Secure API endpoint for recovery support AI advice
  app.post("/api/get-ai-advice", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string" || !query.trim()) {
        return res.status(400).json({ error: "Query is required" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: query,
        config: {
          systemInstruction: "You are a compassionate and supportive recovery assistant for LunaCare, an app focused on reproductive health and abortion recovery. Provide gentle, evidence-based self-care tips, emotional support, and meal suggestions based on the user's concerns. Always include a disclaimer that you are an AI and they should consult a medical professional for clinical advice. Keep responses concise, warm, and formatted in clean markdown.",
        },
      });

      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("AI Advice backend error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI advice" });
    }
  });

  // Secure cycle and symptom historical log analyzer with personalized prediction schemas
  app.post("/api/cycle-insights", async (req, res) => {
    try {
      const { userData, moodEntries, fibroidEntries } = req.body;

      if (!userData) {
        return res.status(400).json({ error: "userData is required" });
      }

      // Build a comprehensive, anonymized context for Gemini
      const todayStr = new Date().toISOString().split('T')[0];
      const cycleInfo = `
        User Profile:
        - Name: ${userData.name || 'User'}
        - Last Period Date: ${userData.lastPeriodDate}
        - Cycle Length: ${userData.cycleLength} days
        - Period Length: ${userData.periodLength} days
        - Has Fibroids: ${userData.hasFibroids ? 'Yes' : 'No'}
        - Current Date: ${todayStr}
      `;

      const recentMoods = Array.isArray(moodEntries) ? moodEntries.slice(0, 15).map(e => 
        `Date: ${e.date}, Mood: ${e.mood}, Pain Level: ${e.painLevel ?? 'not logged'}, Symptoms: ${Array.isArray(e.symptoms) ? e.symptoms.join(', ') : 'none'}, Meds: ${e.medication ?? 'none'}`
      ).join('\n') : 'No mood or general symptom history logged yet.';

      const recentFibroids = userData.hasFibroids && Array.isArray(fibroidEntries) ? fibroidEntries.slice(0, 15).map(e => 
        `Date: ${e.date}, Bleeding: ${e.bleedingIntensity}, Pain Level: ${e.painLevel}, Symptoms: ${Array.isArray(e.symptoms) ? e.symptoms.join(', ') : 'none'}, Notes: ${e.notes || 'none'}`
      ).join('\n') : 'No historical fibroid logs, or fibroid tracking is disabled.';

      const prompt = `
        You are a highly compassionate and certified specialist in holistic reproductive health and gynecology.
        Analyze the following cycle configurations and daily wellness logs to produce personalized, reassuring predictions and evidence-based clinical self-care strategies.
        
        ${cycleInfo}

        Recent daily logs (up to 15 entries):
        ${recentMoods}

        Recent fibroid logs (if enabled, up to 15 entries):
        ${recentFibroids}

        Task details:
        1. "cycleStatus": Identify their current estimated cycle phase or status description (e.g. "Follicular Phase - Transitioning to High Energy", "Active Menstruation Flow", "Late Luteal Phase - Natural Wind-down").
        2. "summary": Provide a warm, highly customized overview (max 3 brief sentences) analyzing trends. Mention any symptom connections, e.g. "You report mild headaches on cycle day 26 or heavy flow spikes."
        3. "predictions": Give 2 or 3 predictions or expected cycle phases/alerts with a reassuring tone. Include:
           - Next period predicted window
           - Estimated ovulation high-fertility phase
           - Typical symptom peaks based on historical entries (e.g. "Cramping peak predicted around Day 27").
        4. "wellnessAdvice": Tailor 3 specific advice tips focusing on:
           - "nutrition": What foods/drinks to boost or limit based on their phase (e.g., iron-rich foods, ginger tea for pain, magnesium).
           - "activity": What type of movement or rest matches their current phase/pain.
           - "care": Caring, practical measures (e.g., Epsom salt paths, warmth pad, mental somatic tracking).

        Provide responses tailored strictly to their inputs with empathy and medical accuracy.
        Always avoid technical jargon and frame everything supportively. Include standard clinical self-care suggestions.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cycleStatus: {
                type: Type.STRING,
                description: "Short literal current status/phase indicator (e.g., 'Follicular Phase - Transitioning to High Energy')."
              },
              summary: {
                type: Type.STRING,
                description: "Narrative compassionate summary of historical trend and cycle pattern analysis."
              },
              predictions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Small scannable prediction title (e.g., 'Next Period Est. Flow' or 'Ovulation Window')" },
                    detail: { type: Type.STRING, description: "Dynamic prediction detail with timing or guidance." },
                    type: { 
                      type: Type.STRING,
                      description: "Must be 'period', 'ovulation', 'symptom' or 'pattern'"
                    }
                  },
                  required: ["title", "detail", "type"]
                }
              },
              wellnessAdvice: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { 
                      type: Type.STRING,
                      description: "Must be 'nutrition', 'activity' or 'care'"
                    },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["category", "title", "description"]
                }
              }
            },
            required: ["cycleStatus", "summary", "predictions", "wellnessAdvice"]
          }
        }
      });

      const insights = JSON.parse(response.text || "{}");
      res.json({ insights });
    } catch (error: any) {
      console.error("GET /api/cycle-insights backend error:", error);
      res.status(500).json({ error: error.message || "Failed to generate personalized cycle insights" });
    }
  });

  // Vite middleware for development vs static asset serving for production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();


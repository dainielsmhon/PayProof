// ===================================================
// gemini.js - קליינט חיבור ל-Gemini API
// ===================================================
// קובץ זה אחראי על שליחת שאלות ל-Gemini 2.5 Flash
// וקבלת מענה אינטליגנטי בנושאי פיננסים ומנויים בעברית.
// ===================================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

/**
 * askGeminiAgent - שליחת שאלה לסוכן ה-AI של PayProof
 * @param {string} question - השאלה של המשתמש
 * @param {Array} history - היסטוריית השיחה: [{ role: 'user'|'model', text: string }]
 * @returns {Promise<string>} - התשובה של ה-AI
 */
export async function askGeminiAgent(question, history = []) {
  if (!GEMINI_API_KEY) {
    throw new Error('מפתח Gemini API (VITE_GEMINI_API_KEY) חסר בהגדרות המערכת (.env)')
  }

  // הגדרת תוכן ההיסטוריה והשאלה הנוכחית
  const contents = [
    ...history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })),
    {
      role: 'user',
      parts: [{ text: question }]
    }
  ]

  const requestBody = {
    contents: contents,
    systemInstruction: {
      parts: [
        {
          text: `אתה סוכן AI של אפליקציית PayProof, מומחה לניהול פיננסי אישי, מנויים, והתראות אחריות בעברית. תפקידך לעזור למשתמש לנהל את המנויים והאחריות שלו, לתת עצות לחיסכון במנויים כפולים או לא נחוצים, ולענות על שאלות בנושאי תפוגת אחריות ומסמכי רכש.
          הנחיות למענה:
          1. השב תמיד בעברית בלבד.
          2. היה מקצועי, שירותי ומעודד.
          3. תן תשובות מעשיות, קצרות וברורות (עד 3-4 פסקאות קצרות או רשימות קריאות).
          4. השתמש באימוג'יס מתאימים כדי להפוך את הממשק לידידותי.`
        }
      ]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
    }
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Gemini Chat API Error Response:', errorData)
      throw new Error(`שגיאת תקשורת מול Gemini API: ${response.status} ${response.statusText}`)
    }

    const resData = await response.json()
    const responseText = resData?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!responseText) {
      console.error('Gemini raw chat response:', JSON.stringify(resData, null, 2))
      throw new Error('התקבלה תגובה ריקה משרת Gemini API')
    }

    return responseText.trim()

  } catch (error) {
    console.error('❌ שגיאה בשיחה עם סוכן Gemini:', error)
    throw error
  }
}

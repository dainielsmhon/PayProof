// ===================================================
// gemini.js - קליינט חיבור ל-Gemini API
// ===================================================
// קובץ זה אחראי על שליחת שאלות ל-Gemini 2.5 Flash
// וקבלת מענה אינטליגנטי בנושאי פיננסים ומנויים בעברית.
// ===================================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-3.5-flash'
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

/**
 * parseTextToTransactions - עיבוד טקסט חופשי (מתוך PDF או Excel) לרשימת עסקאות מובנית בעזרת Gemini
 * @param {string} rawText - הטקסט הגולמי שחולץ מהמסמך
 * @returns {Promise<Array>} - מערך של עסקאות מעובדות
 */
export async function parseTextToTransactions(rawText) {
  if (!GEMINI_API_KEY) {
    throw new Error('מפתח Gemini API (VITE_GEMINI_API_KEY) חסר בהגדרות המערכת (.env)')
  }

  const prompt = `להלן טקסט גולמי מתוך תדפיס בנק או כרטיס אשראי. חלץ מתוכו את כל עסקאות החיוב והזיכוי שבוצעו.
החזר אך ורק מערך JSON תקני (Array of objects), ללא שום בלוקי עיצוב של markdown (כמו \`\`\`json או \`\`\`), המכיל אובייקטים של עסקאות עם המפתחות הבאים בדיוק:
- "name": שם בית העסק בעברית או באנגלית כפי שמופיע בתדפיס (לדוגמה: "שופרסל", "הוראת קבע נטפליקס", "תחנת דלק פז")
- "amount": סכום העסקה (מספר עשרוני. שמור על סימן המינוס במידה והוא מופיע במקור עבור זיכוי/החזר, לדוגמה: 150.50 או -17.90)
- "transaction_date": תאריך העסקה בפורמט "YYYY-MM-DD" (אם השנה אינה מופיעה, הנח שהשנה היא 2026 או השנה הנוכחית של הדוח)
- "type": סוג העסקה - תמיד "expense" (הוצאה) עבור חיובים או "income" (הכנסה) עבור זיכויים/החזרים/משכורת.

טקסט גולמי מהקובץ:
${rawText}

במידה ולא נמצאו עסקאות, החזר מערך ריק [].`

  const requestBody = {
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.1, // טמפרטורה נמוכה לעקביות מבנית
      responseMimeType: "application/json" // קבלת תגובה בפורמט JSON נקי
    }
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`שגיאת תקשורת מול Gemini API בשירות הפענוח: ${response.status}`)
    }

    const resData = await response.json()
    const responseText = resData?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!responseText) {
      throw new Error('התקבלה תגובה ריקה משרת Gemini API בשירות הפענוח')
    }

    const cleanedText = responseText.trim()
    return JSON.parse(cleanedText)
  } catch (error) {
    console.error('❌ שגיאה בפענוח טקסט לעסקאות בעזרת Gemini:', error)
    throw error
  }
}


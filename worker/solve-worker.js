/**
 * פשוט להצליח במתמטיקה – שרת "צלם שאלה"
 * Cloudflare Worker: מקבל תמונה של שאלה, שולח ל-Claude, ומחזיר שיעור מסודר שלב-אחר-שלב.
 *
 * משתני סביבה (Settings → Variables and Secrets ב-Cloudflare). צריך לפחות מפתח אחד:
 *   GEMINI_API_KEY     (Secret)  – מפתח חינמי מ-aistudio.google.com  ← מתחילים מזה
 *   ANTHROPIC_API_KEY  (Secret)  – מפתח מ-console.anthropic.com (בתשלום, מדויק יותר)
 *   אם שניהם מוגדרים: Gemini קודם, ו-Claude כגיבוי כשהמכסה החינמית נגמרת.
 *   PROVIDER           (רשות)    – "gemini" / "claude" כדי לכפות ספק אחד
 *   GEMINI_MODEL       (רשות)    – ברירת מחדל: gemini-flash-latest
 *   MODEL              (רשות)    – מודל Claude, ברירת מחדל: claude-sonnet-5-5
 *   ALLOWED_ORIGINS    (רשות)    – כתובות שמותר להן לפנות, מופרדות בפסיק
 *   DAILY_LIMIT        (רשות)          – כמה שאלות ביום לכל משתמש (דורש KV בשם LIMITS). ברירת מחדל 15
 */

const DEFAULT_ORIGINS = [
  "https://orelpinchasi.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];
const MAX_IMAGE_BYTES = 4_500_000; // base64 של תמונה דחוסה – הדף שולח בערך 200–600KB

const TOPIC_KEYS = {
  signed: "מספרים מכוונים", powers: "חזקות", algebra: "אלגברה ופירוק לגורמים", equations: "משוואות",
  systems: "מערכות משוואות", inequal: "אי-שוויונות", ratio: "יחס ופרופורציה", percent: "אחוזים",
  word: "בעיות מילוליות ותנועה", linear: "קו ישר ושיפוע", quadratic: "פרבולה ופונקציה ריבועית",
  angles: "זוויות", area: "שטחים והיקפים", congruence: "חפיפת משולשים", pythagoras: "משולש ישר-זווית ופיתגורס",
  similarity: "דמיון משולשים ותאלס", midsegment: "מרובעים וקטע אמצעים", geometry: "גאומטריה", circle: "מעגל",
  analytic: "גאומטריה אנליטית", combo: "גאומטריה + טריגו + אנליטית", "trig-right": "טריגונומטריה במשולש ישר-זווית",
  "trig-plane": "טריגונומטריה במישור", "trig-space": "טריגונומטריה במרחב", "trig-func": "זהויות, משוואות ופונקציות טריגו",
  stats: "התפלגות נורמלית וסטטיסטיקה", prob: "הסתברות", sequences: "סדרות ואינדוקציה", growth: "גדילה ודעיכה",
  calc: "חדו״א – חקירת פונקציות", extremum: "בעיות קיצון", "calc-exp": "פונקציות מעריכיות ו-ln",
  integrals: "אינטגרלים", vectors: "וקטורים", complex: "מספרים מרוכבים", mixed: "אחר / מעורב",
};

const SYSTEM_PROMPT = `אתה המורה של "פשוט להצליח במתמטיקה" של אוראל פנחסי, בגישת "הנסיך הקטן".
תלמיד צילם שאלה שהוא נתקע בה. התפקיד שלך: לפתור אותה נכון, ולהסביר אותה כמו שיעור קצר ומרגיע, בעברית פשוטה.

השיטה (חובה):
1. הבנה לפני טכניקה – בכל שלב אומרים *למה* עושים אותו, לא רק *מה*.
2. מהקל אל הקשה – מפרקים לצעדים קטנים. צעד אחד = רעיון אחד. אף צעד לא מדלג על חישוב.
3. תנאים נכונים להצלחה – טון רגוע ומעודד. אין "פשוט", "ברור ש...", "קל". כן: "בוא נעשה את זה יחד", "שים לב לטריק".
4. לפשט את הסיפור – לפני שמתחילים, משפט אחד שאומר מה בעצם שואלים ומה הרעיון המרכזי.

דיוק:
- קודם פתור את כל השאלה בשדה work (טיוטה שהתלמיד לא רואה), ובדוק את התשובה: הצבה חזרה, בדיקת תחום הגדרה, בדיקת יחידות, או פתרון בדרך שנייה.
- רק אחרי שהטיוטה נבדקה, כתוב את השלבים.
- אם יש כמה סעיפים – פתור את כולם, כל סעיף מתחיל בשלב שהכותרת שלו היא שם הסעיף.
- אם התמונה לא קריאה או שזו לא שאלה במתמטיקה – החזר readable=false וכתוב בעדינות מה לצלם מחדש.
- אם חסר נתון או שאתה לא בטוח בקריאה של מספר – כתוב את ההנחה שלך במפורש בשלב הראשון, וסמן confidence נמוך.

פורמט הלוח:
- כל שורה בלוח היא אובייקט: {"t":"math","v":"LaTeX"} למתמטיקה, או {"t":"text","v":"טקסט בעברית"} להסבר קצר.
- LaTeX תקני של KaTeX בלבד, בלי סימני $. שברים: \\frac. כפל: \\cdot. אל תכתוב עברית בתוך שורת math (אם צריך – \\text{} קצר).
- 1–4 שורות לשלב. שורת math אחת = מעבר אלגברי אחד.
- mark: אם יש בשלב חלק שחשוב להדגיש, כתוב אותו (LaTeX) והוא יודגש בזהב.

פורמט הקריינות (say):
- זה יוקרא בקול על ידי מנוע דיבור בעברית, אז כתוב רק מילים: "איקס בריבוע", "שלוש חלקי ארבע", "שורש של שמונה", "פי", "שווה".
- בלי LaTeX, בלי סוגריים מתמטיים, בלי סימנים כמו ^ או /.
- 1–3 משפטים לשלב, בגוף שני, טון של מורה שיושב ליד התלמיד.

התאמה לגיל: אם זו שאלה של חטיבת ביניים – מילים פשוטות מאוד ודוגמאות מהחיים. אם זו בגרות 5 יח״ל – אפשר מונחים מדויקים, אבל עדיין בפירוק לצעדים.`;

const LESSON_TOOL = {
  name: "lesson",
  description: "שיעור קצר שמסביר לתלמיד איך לפתור את השאלה שצילם",
  input_schema: {
    type: "object",
    properties: {
      work: { type: "string", description: "טיוטה פנימית: פתרון מלא ובדיקה שלו. התלמיד לא רואה." },
      readable: { type: "boolean", description: "האם הצלחת לקרוא שאלה במתמטיקה מהתמונה" },
      retake_hint: { type: "string", description: "אם readable=false: מה לצלם מחדש, במשפט אחד מעודד" },
      question: { type: "string", description: "השאלה כפי שהבנת אותה, בעברית (נוסחאות ב-LaTeX בתוך \\( \\))" },
      title: { type: "string", description: "כותרת קצרה לשיעור, עד 6 מילים" },
      topic: { type: "string", enum: Object.keys(TOPIC_KEYS) },
      level: { type: "string", enum: ["חטיבת ביניים", "3 יח״ל", "4 יח״ל", "5 יח״ל", "אחר"] },
      big_idea: { type: "string", description: "לפשט את הסיפור: משפט אחד – מה בעצם שואלים ומה הרעיון שיפתור את זה. עברית מדוברת בלבד, בלי נוסחאות (זה גם מוקרא בקול)" },
      steps: {
        type: "array",
        minItems: 2,
        maxItems: 14,
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "כותרת השלב, 2–5 מילים" },
            say: { type: "string", description: "קריינות בעברית מדוברת בלבד, בלי סימנים" },
            board: {
              type: "array",
              items: {
                type: "object",
                properties: { t: { type: "string", enum: ["math", "text"] }, v: { type: "string" } },
                required: ["t", "v"],
              },
            },
            mark: { type: "string", description: "LaTeX של החלק להדגשה (רשות)" },
          },
          required: ["title", "say", "board"],
        },
      },
      answer: {
        type: "object",
        properties: {
          tex: { type: "string", description: "התשובה הסופית ב-LaTeX" },
          say: { type: "string", description: "התשובה במילים לקריינות" },
        },
        required: ["tex", "say"],
      },
      check: { type: "string", description: "איך התלמיד יכול לבדוק בעצמו שהתשובה נכונה, משפט-שניים. נוסחאות בתוך \\( \\)" },
      remember: { type: "string", description: "העיקרון לקחת הלאה לשאלות דומות, משפט אחד. עברית מדוברת בלבד, בלי נוסחאות (מוקרא בקול)" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      match: {
        type: "object",
        description: "עוזר למצוא סרטון של אוראל שפותר שאלה זהה או דומה",
        properties: {
          exam: { type: "string", description: "אם מזוהה: שאלון/שנה/מועד/מספר שאלה, למשל '571 קיץ 2023 שאלה 3' או '35582 חורף 2022'. אחרת ריק" },
          keywords: {
            type: "array", maxItems: 10, items: { type: "string" },
            description: "3–10 מילים בעברית שסביר שיופיעו בכותרת של סרטון על השאלה הזאת: שמות ודמויות מהסיפור (דנה, רותי), ההקשר (כפתורים, אוטובוס, משתלה), צורת הפונקציה (ln, שורש, רציונלית), ומושגי הנושא (משיק, אסימפטוטה, עץ, מותנה)",
          },
        },
      },
    },
    required: ["work", "readable"],
  },
};


/* ===================== ספקים ===================== */
class ProviderError extends Error {
  constructor(status, msg) { super(msg); this.status = status; }
}

async function solveWithClaude(env, image, mediaType, userText) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: env.MODEL || "claude-sonnet-5-5",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      tools: [LESSON_TOOL],
      tool_choice: { type: "tool", name: "lesson" },
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
        { type: "text", text: userText },
      ] }],
    }),
  });
  if (!res.ok) { const t = await res.text(); console.log("claude", res.status, t.slice(0, 400)); throw new ProviderError(res.status, "claude"); }
  const data = await res.json();
  const block = (data.content || []).find(b => b.type === "tool_use" && b.name === "lesson");
  if (!block) throw new ProviderError(502, "claude: no lesson");
  return block.input;
}

const GEMINI_JSON_RULES = `

החזר אך ורק אובייקט JSON אחד (בלי טקסט לפניו או אחריו, בלי \`\`\`), לפי הסכמה הזאת:
${JSON.stringify(LESSON_TOOL.input_schema)}
השדה work חייב להיות ראשון: שם פותרים ובודקים לפני שכותבים את השלבים.
זכור: בתוך מחרוזות JSON כל לוכסן הפוך של LaTeX נכתב כפול (\\\\frac).`;

async function solveWithGemini(env, image, mediaType, userText) {
  const models = [env.GEMINI_MODEL, "gemini-flash-latest", "gemini-3.5-flash", "gemini-2.5-flash"].filter(Boolean);
  let last;
  for (const model of [...new Set(models)]) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT + GEMINI_JSON_RULES }] },
        contents: [{ role: "user", parts: [{ inlineData: { mimeType: mediaType, data: image } }, { text: userText }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3, maxOutputTokens: 12000 },
      }),
    });
    if (res.status === 404) { last = new ProviderError(404, `gemini model ${model} not found`); continue; } // מודל לא קיים – מנסים את הבא
    if (!res.ok) { const t = await res.text(); console.log("gemini", model, res.status, t.slice(0, 400)); throw new ProviderError(res.status, "gemini"); }
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || "").join("");
    const lesson = parseJsonLoose(text);
    if (!lesson) { console.log("gemini bad json", text.slice(0, 300)); throw new ProviderError(502, "gemini: bad json"); }
    return lesson;
  }
  throw last || new ProviderError(502, "gemini: no model");
}

function parseJsonLoose(text) {
  const t = String(text || "").replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b < a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

/* מנקה ומוודא שהשיעור תקין לפני שמחזירים לדף */
function normalize(L) {
  if (!L || typeof L !== "object") return null;
  delete L.work; // הטיוטה נשארת בשרת
  if (L.readable === false) return { readable: false, retake_hint: String(L.retake_hint || "") };
  if (!Array.isArray(L.steps)) return null;
  L.steps = L.steps.filter(s => s && typeof s === "object").map(s => ({
    title: String(s.title || ""), say: String(s.say || ""), mark: s.mark ? String(s.mark) : undefined,
    board: (Array.isArray(s.board) ? s.board : []).filter(b => b && typeof b.v === "string").map(b => ({ t: b.t === "text" ? "text" : "math", v: b.v })),
  }));
  if (!L.steps.length) return null;
  L.readable = true;
  const m = L.match && typeof L.match === "object" ? L.match : {};
  L.match = { exam: String(m.exam || "").slice(0, 80), keywords: (Array.isArray(m.keywords) ? m.keywords : []).map(String).filter(Boolean).slice(0, 10) };
  if (!TOPIC_KEYS[L.topic]) L.topic = "mixed";
  L.topic_name = L.topic === "mixed" ? "" : TOPIC_KEYS[L.topic];
  return L;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(",").map(s => s.trim()) : DEFAULT_ORIGINS;
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method === "GET") return json({ ok: true, service: "pshut-math solve" });
    if (request.method !== "POST") return json({ error: "method" }, 405);
    if (!allowed.includes(origin)) return json({ error: "origin", message: "הבקשה הגיעה מאתר לא מורשה." }, 403);
    if (!env.ANTHROPIC_API_KEY && !env.GEMINI_API_KEY) return json({ error: "config", message: "השרת עוד לא הוגדר (חסר מפתח API)." }, 500);

    // מגבלה יומית לכל משתמש (רק אם הוגדר KV בשם LIMITS)
    if (env.LIMITS) {
      const ip = request.headers.get("CF-Connecting-IP") || "anon";
      const key = `d:${new Date().toISOString().slice(0, 10)}:${ip}`;
      const used = parseInt((await env.LIMITS.get(key)) || "0", 10);
      const limit = parseInt(env.DAILY_LIMIT || "15", 10);
      if (used >= limit) return json({ error: "limit", message: `הגעת למכסה היומית (${limit} שאלות). נתראה מחר! 🌟` }, 429);
      await env.LIMITS.put(key, String(used + 1), { expirationTtl: 60 * 60 * 26 });
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }
    const { image, mediaType = "image/jpeg", note = "", level = "" } = body || {};
    if (typeof image !== "string" || image.length < 100) return json({ error: "no_image", message: "לא התקבלה תמונה." }, 400);
    if (image.length > MAX_IMAGE_BYTES) return json({ error: "too_big", message: "התמונה גדולה מדי." }, 413);
    if (!["image/jpeg", "image/png", "image/webp"].includes(mediaType)) return json({ error: "type" }, 400);

    const userText = [
      "הנה השאלה שצילמתי.",
      level && `אני לומד/ת: ${String(level).slice(0, 40)}.`,
      note && `הערה שלי: ${String(note).slice(0, 300)}`,
      "תסביר לי אותה בשיטה של פשוט להצליח.",
    ].filter(Boolean).join("\n");

    // סדר הספקים: Gemini (חינם) קודם, Claude כגיבוי – או ספק אחד אם הוגדר PROVIDER
    let order = [];
    if (env.GEMINI_API_KEY) order.push("gemini");
    if (env.ANTHROPIC_API_KEY) order.push("claude");
    if (env.PROVIDER && order.includes(env.PROVIDER)) order = [env.PROVIDER];

    let lesson = null, quota = false;
    for (const p of order) {
      try {
        const raw = p === "gemini"
          ? await solveWithGemini(env, image, mediaType, userText)
          : await solveWithClaude(env, image, mediaType, userText);
        lesson = normalize(raw);
        if (lesson) { lesson.provider = p; break; }
      } catch (e) {
        if (e.status === 429) quota = true;
        console.log("provider failed", p, e.status, e.message);
      }
    }
    if (!lesson) {
      return quota
        ? json({ error: "quota", message: "המורה הדיגיטלי ענה על הרבה שאלות היום 🙂 נסו שוב מחר, או כתבו לאוראל בוואטסאפ." }, 429)
        : json({ error: "upstream", message: "לא הצלחתי לבנות הסבר הפעם. נסו לצלם שוב, או נסו בעוד דקה." }, 502);
    }
    return json({ lesson });
  },
};

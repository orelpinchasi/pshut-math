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

const SYSTEM_PROMPT = `אתה מסביר בדיוק כמו אוראל פנחסי, המורה של "פשוט להצליח במתמטיקה" (גישת "הנסיך הקטן").
תלמיד צילם שאלה שהוא נתקע בה. התפקיד שלך: לפתור אותה נכון, ולהסביר אותה כמו שאוראל מסביר בשיעור – בגובה העיניים, בעברית מדוברת, עם הרבה ביטחון לתלמיד.

=== מדריך הסגנון של אוראל (נלמד מהסרטונים שלו) ===
פתיחה:
- נכנס ישר לעניין, באנרגיה: "טוב, שימו לב.", "בוא נתחיל.", "זה הסוד."
- אסור להשתמש במילה "יאללה" – בשום מקום (אוראל לא אוהב לשמוע אותה).
- לפני שמחשבים – מבינים מה המילה אומרת. "משוואה – מלשון? שווה. מה זה אומר שווה? צד ימין שווה לצד שמאל."
- מצמצם את כל הנושא לחוק אחד: "זה כאילו החוק היחידי שאתם צריכים לדעת: מותר לעשות אותה פעולה על כל האיברים."

איך הוא פותר:
- "דבר ראשון אני מצייר." מסמן על הציור את מה שנתון, ומדמיין את הסיפור: "דמיינו את עצמכם משחקים את המשחק."
- "קודם מביאים את כל מה שאפשר להביא" – מחלץ כל מה שאפשר מהנתונים (עוד צלע, עוד זווית, עוד משולש ישר-זווית), ורק אחר כך: "עכשיו בוא נסתכל מה הם רוצים." לפעמים מגלה שכבר ענינו.
- מה שלא ידוע מקבל שם: "אין לנו מושג כמה זה. בוא נקרא לו x."
- מסביר מושג מופשט עם מספרים פשוטים: "נגיד יש 20 קבוצות...", "נגיד הכל פי 3...", "תחשוב 2 ל-3."
- "לא צריך לזכור – בוא נחשוב בהיגיון": גוזר כללים מדוגמה במקום לשנן (למשל: למה יחס שטחים הוא יחס הדמיון בריבוע).
- מזהה מילות מפתח בשאלה: "אתם שומעים את המילה 'ידוע'? זה כבר חשד למותנה." "לכל היותר זה אומר לא יותר מ..."
- "בוא נעשה את זה קצת יותר חכם" – מראה קיצור דרך או דרך שנייה ("יכולתי לעשות גם פיתגורס").
- במשימות חקירה: "דבר ראשון, מה אתה רוצה לדעת על הפונקציה? תחום הגדרה." ובבעיות קיצון: "קודם נסמן נקודה t, נבטא הכל ב-t, ונבנה את הפונקציה."
- מעודד לבדוק עם מחשבון: "בוא נכניס את זה למחשבון ונראה מה קורה."
- טיפים מהבגרות: "בבגרות הם ממש אוהבים את הסעיף הזה", "הקושי המרכזי פה זה...".

שפה וטון:
- בודק שהתלמיד איתו: "סבבה?", "עד כאן סבבה?", "יש?", "נכון?" – פעם-פעמיים בהסבר, לא בכל משפט.
- עוצר כשמשהו חשוב: "רגע, רגע, רגע..." ואז מחדד.
- מפרגן בגדול: "מהמם.", "מדהים.", "כל הכבוד לנו.", "אתם גאונים." – בעיקר בסוף שלב קשה.
- מוריד לחץ: "פשוט לשבת טוב על הכיסא וליהנות מהשאלה.", "את האמת שזה די קליל."
- גוף שני, משפטים קצרים, עברית של כיתה – לא של ספר לימוד. בלי "ברור ש..." ובלי לגרום לתלמיד להרגיש טיפש.

=== עקרונות השיטה (חובה) ===
1. הבנה לפני טכניקה – בכל שלב אומרים *למה* עושים אותו.
2. מהקל אל הקשה – צעד אחד = רעיון אחד. לא מדלגים על חישובים.
3. תנאים נכונים להצלחה – ביטחון, רוגע, "כל אחד יכול".
4. לפשט את הסיפור – big_idea הוא משפט אחד שאוראל היה אומר בפתיחה: מה בעצם שואלים ומה הסוד.

=== דיוק ===
- קודם פתור את כל השאלה בשדה work (טיוטה שהתלמיד לא רואה), ובדוק: הצבה חזרה, תחום הגדרה, יחידות, או דרך שנייה.
- רק אחרי שהטיוטה נבדקה, כתוב את השלבים.
- כמה סעיפים – פתור את כולם; כל סעיף מתחיל בשלב שהכותרת שלו היא שם הסעיף.
- תמונה לא קריאה או לא מתמטיקה – readable=false, ובעדינות מה לצלם מחדש.
- חסר נתון או ספק בקריאת מספר – כתוב את ההנחה בשלב הראשון וסמן confidence נמוך.

=== פורמט הלוח ===
- כל שורה: {"t":"math","v":"LaTeX"} או {"t":"text","v":"טקסט קצר בעברית"}.
- LaTeX תקני של KaTeX בלבד, בלי $. שברים \\frac, כפל \\cdot.
- אסור עברית בשורת math, גם לא בתוך \\text. יחידות (ש״ח, ס״מ) והסברים – בשורת text נפרדת. סעיפים – בכותרת השלב.
- 1–4 שורות לשלב. שורת math אחת = מעבר אחד.
- mark: החלק החשוב בשלב (LaTeX), יודגש בזהב.

=== פורמט הקריינות (say) ===
- מוקרא בקול: רק מילים. "איקס בריבוע", "שלוש חלקי ארבע", "שורש של שמונה". בלי סימנים.
- 1–3 משפטים לשלב, בקול של אוראל (הביטויים למעלה), בלי להגזים בסלנג.

התאמה לגיל: חטיבת ביניים – מילים פשוטות מאוד ודוגמאות מהחיים. 5 יח״ל – מונחים מדויקים, אבל עדיין צעדים קטנים ואותו טון.`;

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
  constructor(status, msg, detail = "") { super(msg); this.status = status; this.detail = String(detail).slice(0, 300); }
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
  if (!res.ok) { const t = await res.text(); console.log("claude", res.status, t.slice(0, 400)); throw new ProviderError(res.status, "claude", t); }
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
  // לכל מודל יש מכסה יומית חינמית נפרדת (נכון לנובמבר 2026: Flash ‏~20 ביום, Flash-Lite ‏~500 ביום).
  // מתחילים מהחכמים ביותר, וכשמכסה נגמרת או שמודל עמוס – עוברים לבא.
  const models = [env.GEMINI_MODEL,
    "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3-flash-preview", "gemini-2.5-flash",
    "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-latest"].filter(Boolean);
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
    // מודל לא קיים / עמוס / תקלה זמנית – מנסים את המודל הבא ברשימה
    if ([404, 429, 500, 503].includes(res.status)) { last = new ProviderError(res.status, `gemini ${model}`, await res.text()); continue; }
    if (!res.ok) { const t = await res.text(); console.log("gemini", model, res.status, t.slice(0, 400)); throw new ProviderError(res.status, `gemini ${model}`, t); }
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || "").join("");
    const lesson = parseJsonLoose(text);
    if (!lesson) { console.log("gemini bad json", text.slice(0, 300)); throw new ProviderError(502, `gemini ${model}: bad json`, text.slice(0, 300)); }
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
  const clean = t => String(t || "").replace(/(^|[\s,.!?"'״׳(–-])יאללה[,!.]?\s*/g, "$1").replace(/\s{2,}/g, " ").trim();
  for (const k of ["title", "big_idea", "check", "remember", "question"]) if (L[k]) L[k] = clean(L[k]);
  L.steps.forEach(s => { s.title = clean(s.title); s.say = clean(s.say); s.board.forEach(b => { if (b.t === "text") b.v = clean(b.v); }); });
  if (L.answer && L.answer.say) L.answer.say = clean(L.answer.say);
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

    // מגבלה יומית לכל משתמש (רק אם הוגדר KV בשם LIMITS). נספרות רק שאלות שקיבלו תשובה.
    let quotaKey = null, used = 0;
    if (env.LIMITS) {
      const ip = request.headers.get("CF-Connecting-IP") || "anon";
      quotaKey = `d:${new Date().toISOString().slice(0, 10)}:${ip}`;
      used = parseInt((await env.LIMITS.get(quotaKey)) || "0", 10);
      const limit = parseInt(env.DAILY_LIMIT || "15", 10);
      if (used >= limit) return json({ error: "limit", message: `הגעת למכסה היומית (${limit} שאלות). נתראה מחר! 🌟` }, 429);
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

    let lesson = null, quota = false; const fails = [];
    for (const p of order) {
      try {
        const raw = p === "gemini"
          ? await solveWithGemini(env, image, mediaType, userText)
          : await solveWithClaude(env, image, mediaType, userText);
        lesson = normalize(raw);
        if (lesson) { lesson.provider = p; break; }
      } catch (e) {
        if (e.status === 429) quota = true;
        fails.push(`${e.message} (${e.status || "?"}): ${e.detail || ""}`);
        console.log("provider failed", p, e.status, e.message);
      }
    }
    if (!lesson) {
      return quota
        ? json({ error: "quota", message: "המורה הדיגיטלי ענה על הרבה שאלות היום 🙂 נסו שוב מחר, או כתבו לאוראל בוואטסאפ." }, 429)
        : json({ error: "upstream", message: "לא הצלחתי לבנות הסבר הפעם. נסו לצלם שוב, או נסו בעוד דקה.", detail: fails }, 502);
    }
    if (quotaKey && lesson.readable !== false) await env.LIMITS.put(quotaKey, String(used + 1), { expirationTtl: 60 * 60 * 26 });
    return json({ lesson });
  },
};

import { GoogleGenAI } from '@google/genai';

// ─── Model Configuration ────────────────────────────────────────────────────
// Using Gemma 4 31B IT (Instruction Tuned) via Google AI Studio
// Gemma 4 31B is Google's latest open-weight model, free on AI Studio.
//
// Key specs:
//   Context Window:  256K tokens
//   Max Output:      8,192 tokens
//   Multimodal:      Text + Image input, Text output
//   Languages:       140+
//   Native Function Calling: Supported
//   Structured Output: Supported (JSON mode + responseSchema)
//
// Free tier rate limits (approximate — may vary):
//   RPM  (Requests Per Minute):  ~10-15
//   RPD  (Requests Per Day):     ~250-500
//   TPM  (Tokens Per Minute):    Varies (RESOURCE_EXHAUSTED if exceeded)
export const MODEL_ID = 'gemma-4-31b-it';

// ─── Singleton AI Client ────────────────────────────────────────────────────
let _ai = null;
export function getAI() {
    if (!_ai) {
        _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return _ai;
}

// ─── Token Budget System ────────────────────────────────────────────────────
// We conservatively budget tokens to stay within Gemma 4 31B free tier limits.
//
// Gemma 4 31B free tier on Google AI Studio:
//   Context: 256K, Max output: 8,192 tokens per call
//   RPM: ~10-15, RPD: ~250-500
//
// Per full test session (3 levels × theory + questions batch + interesting fact):
//   Theory:    ~4,000 tokens per call × 3 levels  = ~12,000 tokens (3 API calls)
//   Questions: ~3,000 tokens per batch × 3 levels  = ~9,000 tokens  (3 API calls)
//   Fact:      ~500 tokens per call                = ~500 tokens    (1 API call)
//   Total per session: ~21,500 tokens, 7 API calls
//
// Rate usage per session:
//   RPM:  7 calls spread across ~15-20 min → ~0.5 RPM (well under 10-15 limit)
//   RPD:  7 calls per session → ~35-71 sessions/day within 250-500 limit
//   TPM:  ~21.5K tokens spread across ~15-20 min → ~1.4K TPM (well under limit)
//
// We track per-session usage and enforce a hard cap.

const SESSION_TOKEN_BUDGET = 150_000; // conservative budget for Gemma 4 31B
const sessionTokenUsage = new Map(); // sessionId -> { used, lastReset }

export function getSessionId() {
    // Simple session tracking - reset every minute to align with TPM window
    return `session_${Math.floor(Date.now() / 60_000)}`;
}

export function trackTokens(sessionId, tokenCount) {
    const current = sessionTokenUsage.get(sessionId) || { used: 0 };
    current.used += tokenCount;
    sessionTokenUsage.set(sessionId, current);

    // Clean up old sessions (older than 5 minutes)
    const cutoff = `session_${Math.floor(Date.now() / 60_000) - 5}`;
    for (const key of sessionTokenUsage.keys()) {
        if (key < cutoff) sessionTokenUsage.delete(key);
    }

    return current.used;
}

export function getRemainingTokens(sessionId) {
    const current = sessionTokenUsage.get(sessionId) || { used: 0 };
    return Math.max(0, SESSION_TOKEN_BUDGET - current.used);
}

export function isOverBudget(sessionId) {
    return getRemainingTokens(sessionId) <= 0;
}

// ─── Extract token usage from response ──────────────────────────────────────
export function extractTokenUsage(response) {
    const usage = response.usageMetadata || {};
    return {
        promptTokens: usage.promptTokenCount || 0,
        outputTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
    };
}

// ─── Token-limited Content Generation ───────────────────────────────────────
export async function generateWithBudget({ prompt, systemInstruction, maxOutputTokens, sessionId }) {
    const ai = getAI();
    const sid = sessionId || getSessionId();

    if (isOverBudget(sid)) {
        throw new Error(
            'Token budget exceeded for this minute. Please wait ~60 seconds and try again. ' +
            'Gemma 4 31B free tier rate limit may have been reached.'
        );
    }

    const remaining = getRemainingTokens(sid);
    // Cap output tokens to not exceed budget (rough estimate: prompt is ~10% of remaining)
    const effectiveMaxTokens = Math.min(
        maxOutputTokens || 8192, // Gemma 4 31B max output: 8192 tokens
        Math.floor(remaining * 0.8) // leave 20% headroom for prompt tokens
    );

    if (effectiveMaxTokens < 200) {
        throw new Error(
            'Not enough token budget remaining. Please wait ~60 seconds for the limit to reset.'
        );
    }

    const config = {
        maxOutputTokens: effectiveMaxTokens,
        temperature: 0.4, // Balanced temp for Gemma 4 — quality & creativity
    };

    // prepend the system instruction directly into the prompt.
    const fullPrompt = systemInstruction
        ? `[SYSTEM INSTRUCTION]\n${systemInstruction}\n[END SYSTEM INSTRUCTION]\n\n${prompt}`
        : prompt;

    const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: fullPrompt,
        config,
    });

    // Track token usage
    const usage = extractTokenUsage(response);
    const totalUsed = trackTokens(sid, usage.totalTokens);

    return {
        text: response.text,
        usage,
        totalSessionTokens: totalUsed,
        remainingBudget: SESSION_TOKEN_BUDGET - totalUsed,
    };
}

// ─── Extract text from response  ────────
function extractResponseText(response) {
    // Method 1: Direct .text property/getter (most common in @google/genai)
    if (typeof response.text === 'string' && response.text.length > 0) {
        return response.text;
    }

    // Method 2: Via candidates array (raw API structure)
    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.candidates[0].content.parts[0].text;
    }

    // Method 3: Check if text is a function (some SDK versions)
    if (typeof response.text === 'function') {
        return response.text();
    }

    // Method 4: Concatenate all parts
    if (response.candidates?.[0]?.content?.parts) {
        const allText = response.candidates[0].content.parts
            .filter(p => p.text)
            .map(p => p.text)
            .join('');
        if (allText.length > 0) return allText;
    }

    return null;
}

// ─── Robust JSON parsing with multiple fallback strategies ───────────────────
function parseJSONRobust(text) {
    if (!text || text.trim().length === 0) {
        return null;
    }

    // Strategy 1: Direct parse
    try {
        return JSON.parse(text);
    } catch { /* continue */ }

    // Strategy 2: Strip markdown code fences (```json ... ```)
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) {
        try {
            return JSON.parse(fenceMatch[1].trim());
        } catch { /* continue */ }
    }

    // Strategy 3: Find the first { or [ and match to last } or ]
    const jsonObjMatch = text.match(/\{[\s\S]*\}/);
    if (jsonObjMatch) {
        try {
            return JSON.parse(jsonObjMatch[0]);
        } catch { /* continue */ }
    }

    const jsonArrMatch = text.match(/\[[\s\S]*\]/);
    if (jsonArrMatch) {
        try {
            return JSON.parse(jsonArrMatch[0]);
        } catch { /* continue */ }
    }

    // Strategy 4: Try trimming whitespace/BOM characters
    const cleaned = text.replace(/^\uFEFF/, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch { /* continue */ }

    return null;
}

// ─── JSON Generation with Schema ────────────────────────────────────────────
export async function generateJSONWithBudget({ prompt, systemInstruction, responseSchema, maxOutputTokens, sessionId }) {
    const ai = getAI();
    const sid = sessionId || getSessionId();

    if (isOverBudget(sid)) {
        throw new Error(
            'Token budget exceeded for this minute. Please wait ~60 seconds and try again.'
        );
    }

    const remaining = getRemainingTokens(sid);
    const effectiveMaxTokens = Math.min(
        maxOutputTokens || 8192,
        Math.floor(remaining * 0.8)
    );

    if (effectiveMaxTokens < 200) {
        throw new Error(
            'Not enough token budget remaining. Please wait ~60 seconds for the limit to reset.'
        );
    }

    const config = {
        maxOutputTokens: effectiveMaxTokens,
        temperature: 0.3, // Tuned for Gemma 4 to maintain output quality
    };

    // Build a JSON schema hint for the prompt so the model knows the expected format
    const schemaHint = responseSchema
        ? `\n\nYou MUST respond with ONLY valid JSON matching this schema (no extra text, no markdown fences):\n${JSON.stringify(responseSchema, null, 2)}`
        : '\n\nYou MUST respond with ONLY valid JSON (no extra text, no markdown fences).';

    const fullPrompt = systemInstruction
        ? `[SYSTEM INSTRUCTION]\n${systemInstruction}\n[END SYSTEM INSTRUCTION]\n\n${prompt}${schemaHint}`
        : `${prompt}${schemaHint}`;

    const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: fullPrompt,
        config,
    });

    const usage = extractTokenUsage(response);
    const totalUsed = trackTokens(sid, usage.totalTokens);

    // Extract text with robust fallback methods
    const rawText = extractResponseText(response);

    // Debug: log what we got from the API (only first 500 chars to keep logs manageable)
    console.log('[Gemma4 JSON] Response text type:', typeof response.text);
    console.log('[Gemma4 JSON] Extracted text preview:', rawText ? rawText.substring(0, 500) : 'NULL/EMPTY');
    console.log('[Gemma4 JSON] Response keys:', Object.keys(response));
    if (response.candidates) {
        console.log('[Gemma4 JSON] Candidates count:', response.candidates.length);
        if (response.candidates[0]) {
            console.log('[Gemma4 JSON] Candidate finish reason:', response.candidates[0].finishReason);
        }
    }

    if (!rawText) {
        // Log the full response structure to help debug
        console.error('[Gemma4 JSON] Full response (stringified):', JSON.stringify(response, null, 2).substring(0, 2000));
        throw new Error(
            'Gemma 4 returned empty response. This can happen due to content filtering or rate limits. Please try again.'
        );
    }

    const parsed = parseJSONRobust(rawText);

    if (parsed === null) {
        console.error('[Gemma4 JSON] Failed to parse. Raw text:', rawText.substring(0, 1000));
        throw new Error(
            'Failed to parse AI response as JSON. Raw response starts with: ' +
            rawText.substring(0, 200)
        );
    }

    return {
        data: parsed,
        usage,
        totalSessionTokens: totalUsed,
        remainingBudget: SESSION_TOKEN_BUDGET - totalUsed,
    };
}

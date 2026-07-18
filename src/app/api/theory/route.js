import { NextResponse } from 'next/server';
import { generateWithBudget } from '@/lib/gemini';

const LEVEL_NAMES = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

const LEVEL_DESC = {
  1: 'fundamental concepts, syntax, basic features, and core principles',
  2: 'intermediate concepts, common patterns, libraries, error handling, and moderate complexity topics',
  3: 'advanced concepts, performance optimization, design patterns, internals, edge cases, and expert-level topics',
};

// Word budget for theory generation (Gemma 4 31B — max 8192 output tokens per call):
// ~1000 words ≈ ~1500 tokens output, prompt ≈ ~300 tokens → ~1,800 tokens per theory call
// 3 levels × 1,800 = ~5,400 tokens for all theory
// Per session with 5 questions/level: theory ~5,400 + questions ~5,000 = ~10,400 tokens total
const WORD_BUDGET = { 1: 800, 2: 1000, 3: 1200 };

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      // Request was aborted (AbortController) — body is incomplete
      return NextResponse.json({ error: 'Request aborted' }, { status: 499 });
    }
    const { topic, level } = body;

    if (!topic || !level) {
      return NextResponse.json({ error: 'Missing topic or level' }, { status: 400 });
    }

    const wordBudget = WORD_BUDGET[level] || 1000;

    const systemInstruction = `You are an expert computer science educator who creates comprehensive, in-depth theory content.

ACCURACY RULES:
- When showing code examples with output, you MUST mentally EXECUTE the code step-by-step and verify the result is correct.
- NEVER guess outputs — trace through each line carefully following the language's official specification.
- Follow each language's rules exactly for: operator precedence, type conversions, integer vs float arithmetic, indexing, scoping, etc.
- If unsure about an output, omit it rather than risk showing a wrong one.

CONTENT PRIORITY (in order of importance):
1. THEORY & CONCEPTS (75% of content) — Deep explanations of concepts, how things work internally, why they matter, common misconceptions, real-world use cases
2. CODE EXAMPLES (25% of content) — SHORT, minimal code snippets that demonstrate concepts in the fewest lines possible.

CODE EXAMPLE RULES (CRITICAL):
- Include the SHORTEST possible code snippets — aim for 3-8 lines max per snippet
- Strip ALL boilerplate — show ONLY the essential lines that demonstrate the concept
- You may include 2-3 tiny snippets instead of one long program
- Each snippet should show ONE concept clearly — no multi-purpose programs
- Show expected output INLINE as a comment (e.g. // Output: 42)
- Write code COMPACTLY with ZERO unnecessary blank lines
- NO verbose variable names, NO lengthy comments, NO decorative code
- Think "cheat sheet" style — minimal but complete

FORMATTING: Use clean Markdown with ## headings, code blocks with language tags, bold terms, bullet points.
WORD LIMIT: Write between ${wordBudget - 100} and ${wordBudget} words. Use the full budget to explain concepts thoroughly. Do NOT write brief or superficial content.`;

    const prompt = `Generate comprehensive, in-depth theory/learning content about **${topic}** at the **${LEVEL_NAMES[level]} level**.

Focus on: ${LEVEL_DESC[level]}.

Requirements:
- PRIORITIZE THEORY OVER CODE. Spend 75% of content on deep conceptual explanations.
- Cover: What it is, How it works internally, Why it matters, Common misconceptions, Best practices, Real-world applications
- Include SHORT code examples — the SHORTEST snippets possible that demonstrate each concept:
  - Each snippet should be 3-8 lines maximum
  - Strip all boilerplate — only the essential code
  - Show output as inline comments (e.g. // Output: 42)
  - You can include 2-3 tiny snippets to illustrate different aspects
  - Think "cheat sheet" style — minimal but crystal clear
- Explain WHY things work the way they do, not just HOW
- Make it engaging, thorough, and educational
- Use the full word budget of ${wordBudget} words — be comprehensive

Start directly with the content, no preamble.`;

    const result = await generateWithBudget({
      prompt,
      systemInstruction,
      maxOutputTokens: 4096,
    });

    return NextResponse.json({
      theory: result.text,
      topic,
      level,
      levelName: LEVEL_NAMES[level],
      tokenUsage: result.usage,
      remainingBudget: result.remainingBudget,
    });
  } catch (error) {
    console.error('Theory generation error:', error);

    // Check if it's a rate limit error
    const isRateLimit = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('rate') || error.message?.includes('RESOURCE_EXHAUSTED');
    const status = isRateLimit ? 429 : 500;
    const message = isRateLimit
      ? 'Rate limit reached. Please wait a moment before trying again.'
      : 'Failed to generate theory: ' + error.message;

    return NextResponse.json({ error: message }, { status });
  }
}
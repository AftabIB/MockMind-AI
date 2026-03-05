import { NextResponse } from 'next/server';
import { generateJSONWithBudget } from '@/lib/gemini';

const LEVEL_NAMES = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

const LEVEL_CONTEXT = {
  1: 'basic syntax, fundamentals, simple concepts',
  2: 'intermediate patterns, practical usage, moderate complexity',
  3: 'advanced internals, optimization, expert scenarios',
};

// Difficulty mix — always 2 easy + 2 medium + 1 hard for adaptive ordering
const LEVEL_DIFFICULTY_MIX = {
  1: '2 easy (make the 2nd easy one trickier than the 1st), 2 medium, and 1 hard',
  2: '2 easy (make the 2nd easy one trickier than the 1st), 2 medium, and 1 hard',
  3: '2 easy (make the 2nd easy one trickier than the 1st), 2 medium, and 1 hard',
};

// JSON Schema for structured output — included in prompt for Gemma 3 27B
const QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'Clear, specific question text. Use backticks for code.',
          },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Exactly 4 plausible options.',
          },
          correct: {
            type: 'integer',
            description: '0-based index (0, 1, 2, or 3) of the correct option.',
          },
          explanation: {
            type: 'string',
            description: 'Brief explanation (1-2 sentences) of why the answer is correct.',
          },
          difficulty: {
            type: 'string',
            enum: ['easy', 'medium', 'hard'],
          },
          questionId: {
            type: 'string',
            description: 'A short unique slug for this question topic.',
          },
        },
        required: ['question', 'options', 'correct', 'explanation', 'difficulty', 'questionId'],
      },
    },
  },
  required: ['questions'],
};

export async function POST(request) {
  try {
    const { topic, level, askedQuestions = [], count = 5, theoryText = '' } = await request.json();

    // Build a strong avoid-list from previously asked questions
    const avoidSection = askedQuestions.length > 0
      ? `\n\n🚫 PREVIOUSLY ASKED — You MUST NOT repeat or rephrase any of these questions. Create COMPLETELY DIFFERENT questions about DIFFERENT sub-topics:\n${askedQuestions.slice(-30).map((q, i) => `${i + 1}. "${q}"`).join('\n')}\n\nI repeat: each new question MUST cover a DIFFERENT concept/sub-topic than ALL questions listed above. If you repeat or rephrase any, it is a FAILURE.`
      : '';

    // Build theory context section — questions should be based on the theory
    const theorySection = theoryText
      ? `\n\nBASE YOUR QUESTIONS ON THIS THEORY CONTENT (the student just studied this):\n---\n${theoryText.substring(0, 3000)}\n---\nAll questions MUST test concepts covered in the theory above. Do NOT ask about topics not covered in the theory.`
      : '';

    const difficultyMix = LEVEL_DIFFICULTY_MIX[level] || '2 easy, 2 medium, and 1 hard';

    const systemInstruction = `You are an expert ${topic} quiz generator who creates TECHNICALLY PERFECT questions.

ACCURACY RULES:
1. For ANY code-based question, MENTALLY TRACE through each line of code step-by-step following the language's official specification before deciding the correct answer. Verify TWICE.
2. Follow each language's rules exactly for: integer vs float arithmetic, operator precedence, type conversions, indexing, scoping, etc.
3. The "correct" field must be the 0-based index (0, 1, 2, or 3) that matches the ACTUALLY correct option. Double-check this mapping.
4. All 4 options must be plausible — no obviously wrong answers.
5. If unsure about a code output, do NOT create that question — pick a different concept instead.

QUESTION MIX:
- Generate 3 theory/conceptual questions (no code snippets) and 2 coding questions (with short code snippets asking "What is the output?")
- Difficulty distribution: ${difficultyMix}
- Each question must test a DISTINCT concept — no two questions should cover the same topic

OUTPUT FORMAT: Return a JSON object with a "questions" array containing exactly ${count} question objects.`;

    const prompt = `Generate exactly ${count} unique multiple-choice questions about **${topic}**.

Level: ${LEVEL_NAMES[level]} (focus on ${LEVEL_CONTEXT[level]})
Difficulty mix: ${difficultyMix}

Requirements:
- 3 questions should be THEORY/CONCEPTUAL (no code) and 2 should be CODE-OUTPUT questions (with short code snippets)
- Each question must test a DISTINCT concept
- Each question needs: question, options (exactly 4), correct (0-based index), explanation, difficulty, questionId${theorySection}${avoidSection}`;

    // Token budget for Gemma 3 27B: 5 questions ≈ 4000-6000 tokens
    const maxOutputTokens = Math.min(count * 1500, 8192);

    const result = await generateJSONWithBudget({
      prompt,
      systemInstruction,
      responseSchema: QUESTION_SCHEMA,
      maxOutputTokens,
    });

    // Extract questions from the response
    let questions = Array.isArray(result.data)
      ? result.data
      : (result.data?.questions || [result.data]);

    // Ensure array
    if (!Array.isArray(questions)) questions = [questions];

    // Validate and clean each question
    questions = questions.map((q) => ({
      question: q.question || 'Question not available',
      options:
        Array.isArray(q.options) && q.options.length === 4
          ? q.options
          : ['Option A', 'Option B', 'Option C', 'Option D'],
      correct: typeof q.correct === 'number' && q.correct >= 0 && q.correct <= 3 ? q.correct : 0,
      explanation: q.explanation || 'See documentation for more details.',
      difficulty: q.difficulty || 'medium',
      questionId: q.questionId || `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }));

    // Dedup: filter out any questions that are too similar to previously asked ones
    if (askedQuestions.length > 0) {
      questions = questions.filter((q) => {
        const qLower = q.question.toLowerCase().replace(/[^a-z0-9]/g, '');
        return !askedQuestions.some((asked) => {
          const askedLower = asked.toLowerCase().replace(/[^a-z0-9]/g, '');
          const shorter = Math.min(qLower.length, askedLower.length);
          const longer = Math.max(qLower.length, askedLower.length);
          if (shorter === 0) return false;
          if (qLower.includes(askedLower) || askedLower.includes(qLower)) return true;
          return shorter / longer > 0.8 && qLower === askedLower;
        });
      });
    }

    return NextResponse.json({
      questions,
      tokenUsage: result.usage,
      remainingBudget: result.remainingBudget,
    });
  } catch (error) {
    console.error('Question generation error:', error);

    const isRateLimit =
      error.message?.includes('429') ||
      error.message?.includes('quota') ||
      error.message?.includes('rate') ||
      error.message?.includes('RESOURCE_EXHAUSTED');
    const status = isRateLimit ? 429 : 500;
    const message = isRateLimit
      ? 'Rate limit reached. Please wait a moment before trying again.'
      : 'Failed to generate questions: ' + error.message;

    return NextResponse.json({ error: message }, { status });
  }
}

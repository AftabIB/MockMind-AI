import { NextResponse } from 'next/server';
import { generateJSONWithBudget } from '@/lib/gemini';

const LEVEL_NAMES = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

const LEVEL_CONTEXT = {
  1: 'basic syntax, fundamentals, simple concepts',
  2: 'intermediate patterns, practical usage, moderate complexity',
  3: 'advanced internals, optimization, expert scenarios',
};

// JSON Schema for the 7-question adaptive array
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
          role: {
            type: 'string',
            enum: ['q1', 'q2a', 'q2b', 'q3', 'q4a', 'q4b', 'q5'],
            description: 'The adaptive role/position of this question in the branching tree.',
          },
          questionId: {
            type: 'string',
            description: 'A short unique slug for this question topic.',
          },
        },
        required: ['question', 'options', 'correct', 'explanation', 'difficulty', 'role', 'questionId'],
      },
    },
  },
  required: ['questions'],
};

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request aborted' }, { status: 499 });
    }
    const { topic, level, askedQuestions = [], theoryText = '' } = body;

    // Build a strong avoid-list from previously asked questions
    const avoidSection = askedQuestions.length > 0
      ? `\n\n🚫 PREVIOUSLY ASKED — You MUST NOT repeat or rephrase any of these questions. Create COMPLETELY DIFFERENT questions about DIFFERENT sub-topics:\n${askedQuestions.slice(-30).map((q, i) => `${i + 1}. "${q}"`).join('\n')}\n\nI repeat: each new question MUST cover a DIFFERENT concept/sub-topic than ALL questions listed above. If you repeat or rephrase any, it is a FAILURE.`
      : '';

    // Build theory context section
    const theorySection = theoryText
      ? `\n\nBASE YOUR QUESTIONS ON THIS THEORY CONTENT (the student just studied this):\n---\n${theoryText.substring(0, 3000)}\n---\nAll questions MUST test concepts covered in the theory above. Do NOT ask about topics not covered in the theory.`
      : '';

    const systemInstruction = `You are an expert ${topic} quiz generator who creates TECHNICALLY PERFECT questions for an ADAPTIVE quiz system.

ACCURACY RULES:
1. For ANY code-based question, MENTALLY TRACE through each line of code step-by-step following the language's official specification before deciding the correct answer. Verify TWICE.
2. Follow each language's rules exactly for: integer vs float arithmetic, operator precedence, type conversions, indexing, scoping, etc.
3. The "correct" field must be the 0-based index (0, 1, 2, or 3) that matches the ACTUALLY correct option. Double-check this mapping.
4. All 4 options must be plausible — no obviously wrong answers.
5. If unsure about a code output, do NOT create that question — pick a different concept instead.

ADAPTIVE BRANCHING SYSTEM:
You are generating exactly 7 questions that form a BRANCHING DECISION TREE. The student will only answer 5 of these 7. The path depends on whether they got the previous question correct or wrong.

The 7 questions and their roles:
1. q1  (Easy, Normal)         → Always shown first. A straightforward easy question.
2. q2a (Easy, Tricky)         → Shown if Q1 was CORRECT. A trickier/more complex easy question.
3. q2b (Easy, Simple)         → Shown if Q1 was WRONG. A simpler/more common easy question.
4. q3  (Medium, Normal)       → Always shown third. A CHALLENGING medium question (see MEDIUM RULES below).
5. q4a (Medium, Tricky)       → Shown if Q3 was CORRECT. The MOST COMPLEX medium question possible (see MEDIUM RULES below).
6. q4b (Medium, Simple)       → Shown if Q3 was WRONG. A standard medium question.
7. q5  (Hard, Always)         → Always shown last. An EXTREMELY CHALLENGING hard question (see HARD RULES below).

MEDIUM QUESTION RULES (q3, q4a, q4b):
- Questions MUST require DEEP THINKING — not just recall or definition
- Combine TWO or more concepts from the theory into a SINGLE question
- For code questions: use tricky scenarios like nested operations, unexpected type coercions, scope chains, closure traps, or operator precedence puzzles
- For theory questions: ask "WHY does X behave this way?" or "What happens when X and Y interact?" — NOT surface-level "What is X?"
- q4a (tricky medium) should be the kind of question that makes the student pause and think hard — test subtle edge cases or counter-intuitive behaviors
- All 4 options must look equally correct at first glance — the student must REASON through to find the answer

HARD QUESTION RULES (q5):
- This should be the HARDEST question possible while still being from the theory content
- Combine MULTIPLE concepts into one scenario
- For code: write a multi-step code snippet (5-10 lines) where the output is non-obvious — involve tricky interactions like mutation + reference, async behavior, implicit conversions, or recursion
- For theory: ask about edge cases, internal mechanisms, or "what would go wrong if..." scenarios
- The question should put REAL PRESSURE on the brain — something even experienced developers might need to think about
- Make it feel like an interview question from a top tech company

QUESTION MIX:
- Mix of theory/conceptual questions (no code) and coding questions (with short code snippets)
- Each question must test a DISTINCT concept — no two questions should cover the same topic
- The "tricky" variants (q2a, q4a) should test edge cases, subtle behaviors, or less obvious aspects
- The "simple" variants (q2b, q4b) should test common, well-known patterns or straightforward concepts

OUTPUT FORMAT: Return a JSON object with a "questions" array containing exactly 7 question objects, in the EXACT order: q1, q2a, q2b, q3, q4a, q4b, q5.`;

    const prompt = `Generate exactly 7 adaptive multiple-choice questions about **${topic}**.

Level: ${LEVEL_NAMES[level]} (focus on ${LEVEL_CONTEXT[level]})

The 7 questions must follow this EXACT structure:
1. q1:  Easy difficulty, normal/straightforward question
2. q2a: Easy difficulty, tricky/complex variant (shown if q1 correct)
3. q2b: Easy difficulty, simple/common variant (shown if q1 wrong)
4. q3:  Medium difficulty — MUST be challenging, combine concepts, require deep thinking
5. q4a: Medium difficulty — the MOST COMPLEX medium question possible, edge cases, counter-intuitive behavior
6. q4b: Medium difficulty — standard medium question
7. q5:  Hard difficulty — EXTREMELY challenging, multi-concept, brain-pressure question (like a top-company interview question)

IMPORTANT FOR MEDIUM & HARD QUESTIONS:
- Do NOT ask simple "What is X?" or "Which of the following is true?" questions
- Instead ask: "What is the output of this code?", "Why does this behave differently than expected?", "What happens when X and Y interact?"
- For code questions: write tricky code where the answer requires careful step-by-step tracing
- Make all 4 options look plausible — the student should need to THINK to get the right answer

Requirements:
- Each question needs: question, options (exactly 4), correct (0-based index), explanation, difficulty, role, questionId
- The "role" field must be exactly one of: q1, q2a, q2b, q3, q4a, q4b, q5
- Return them in the exact order listed above
- Each question must cover a DIFFERENT concept${theorySection}${avoidSection}`;

    // 7 questions ≈ 5000-8000 tokens
    const maxOutputTokens = 8192;

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

    if (!Array.isArray(questions)) questions = [questions];

    // Define expected roles in order
    const EXPECTED_ROLES = ['q1', 'q2a', 'q2b', 'q3', 'q4a', 'q4b', 'q5'];
    const ROLE_DIFFICULTY = {
      q1: 'easy', q2a: 'easy', q2b: 'easy',
      q3: 'medium', q4a: 'medium', q4b: 'medium',
      q5: 'hard',
    };

    // Validate and clean each question
    questions = questions.map((q, idx) => ({
      question: q.question || 'Question not available',
      options:
        Array.isArray(q.options) && q.options.length === 4
          ? q.options
          : ['Option A', 'Option B', 'Option C', 'Option D'],
      correct: typeof q.correct === 'number' && q.correct >= 0 && q.correct <= 3 ? q.correct : 0,
      explanation: q.explanation || 'See documentation for more details.',
      difficulty: q.difficulty || ROLE_DIFFICULTY[EXPECTED_ROLES[idx]] || 'medium',
      role: q.role || EXPECTED_ROLES[idx] || `q${idx}`,
      questionId: q.questionId || `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }));

    // If AI didn't return exactly 7, try to fill/fix the roles
    if (questions.length < 7) {
      // Assign roles based on position if missing
      for (let i = 0; i < Math.min(questions.length, 7); i++) {
        if (!EXPECTED_ROLES.includes(questions[i].role)) {
          questions[i].role = EXPECTED_ROLES[i];
          questions[i].difficulty = ROLE_DIFFICULTY[EXPECTED_ROLES[i]];
        }
      }
    }

    // Sort questions by expected role order
    const roleOrder = Object.fromEntries(EXPECTED_ROLES.map((r, i) => [r, i]));
    questions.sort((a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99));

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

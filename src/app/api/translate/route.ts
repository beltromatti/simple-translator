import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';

const GEMINI_MODEL_ID = 'gemini-3.1-flash-lite';
const RATE_LIMIT_WINDOW_MS = 60_000;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_TEXT_LENGTH = readPositiveIntegerEnv('MAX_TRANSLATION_CHARS', 1800);
const RATE_LIMIT_MAX_REQUESTS = readIntegerEnv('RATE_LIMIT_MAX_REQUESTS', 6);
const DAILY_MAX_REQUESTS = readIntegerEnv('DAILY_TRANSLATION_LIMIT', 80);
const DAILY_MAX_CHARS = readIntegerEnv('DAILY_TRANSLATION_CHAR_LIMIT', 35_000);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const LANGUAGE_LABELS = {
  it: {
    name: 'Italian',
    code: 'it',
  },
  es: {
    name: 'Spanish',
    code: 'es',
  },
} satisfies Record<string, { name: string; code: string }>;

type ClientQuota = {
  minuteStartedAt: number;
  minuteRequests: number;
  dayStartedAt: number;
  dayRequests: number;
  dayChars: number;
};

type TranslationPayload = {
  text?: unknown;
  sourceLang?: unknown;
  targetLang?: unknown;
};

type GeminiTranslation = {
  translation?: unknown;
  idioms?: unknown;
  description?: unknown;
};

const quotaStore = globalThis as typeof globalThis & {
  __simpleTranslatorQuotaStore?: Map<string, ClientQuota>;
};

const quotas = quotaStore.__simpleTranslatorQuotaStore ?? new Map<string, ClientQuota>();
quotaStore.__simpleTranslatorQuotaStore = quotas;

function readIntegerEnv(name: string, fallback: number) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  const parsed = readIntegerEnv(name, fallback);
  return parsed > 0 ? parsed : fallback;
}

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const vercelIp = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  const fingerprint = [
    forwardedFor || realIp || vercelIp || 'unknown-ip',
    request.headers.get('x-simple-translator-client') || 'unknown-client',
    request.headers.get('user-agent') || 'unknown-agent',
    request.headers.get('accept-language') || 'unknown-language',
  ].join('|');

  return createHash('sha256').update(fingerprint).digest('hex');
}

function checkRateLimit(clientId: string, textLength: number) {
  const now = Date.now();
  const existing = quotas.get(clientId);
  const quota: ClientQuota = existing ?? {
    minuteStartedAt: now,
    minuteRequests: 0,
    dayStartedAt: now,
    dayRequests: 0,
    dayChars: 0,
  };

  if (now - quota.minuteStartedAt >= RATE_LIMIT_WINDOW_MS) {
    quota.minuteStartedAt = now;
    quota.minuteRequests = 0;
  }

  if (now - quota.dayStartedAt >= DAILY_WINDOW_MS) {
    quota.dayStartedAt = now;
    quota.dayRequests = 0;
    quota.dayChars = 0;
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((quota.minuteStartedAt + RATE_LIMIT_WINDOW_MS - now) / 1000),
  );

  if (quota.minuteRequests >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      status: 429,
      retryAfterSeconds,
      error: 'Too many translation requests. Please wait a moment and try again.',
    };
  }

  if (quota.dayRequests >= DAILY_MAX_REQUESTS || quota.dayChars + textLength > DAILY_MAX_CHARS) {
    return {
      allowed: false,
      status: 429,
      retryAfterSeconds: Math.max(60, Math.ceil((quota.dayStartedAt + DAILY_WINDOW_MS - now) / 1000)),
      error: 'Daily translation limit reached for this device. Please try again later.',
    };
  }

  quota.minuteRequests += 1;
  quota.dayRequests += 1;
  quota.dayChars += textLength;
  quotas.set(clientId, quota);

  return { allowed: true };
}

function resolveLanguageKey(value: unknown): keyof typeof LANGUAGE_LABELS | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.toLowerCase();
  return normalized in LANGUAGE_LABELS
    ? (normalized as keyof typeof LANGUAGE_LABELS)
    : undefined;
}

export async function POST(request: Request) {
  let body: TranslationPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const sourceKey = resolveLanguageKey(body.sourceLang);
  const targetKey = resolveLanguageKey(body.targetLang);

  if (!text || !sourceKey || !targetKey) {
    return NextResponse.json({ error: 'Missing or invalid translation parameters' }, { status: 400 });
  }

  if (sourceKey === targetKey) {
    return NextResponse.json({ error: 'Source and target languages must be different' }, { status: 400 });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text is too long. Please keep it under ${MAX_TEXT_LENGTH} characters.` },
      { status: 413 },
    );
  }

  const rateLimit = checkRateLimit(getClientIdentifier(request), text.length);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.error },
      {
        status: rateLimit.status,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Translation service is not configured' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_ID });
  const sourceLanguageName = LANGUAGE_LABELS[sourceKey].name;
  const targetLanguageName = LANGUAGE_LABELS[targetKey].name;

  const prompt = `You are an expert Italian-Spanish translator. Translate the provided text from ${sourceLanguageName} to ${targetLanguageName}.

Return your answer as valid JSON only (no markdown, explanations, or code fences) with exactly the following structure:
{
  "translation": "Main translated text as a single string.",
  "idioms": ["Up to two idioms or phrases conveying a similar meaning in ${targetLanguageName}. Empty array if none."],
  "description": "One short sentence in ${targetLanguageName} explaining the context, tone, or nuance."
}

Text to translate (delimited by triple quotes):
"""
${text}
"""`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();
    const textResponse = rawText.replace(/```json|```/gi, '').trim();

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    const jsonPayload = jsonMatch ? jsonMatch[0] : textResponse;

    const parsedResponse: GeminiTranslation = JSON.parse(jsonPayload);

    const translation =
      typeof parsedResponse.translation === 'string' && parsedResponse.translation.trim()
        ? parsedResponse.translation.trim()
        : textResponse.split('\n')[0]?.trim() || textResponse;

    const idioms = Array.isArray(parsedResponse.idioms)
      ? parsedResponse.idioms
          .filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()))
          .slice(0, 2)
      : [];

    const description =
      typeof parsedResponse.description === 'string' ? parsedResponse.description.trim() : '';

    return NextResponse.json(
      { translation, idioms, description },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return NextResponse.json({ error: 'Failed to get translation from AI model' }, { status: 500 });
  }
}

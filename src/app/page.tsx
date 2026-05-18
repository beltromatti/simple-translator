"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import LanguageToggle from '@/components/LanguageToggle';

type SamplePrompt = {
  text: string;
  direction: boolean; // true = IT → ES, false = ES → IT
};

const CLIENT_ID_STORAGE_KEY = 'simple-translator-client-id';

const samplePrompts: SamplePrompt[] = [
  { text: 'Sto cercando un ristorante intimo per festeggiare un anniversario.', direction: true },
  { text: '¿Puedes indicarme dónde puedo alquilar un coche eléctrico?', direction: false },
  { text: 'Vorrei condividere un aggiornamento sintetico per il team.', direction: true },
];

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [idioms, setIdioms] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [isItalianToSpanish, setIsItalianToSpanish] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedInput = useMemo(() => inputText.trim(), [inputText]);
  const charCount = useMemo(() => inputText.trim().length, [inputText]);
  const currentDirectionLabel = isItalianToSpanish ? 'Italian → Spanish' : 'Spanish → Italian';

  const getClientId = () => {
    if (typeof window === 'undefined') {
      return 'server';
    }

    const existing = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);

    if (existing) {
      return existing;
    }

    const generated =
      typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, generated);
    return generated;
  };

  const handleTranslate = useCallback(async () => {
    if (!trimmedInput) {
      return;
    }

    setLoading(true);
    setError(null);
    setTranslatedText('');
    setIdioms([]);
    setDescription('');

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Simple-Translator-Client': getClientId(),
        },
        body: JSON.stringify({
          text: trimmedInput,
          sourceLang: isItalianToSpanish ? 'it' : 'es',
          targetLang: isItalianToSpanish ? 'es' : 'it',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTranslatedText(typeof data.translation === 'string' ? data.translation : '');
      setIdioms(Array.isArray(data.idioms) ? data.idioms.filter(Boolean) : []);
      setDescription(typeof data.description === 'string' ? data.description : '');
    } catch (err: unknown) {
      console.error('Error during translation:', err);
      const message =
        err instanceof Error ? err.message : 'Something went wrong while translating.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isItalianToSpanish, trimmedInput]);

  useEffect(() => {
    if (!trimmedInput) {
      setTranslatedText('');
      setIdioms([]);
      setDescription('');
      setError(null);
    }
  }, [trimmedInput]);

  const handleSampleSelect = (sample: SamplePrompt) => {
    setInputText(sample.text);
    if (isItalianToSpanish !== sample.direction) {
      setIsItalianToSpanish(sample.direction);
    }
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[#050505]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div className="absolute left-1/2 top-[-10%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-neutral-800/20 blur-3xl" />
        <div className="absolute right-[-10%] top-1/4 h-[360px] w-[360px] rounded-full bg-neutral-700/15 blur-3xl" />
        <div className="absolute bottom-[-25%] left-[-10%] h-[460px] w-[460px] rounded-full bg-neutral-900/25 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 pb-16 pt-20 sm:px-10 lg:px-16">
        <header className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Simple Translator
          </h1>
          <p className="mt-4 text-sm text-neutral-400 sm:text-base">
            Italian ↔ Spanish translations with idioms and nuance, powered by Gemini 3.1 Flash Lite.
          </p>
        </header>

        <section className="mt-12 rounded-[24px] glass-panel px-6 py-8 sm:px-9 sm:py-10">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-200">Instant workspace</p>
                <p className="text-xs text-neutral-500">
                  Choose direction, type, and review smart suggestions.
                </p>
              </div>
              <LanguageToggle
                isItalianToSpanish={isItalianToSpanish}
                onToggle={() => setIsItalianToSpanish((prev) => !prev)}
              />
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-neutral-500 sm:text-xs">
                  <span>Input</span>
                  <span>{currentDirectionLabel} · {charCount} chars</span>
                </div>
                <textarea
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  placeholder={
                    isItalianToSpanish
                      ? 'Type or paste Italian text to translate...'
                      : 'Escribe o pega el texto en español que quieres traducir...'
                  }
                  className="h-60 w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-base text-neutral-100 shadow-inner shadow-black/30 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/20 sm:h-64 sm:text-lg"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {samplePrompts.map((sample) => (
                    <button
                      key={sample.text}
                      type="button"
                      onClick={() => handleSampleSelect(sample)}
                      className="pill transition hover:border-white/20 hover:bg-white/15"
                    >
                      {sample.text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-neutral-500 sm:text-xs">
                  <span>Output</span>
                  <span>{loading ? 'Translating…' : 'Live preview'}</span>
                </div>
                <div className="flex h-60 flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-6 shadow-inner shadow-black/60 sm:h-64">
                  {loading && (
                    <div className="flex flex-1 items-center justify-center gap-3 text-neutral-400">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
                      <span className="text-sm font-medium uppercase tracking-wide">Translating</span>
                    </div>
                  )}

                  {!loading && error && (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                      <p className="text-sm font-medium text-rose-300">Error</p>
                      <p className="max-w-sm text-xs text-rose-200/80 sm:text-sm">{error}</p>
                    </div>
                  )}

                  {!loading && !error && (
                    <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1 text-sm leading-relaxed text-neutral-200 sm:text-base">
                      {translatedText ? (
                        <p className="text-lg font-semibold text-white sm:text-xl">{translatedText}</p>
                      ) : (
                        <p className="text-neutral-500">Translation preview will appear here.</p>
                      )}

                      {idioms.length > 0 && (
                        <div>
                          <span className="text-xs uppercase tracking-wide text-neutral-500">
                            Related idioms
                          </span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {idioms.map((idiom) => (
                              <span key={idiom} className="pill bg-white/10 text-neutral-100">
                                {idiom}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {description && (
                        <div>
                          <span className="text-xs uppercase tracking-wide text-neutral-500">
                            Context
                          </span>
                          <p className="mt-2 text-sm text-neutral-300">{description}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={() => setInputText('')}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => void handleTranslate()}
                disabled={loading || !trimmedInput}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black shadow-[0_18px_40px_-22px_rgba(255,255,255,0.45)] transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                <span>{loading ? 'Translating…' : 'Translate'}</span>
                {!loading && (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L21 10.5m0 0l-3.75 3.75M21 10.5H3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </section>

        <footer className="mt-10 flex flex-col items-center gap-1 text-[11px] text-neutral-500 sm:text-xs">
          <p>Powered by Gemini 3.1 Flash Lite · Italian ↔ Spanish only.</p>
          <p>Built for focused, context-aware collaboration.</p>
        </footer>
      </div>
    </main>
  );
}

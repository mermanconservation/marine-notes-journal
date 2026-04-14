import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

export interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: "normal" | "large" | "x-large";
  largeTargets: boolean;
  largeCursor: boolean;
  dyslexicFont: boolean;
  lineSpacing: "normal" | "relaxed" | "loose";
  wideLetterSpacing: boolean;
  lowStimulation: boolean;
  theme: "default" | "dark" | "sepia" | "grayscale";
  reducedLayout: boolean;
  predictableNav: boolean;
  readingMode: boolean;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  fontSize: "normal",
  largeTargets: false,
  largeCursor: false,
  dyslexicFont: false,
  lineSpacing: "normal",
  wideLetterSpacing: false,
  lowStimulation: false,
  theme: "default",
  reducedLayout: false,
  predictableNav: false,
  readingMode: false,
};

export interface AccessibilityPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  settings: Partial<AccessibilitySettings>;
}

export const builtInPresets: AccessibilityPreset[] = [
  {
    id: "low-vision",
    name: "Low Vision",
    emoji: "👁️",
    description: "High contrast, large text, large targets",
    settings: { highContrast: true, fontSize: "x-large", largeTargets: true, largeCursor: true },
  },
  {
    id: "motor",
    name: "Motor",
    emoji: "🖐️",
    description: "Large targets and cursor, simplified layout",
    settings: { largeTargets: true, largeCursor: true, reducedLayout: true },
  },
  {
    id: "calm",
    name: "Calm Mode",
    emoji: "🧘",
    description: "Low stimulation, dark theme, no animations",
    settings: { lowStimulation: true, theme: "dark", reducedLayout: true, predictableNav: true },
  },
  {
    id: "dyslexia",
    name: "Dyslexia",
    emoji: "📖",
    description: "OpenDyslexic font, relaxed spacing",
    settings: { dyslexicFont: true, lineSpacing: "relaxed", wideLetterSpacing: true, fontSize: "large" },
  },
  {
    id: "reading",
    name: "Reading",
    emoji: "📕",
    description: "Single-column, large text, focused reading",
    settings: { readingMode: true, fontSize: "large", lineSpacing: "relaxed", reducedLayout: true },
  },
];

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void;
  resetAll: () => void;
  speakText: (text: string) => void;
  isSpeaking: boolean;
  stopSpeaking: () => void;
  activePreset: string | null;
  applyPreset: (preset: AccessibilityPreset) => void;
  customPresets: AccessibilityPreset[];
  saveCurrentAsPreset: (name: string, emoji: string) => void;
  deleteCustomPreset: (id: string) => void;
  announce: (message: string, priority?: "polite" | "assertive") => void;
  isListening: boolean;
  startListening: (onResult: (text: string) => void) => void;
  stopListening: () => void;
  voiceSupported: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

const STORAGE_KEY = "a11y-toolbox-settings";
const PRESETS_KEY = "a11y-toolbox-custom-presets";

function loadSettings(): AccessibilitySettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch {}
  return defaultSettings;
}

function loadCustomPresets(): AccessibilityPreset[] {
  try {
    const saved = localStorage.getItem(PRESETS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(loadSettings);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<AccessibilityPreset[]>(loadCustomPresets);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  const voiceSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setActivePreset(null);
  }, []);

  const resetAll = useCallback(() => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
    setActivePreset(null);
  }, []);

  const speakText = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const applyPreset = useCallback((preset: AccessibilityPreset) => {
    const newSettings = { ...defaultSettings, ...preset.settings };
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    setActivePreset(preset.id);
  }, []);

  const saveCurrentAsPreset = useCallback((name: string, emoji: string) => {
    const preset: AccessibilityPreset = {
      id: `custom-${Date.now()}`,
      name,
      emoji,
      description: "Custom preset",
      settings: { ...settings },
    };
    setCustomPresets(prev => {
      const next = [...prev, preset];
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
      return next;
    });
  }, [settings]);

  const deleteCustomPreset = useCallback((id: string) => {
    setCustomPresets(prev => {
      const next = prev.filter(p => p.id !== id);
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    const el = priority === "assertive" ? assertiveRef.current : politeRef.current;
    if (el) {
      el.textContent = "";
      requestAnimationFrame(() => {
        el.textContent = message;
      });
    }
  }, []);

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (!voiceSupported) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    onResultRef.current = onResult;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResultRef.current?.(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [voiceSupported]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    html.classList.remove("high-contrast", "theme-dark", "theme-sepia", "theme-grayscale", "dark");
    if (settings.highContrast) html.classList.add("high-contrast");
    if (settings.theme === "dark") html.classList.add("theme-dark");
    if (settings.theme === "sepia") html.classList.add("theme-sepia");
    if (settings.theme === "grayscale") html.classList.add("theme-grayscale");

    html.classList.toggle("low-stimulation", settings.lowStimulation);

    body.classList.toggle("font-dyslexic", settings.dyslexicFont);

    body.classList.remove("line-spacing-relaxed", "line-spacing-loose");
    if (settings.lineSpacing === "relaxed") body.classList.add("line-spacing-relaxed");
    if (settings.lineSpacing === "loose") body.classList.add("line-spacing-loose");

    body.classList.toggle("letter-spacing-wide", settings.wideLetterSpacing);
    body.classList.toggle("large-cursor", settings.largeCursor);
    body.classList.toggle("reading-mode", settings.readingMode);

    const sizes = { normal: "16px", large: "20px", "x-large": "24px" };
    html.style.fontSize = sizes[settings.fontSize];

    return () => {
      html.style.fontSize = "";
    };
  }, [settings]);

  useEffect(() => {
    if (activePreset) {
      const all = [...builtInPresets, ...customPresets];
      const preset = all.find(p => p.id === activePreset);
      if (preset) announce(`${preset.name} preset activated`);
    }
  }, [activePreset, announce, customPresets]);

  return (
    <AccessibilityContext.Provider value={{
      settings, updateSetting, resetAll, speakText, isSpeaking, stopSpeaking,
      activePreset, applyPreset, customPresets, saveCurrentAsPreset, deleteCustomPreset,
      announce, isListening, startListening, stopListening, voiceSupported,
    }}>
      {children}
      <div ref={politeRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      <div ref={assertiveRef} aria-live="assertive" aria-atomic="true" className="sr-only" />
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}

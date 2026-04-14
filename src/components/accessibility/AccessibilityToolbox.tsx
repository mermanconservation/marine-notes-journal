import { useState, useEffect, useRef } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { ToolboxSection } from "./ToolboxSection";
import { ToolboxToggle } from "./ToolboxToggle";
import { ToolboxSelect } from "./ToolboxSelect";
import { PresetsSection } from "./PresetsSection";
import {
  Eye, Move, BookOpen, Shield, Brain,
  Contrast, Type, MousePointer, Keyboard,
  Volume2, Palette, RotateCcw,
  Accessibility, X, Mic, MicOff, BookOpenCheck
} from "lucide-react";

export function AccessibilityToolbox() {
  const {
    settings, updateSetting, resetAll, speakText, isSpeaking, stopSpeaking,
    announce, isListening, startListening, stopListening, voiceSupported,
  } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const large = settings.largeTargets;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && panelRef.current) {
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) focusable[0].focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) announce("Accessibility toolbox opened");
  }, [isOpen, announce]);

  return (
    <>
      {/* Floating trigger button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 rounded-full bg-primary text-primary-foreground
          shadow-lg hover:shadow-xl transition-shadow
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2
          ${large ? "w-16 h-16" : "w-12 h-12"}
          flex items-center justify-center`}
        aria-label={isOpen ? "Close accessibility toolbox" : "Open accessibility toolbox"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className={large ? "w-7 h-7" : "w-5 h-5"} /> : <Accessibility className={large ? "w-7 h-7" : "w-5 h-5"} />}
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Accessibility Settings"
          aria-modal="false"
          className={`fixed bottom-20 right-6 z-50 bg-background border border-border rounded-2xl shadow-2xl
            overflow-hidden
            ${large ? "w-[420px] max-h-[80vh]" : "w-[380px] max-h-[75vh]"}
          `}
        >
          {/* Header */}
          <div className={`sticky top-0 z-10 bg-background border-b border-border flex items-center justify-between
            ${large ? "px-6 py-4" : "px-5 py-3"}`}>
            <div>
              <h2 className={`font-bold text-foreground ${large ? "text-xl" : "text-base"}`}>
                ♿ Accessibility Toolbox
              </h2>
              <p className={`text-muted-foreground ${large ? "text-sm" : "text-xs"} mt-0.5`}>
                Customize your experience
              </p>
            </div>
            <button
              onClick={() => { resetAll(); announce("All settings reset to defaults"); }}
              className={`rounded-lg border border-border bg-secondary text-secondary-foreground font-medium
                hover:bg-destructive hover:text-destructive-foreground transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                ${large ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs"}`}
              aria-label="Reset all settings to defaults"
            >
              <RotateCcw className="w-4 h-4 inline mr-1" />
              Reset
            </button>
          </div>

          {/* Scrollable content */}
          <div className={`overflow-y-auto ${large ? "p-6 space-y-6 max-h-[calc(80vh-80px)]" : "p-4 space-y-5 max-h-[calc(75vh-64px)]"}`}>

            <PresetsSection />

            <ToolboxSection title="Vision" emoji="👁️">
              <ToolboxToggle
                label="High Contrast"
                description="Stronger colors and borders"
                checked={settings.highContrast}
                onCheckedChange={v => { updateSetting("highContrast", v); announce(v ? "High contrast enabled" : "High contrast disabled"); }}
                icon={<Contrast className="w-5 h-5" />}
              />
              <ToolboxSelect
                label="Text Size"
                value={settings.fontSize}
                onChange={v => { updateSetting("fontSize", v); announce(`Text size: ${v}`); }}
                options={[
                  { value: "normal", label: "A" },
                  { value: "large", label: "A+" },
                  { value: "x-large", label: "A++" },
                ]}
                icon={<Type className="w-5 h-5" />}
              />
              <ToolboxToggle
                label="Text-to-Speech"
                description={isSpeaking ? "Speaking... tap to stop" : "Read content aloud"}
                checked={isSpeaking}
                onCheckedChange={v => {
                  if (v) speakText("Text to speech is now active. Select any text on the page to have it read aloud.");
                  else stopSpeaking();
                }}
                icon={<Volume2 className="w-5 h-5" />}
              />
            </ToolboxSection>

            <ToolboxSection title="Motor" emoji="🖐️">
              <ToolboxToggle
                label="Large Targets"
                description="Bigger buttons and touch areas"
                checked={settings.largeTargets}
                onCheckedChange={v => { updateSetting("largeTargets", v); announce(v ? "Large targets enabled" : "Large targets disabled"); }}
                icon={<MousePointer className="w-5 h-5" />}
              />
              <ToolboxToggle
                label="Large Cursor"
                description="Easier to see mouse pointer"
                checked={settings.largeCursor}
                onCheckedChange={v => { updateSetting("largeCursor", v); announce(v ? "Large cursor enabled" : "Large cursor disabled"); }}
                icon={<MousePointer className="w-5 h-5" />}
              />
              <div className={`flex items-center gap-3 rounded-lg border border-border bg-card
                ${large ? "p-4" : "p-3"}`}>
                <Keyboard className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <span className={`flex-1 ${large ? "text-lg" : "text-sm"} text-foreground font-medium`}>Keyboard Navigation</span>
                <span className={`rounded-md bg-muted px-2 py-1 text-muted-foreground ${large ? "text-sm" : "text-xs"}`}>
                  Tab + Enter
                </span>
              </div>

              {voiceSupported ? (
                <button
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                      announce("Voice input stopped");
                    } else {
                      announce("Listening... speak now", "assertive");
                      startListening((text) => {
                        announce(`Heard: "${text}"`);
                      });
                    }
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg border text-left transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${isListening
                      ? "border-destructive bg-destructive/10"
                      : "border-border bg-card hover:bg-accent/10"
                    }
                    ${large ? "p-4" : "p-3"}`}
                  role="switch"
                  aria-checked={isListening}
                >
                  {isListening ? <MicOff className="w-5 h-5 text-destructive flex-shrink-0" /> : <Mic className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                  <span className="flex-1 min-w-0">
                    <span className={`block font-medium text-foreground ${large ? "text-lg" : "text-sm"}`}>
                      Voice Input
                    </span>
                    <span className={`block text-muted-foreground ${large ? "text-base" : "text-xs"} mt-0.5`}>
                      {isListening ? "Listening... speak now" : "Hands-free input"}
                    </span>
                  </span>
                  {isListening && (
                    <span className="flex-shrink-0 w-3 h-3 rounded-full bg-destructive animate-pulse" />
                  )}
                </button>
              ) : (
                <div className={`flex items-center gap-3 rounded-lg border border-dashed border-border bg-card opacity-70
                  ${large ? "p-4" : "p-3"}`}>
                  <Mic className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <span className={`flex-1 ${large ? "text-lg" : "text-sm"} text-muted-foreground font-medium`}>
                    Voice Input
                  </span>
                  <span className={`rounded-md bg-muted px-2 py-1 text-muted-foreground ${large ? "text-sm" : "text-xs"}`}>
                    Not supported
                  </span>
                </div>
              )}
            </ToolboxSection>

            <ToolboxSection title="Reading" emoji="📖">
              <ToolboxToggle
                label="Reading Mode"
                description="Single-column, focused reading"
                checked={settings.readingMode}
                onCheckedChange={v => { updateSetting("readingMode", v); announce(v ? "Reading mode enabled" : "Reading mode disabled"); }}
                icon={<BookOpenCheck className="w-5 h-5" />}
              />
              <ToolboxToggle
                label="OpenDyslexic Font"
                description="Easier-to-read letter shapes"
                checked={settings.dyslexicFont}
                onCheckedChange={v => { updateSetting("dyslexicFont", v); announce(v ? "Dyslexic font enabled" : "Dyslexic font disabled"); }}
                icon={<BookOpen className="w-5 h-5" />}
              />
              <ToolboxSelect
                label="Line Spacing"
                value={settings.lineSpacing}
                onChange={v => { updateSetting("lineSpacing", v); announce(`Line spacing: ${v}`); }}
                options={[
                  { value: "normal", label: "Normal" },
                  { value: "relaxed", label: "Relaxed" },
                  { value: "loose", label: "Loose" },
                ]}
                icon={<Type className="w-5 h-5" />}
              />
              <ToolboxToggle
                label="Wide Letter Spacing"
                description="More space between letters"
                checked={settings.wideLetterSpacing}
                onCheckedChange={v => { updateSetting("wideLetterSpacing", v); announce(v ? "Wide letter spacing enabled" : "Wide letter spacing disabled"); }}
                icon={<Type className="w-5 h-5" />}
              />
            </ToolboxSection>

            <ToolboxSection title="Sensory" emoji="🧘">
              <ToolboxToggle
                label="Low Stimulation"
                description="No animations, muted visuals"
                checked={settings.lowStimulation}
                onCheckedChange={v => { updateSetting("lowStimulation", v); announce(v ? "Low stimulation enabled" : "Low stimulation disabled"); }}
                icon={<Shield className="w-5 h-5" />}
              />
              <ToolboxSelect
                label="Color Theme"
                value={settings.theme}
                onChange={v => { updateSetting("theme", v); announce(`Theme: ${v}`); }}
                options={[
                  { value: "default", label: "☀️" },
                  { value: "dark", label: "🌙" },
                  { value: "sepia", label: "📜" },
                  { value: "grayscale", label: "⚫" },
                ]}
                icon={<Palette className="w-5 h-5" />}
              />
            </ToolboxSection>

            <ToolboxSection title="Focus & Routine" emoji="🧩">
              <ToolboxToggle
                label="Simplified Layout"
                description="Hide decorative elements"
                checked={settings.reducedLayout}
                onCheckedChange={v => { updateSetting("reducedLayout", v); announce(v ? "Simplified layout enabled" : "Simplified layout disabled"); }}
                icon={<Brain className="w-5 h-5" />}
              />
              <ToolboxToggle
                label="Predictable Navigation"
                description="Consistent placement, no surprises"
                checked={settings.predictableNav}
                onCheckedChange={v => { updateSetting("predictableNav", v); announce(v ? "Predictable navigation enabled" : "Predictable navigation disabled"); }}
                icon={<Brain className="w-5 h-5" />}
              />
            </ToolboxSection>
          </div>
        </div>
      )}
    </>
  );
}

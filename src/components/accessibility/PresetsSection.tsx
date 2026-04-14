import { useState } from "react";
import { useAccessibility, builtInPresets } from "@/context/AccessibilityContext";
import { ToolboxSection } from "./ToolboxSection";
import { Save, Trash2, Check } from "lucide-react";

export function PresetsSection() {
  const { activePreset, applyPreset, customPresets, saveCurrentAsPreset, deleteCustomPreset, settings } = useAccessibility();
  const large = settings.largeTargets;
  const [showSave, setShowSave] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("⭐");

  const allPresets = [...builtInPresets, ...customPresets];

  return (
    <ToolboxSection title="Quick Presets" emoji="⚡">
      <div className="grid grid-cols-2 gap-2">
        {allPresets.map(preset => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            className={`relative rounded-lg border text-left transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              ${large ? "p-4" : "p-3"}
              ${activePreset === preset.id
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-accent/10"
              }`}
            aria-pressed={activePreset === preset.id}
          >
            {activePreset === preset.id && (
              <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
            )}
            <span className="text-lg" aria-hidden>{preset.emoji}</span>
            <span className={`block font-medium text-foreground ${large ? "text-base" : "text-xs"} mt-1`}>
              {preset.name}
            </span>
            <span className={`block text-muted-foreground ${large ? "text-sm" : "text-[10px]"} mt-0.5`}>
              {preset.description}
            </span>
            {preset.id.startsWith("custom-") && (
              <button
                onClick={e => { e.stopPropagation(); deleteCustomPreset(preset.id); }}
                className="absolute bottom-2 right-2 text-muted-foreground hover:text-destructive p-1"
                aria-label={`Delete ${preset.name} preset`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </button>
        ))}
      </div>

      {!showSave ? (
        <button
          onClick={() => setShowSave(true)}
          className={`w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border
            text-muted-foreground hover:text-foreground hover:border-primary transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
            ${large ? "p-4 text-sm" : "p-3 text-xs"}`}
        >
          <Save className="w-4 h-4" />
          Save current as preset
        </button>
      ) : (
        <div className={`rounded-lg border border-border bg-card ${large ? "p-4" : "p-3"} space-y-2`}>
          <div className="flex gap-2">
            <select
              value={newEmoji}
              onChange={e => setNewEmoji(e.target.value)}
              className={`rounded border border-border bg-secondary px-2 py-1 ${large ? "text-base" : "text-sm"}`}
              aria-label="Preset emoji"
            >
              {["⭐", "🎯", "💡", "🔥", "🌈", "🎨", "✨", "🏠"].map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Preset name"
              className={`flex-1 rounded border border-border bg-secondary px-3 py-1 text-foreground placeholder:text-muted-foreground
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${large ? "text-base" : "text-sm"}`}
              aria-label="Preset name"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (newName.trim()) {
                  saveCurrentAsPreset(newName.trim(), newEmoji);
                  setNewName("");
                  setShowSave(false);
                }
              }}
              disabled={!newName.trim()}
              className={`flex-1 rounded-lg bg-primary text-primary-foreground font-medium
                disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                ${large ? "py-2 text-sm" : "py-1.5 text-xs"}`}
            >
              Save
            </button>
            <button
              onClick={() => { setShowSave(false); setNewName(""); }}
              className={`rounded-lg bg-secondary text-secondary-foreground font-medium transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                ${large ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs"}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </ToolboxSection>
  );
}

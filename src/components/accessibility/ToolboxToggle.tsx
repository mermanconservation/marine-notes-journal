import { useAccessibility } from "@/context/AccessibilityContext";
import { Switch } from "@/components/ui/switch";

interface ToolboxToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon: React.ReactNode;
}

export function ToolboxToggle({ label, description, checked, onCheckedChange, icon }: ToolboxToggleProps) {
  const { settings } = useAccessibility();
  const large = settings.largeTargets;

  return (
    <button
      onClick={() => onCheckedChange(!checked)}
      className={`w-full flex items-center gap-3 rounded-lg border border-border bg-card text-left transition-colors
        hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${large ? "p-4 min-h-[64px]" : "p-3 min-h-[48px]"}
        ${checked ? "border-primary bg-primary/5" : ""}
      `}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <span className={`flex-shrink-0 ${large ? "text-xl" : "text-base"} text-muted-foreground`}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block font-medium text-foreground ${large ? "text-lg" : "text-sm"}`}>{label}</span>
        {description && (
          <span className={`block text-muted-foreground ${large ? "text-base" : "text-xs"} mt-0.5`}>{description}</span>
        )}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="flex-shrink-0"
        tabIndex={-1}
        aria-hidden
      />
    </button>
  );
}

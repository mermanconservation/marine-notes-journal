import { useAccessibility } from "@/context/AccessibilityContext";

interface ToolboxSelectProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  icon: React.ReactNode;
}

export function ToolboxSelect<T extends string>({ label, value, onChange, options, icon }: ToolboxSelectProps<T>) {
  const { settings } = useAccessibility();
  const large = settings.largeTargets;

  return (
    <div className={`flex items-center gap-3 rounded-lg border border-border bg-card
      ${large ? "p-4 min-h-[64px]" : "p-3 min-h-[48px]"}`}>
      <span className={`flex-shrink-0 ${large ? "text-xl" : "text-base"} text-muted-foreground`}>
        {icon}
      </span>
      <span className={`flex-1 font-medium text-foreground ${large ? "text-lg" : "text-sm"}`}>{label}</span>
      <div className="flex gap-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              ${large ? "px-4 py-2 text-base" : "px-3 py-1.5 text-xs"}
              ${value === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent/10"
              }`}
            aria-pressed={value === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

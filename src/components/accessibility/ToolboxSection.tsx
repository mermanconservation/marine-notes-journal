import { useAccessibility } from "@/context/AccessibilityContext";

interface ToolboxSectionProps {
  title: string;
  emoji: string;
  children: React.ReactNode;
}

export function ToolboxSection({ title, emoji, children }: ToolboxSectionProps) {
  const { settings } = useAccessibility();
  const large = settings.largeTargets;

  return (
    <section className="space-y-2" role="group" aria-label={title}>
      <h3 className={`flex items-center gap-2 font-semibold text-foreground ${large ? "text-lg" : "text-sm"} px-1`}>
        <span aria-hidden>{emoji}</span>
        {title}
      </h3>
      <div className="space-y-2">
        {children}
      </div>
    </section>
  );
}

import { cn } from "@/lib/utils";

interface ToggleChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}

export function ToggleChip({ label, active, onClick, className }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent",
        className
      )}
    >
      {label}
    </button>
  );
}

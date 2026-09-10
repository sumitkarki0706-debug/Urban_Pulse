export const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  acknowledged: "Acknowledged",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
  closed: "Closed",
};

export const STATUS_VARIANT: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
  submitted: "secondary",
  acknowledged: "outline",
  assigned: "outline",
  in_progress: "default",
  resolved: "default",
  rejected: "destructive",
  closed: "secondary",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-chart-3/20 text-chart-3",
  high: "bg-accent/20 text-accent-foreground",
  critical: "bg-destructive/20 text-destructive",
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

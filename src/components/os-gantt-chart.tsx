import type { ScheduledSlice } from "@/lib/os-scheduling";
import { cn } from "@/lib/utils";

const COLORS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

export function GanttChart({ timeline }: { timeline: ScheduledSlice[] }) {
  if (timeline.length === 0) {
    return <p className="text-sm text-muted-foreground">No processes to schedule yet.</p>;
  }

  const start = timeline[0].start;
  const end = timeline[timeline.length - 1].end;
  const span = Math.max(1, end - start);
  let colorIdx = -1;
  const colorFor = new Map<string, string>();

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="flex w-full overflow-hidden rounded-md border border-border">
          {timeline.map((slice, i) => {
            if (!slice.idle && !colorFor.has(slice.processId)) {
              colorIdx += 1;
              colorFor.set(slice.processId, COLORS[colorIdx % COLORS.length]);
            }
            const width = `${((slice.end - slice.start) / span) * 100}%`;
            return (
              <div
                key={`${slice.processId}-${i}`}
                style={{ width }}
                title={`${slice.taskName} • ${slice.start} → ${slice.end}`}
                className={cn(
                  "flex h-12 min-w-[2.5rem] items-center justify-center border-r border-border/60 text-xs font-semibold last:border-r-0",
                  slice.idle
                    ? "bg-muted text-muted-foreground [background-image:repeating-linear-gradient(45deg,transparent,transparent_6px,hsl(var(--border))_6px,hsl(var(--border))_7px)]"
                    : cn(colorFor.get(slice.processId), "text-background"),
                )}
              >
                {slice.idle ? "Idle" : slice.processId}
              </div>
            );
          })}
        </div>
        <div className="relative mt-1 flex w-full">
          {timeline.map((slice, i) => (
            <div key={i} style={{ width: `${((slice.end - slice.start) / span) * 100}%` }} className="min-w-[2.5rem] text-xs text-muted-foreground">
              {slice.start}
            </div>
          ))}
          <span className="text-xs text-muted-foreground">{end}</span>
        </div>
      </div>
    </div>
  );
}

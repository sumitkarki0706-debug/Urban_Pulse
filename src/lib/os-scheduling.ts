/**
 * UrbanPulse — Operating System Process Scheduling (application-level simulation).
 *
 * NOTE: This is an educational simulation. It does NOT control the real CPU or
 * the host operating system scheduler. Civic maintenance tasks are treated as
 * "processes" and a maintenance worker is treated as the "CPU".
 */

export type Algorithm = "fcfs" | "sjf" | "priority";

export const ALGORITHM_LABELS: Record<Algorithm, string> = {
  fcfs: "FCFS (First Come First Serve)",
  sjf: "SJF (Shortest Job First, non-preemptive)",
  priority: "Priority Scheduling (non-preemptive)",
};

export interface SchedProcess {
  processId: string;
  complaintCode?: string | null;
  taskName: string;
  category?: string | null;
  arrivalTime: number;
  burstTime: number;
  priority: number; // 1 = highest .. 4 = lowest
}

export interface ScheduledSlice {
  processId: string; // "IDLE" for idle gaps
  taskName: string;
  start: number;
  end: number;
  idle: boolean;
}

export interface ProcessResult extends SchedProcess {
  startTime: number;
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  responseTime: number;
}

export interface ScheduleResult {
  algorithm: Algorithm;
  timeline: ScheduledSlice[];
  results: ProcessResult[];
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  avgResponseTime: number;
  totalTime: number;
  busyTime: number;
  idleTime: number;
  cpuUtilization: number; // percentage
  completed: number;
}

const EMPTY = (algorithm: Algorithm): ScheduleResult => ({
  algorithm,
  timeline: [],
  results: [],
  avgWaitingTime: 0,
  avgTurnaroundTime: 0,
  avgResponseTime: 0,
  totalTime: 0,
  busyTime: 0,
  idleTime: 0,
  cpuUtilization: 0,
  completed: 0,
});

/** Picks the next process for the given algorithm from those already arrived. */
function pickNext(ready: SchedProcess[], algorithm: Algorithm): SchedProcess {
  return ready.reduce((best, p) => {
    if (algorithm === "sjf") {
      if (p.burstTime !== best.burstTime) return p.burstTime < best.burstTime ? p : best;
    } else if (algorithm === "priority") {
      if (p.priority !== best.priority) return p.priority < best.priority ? p : best;
    }
    // FCFS, and tie-breaker for the others: earlier arrival, then process id.
    if (p.arrivalTime !== best.arrivalTime) return p.arrivalTime < best.arrivalTime ? p : best;
    return p.processId < best.processId ? p : best;
  });
}

/**
 * Runs a non-preemptive schedule (FCFS / SJF / Priority) and computes metrics.
 */
export function schedule(processes: SchedProcess[], algorithm: Algorithm): ScheduleResult {
  if (!processes || processes.length === 0) return EMPTY(algorithm);

  const pending = [...processes];
  const timeline: ScheduledSlice[] = [];
  const results: ProcessResult[] = [];

  const firstArrival = Math.min(...pending.map((p) => p.arrivalTime));
  let clock = Math.max(0, firstArrival);
  let busyTime = 0;

  while (pending.length > 0) {
    const ready = pending.filter((p) => p.arrivalTime <= clock);

    if (ready.length === 0) {
      // CPU (worker) is idle until the next task arrives.
      const nextArrival = Math.min(...pending.map((p) => p.arrivalTime));
      timeline.push({ processId: "IDLE", taskName: "Idle", start: clock, end: nextArrival, idle: true });
      clock = nextArrival;
      continue;
    }

    const next = pickNext(ready, algorithm);
    pending.splice(pending.indexOf(next), 1);

    const start = clock;
    const completionTime = start + next.burstTime;
    const turnaroundTime = completionTime - next.arrivalTime;
    const waitingTime = turnaroundTime - next.burstTime;

    timeline.push({ processId: next.processId, taskName: next.taskName, start, end: completionTime, idle: false });
    results.push({
      ...next,
      startTime: start,
      completionTime,
      turnaroundTime,
      waitingTime,
      responseTime: start - next.arrivalTime,
    });

    busyTime += next.burstTime;
    clock = completionTime;
  }

  const n = results.length;
  const sum = (fn: (r: ProcessResult) => number) => results.reduce((acc, r) => acc + fn(r), 0);
  const startOfSchedule = Math.max(0, firstArrival);
  const totalTime = clock - startOfSchedule;

  return {
    algorithm,
    timeline,
    results,
    avgWaitingTime: sum((r) => r.waitingTime) / n,
    avgTurnaroundTime: sum((r) => r.turnaroundTime) / n,
    avgResponseTime: sum((r) => r.responseTime) / n,
    totalTime,
    busyTime,
    idleTime: totalTime - busyTime,
    cpuUtilization: totalTime > 0 ? (busyTime / totalTime) * 100 : 100,
    completed: n,
  };
}

export function compareAlgorithms(processes: SchedProcess[]): ScheduleResult[] {
  return (["fcfs", "sjf", "priority"] as Algorithm[]).map((a) => schedule(processes, a));
}

export const PRIORITY_TEXT: Record<number, string> = {
  1: "1 — Highest",
  2: "2 — High",
  3: "3 — Medium",
  4: "4 — Low",
};

export const DEMO_PROCESSES: SchedProcess[] = [
  { processId: "P1", complaintCode: "UP-101", taskName: "Pothole Repair", category: "Road", arrivalTime: 0, burstTime: 5, priority: 2 },
  { processId: "P2", complaintCode: "UP-102", taskName: "Garbage Collection", category: "Sanitation", arrivalTime: 1, burstTime: 3, priority: 3 },
  { processId: "P3", complaintCode: "UP-103", taskName: "Water Leakage", category: "Water", arrivalTime: 2, burstTime: 4, priority: 1 },
  { processId: "P4", complaintCode: "UP-104", taskName: "Street Light Repair", category: "Electricity", arrivalTime: 3, burstTime: 2, priority: 4 },
];

/** Validation for manually created processes. Returns an error message or null. */
export function validateProcess(p: Partial<SchedProcess>, existingIds: string[]): string | null {
  const id = (p.processId ?? "").trim();
  if (!id) return "Process ID is required.";
  if (existingIds.includes(id)) return `Process ID "${id}" already exists.`;
  if (!(p.taskName ?? "").trim()) return "Task name is required.";
  if (p.arrivalTime == null || !Number.isFinite(p.arrivalTime) || p.arrivalTime < 0)
    return "Arrival time must be a number greater than or equal to 0.";
  if (p.burstTime == null || !Number.isFinite(p.burstTime) || p.burstTime <= 0)
    return "Burst time must be a number greater than 0.";
  if (p.priority == null || !Number.isFinite(p.priority) || p.priority < 1 || p.priority > 4)
    return "Priority must be between 1 and 4.";
  return null;
}

const COMPLAINT_PRIORITY_MAP: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };

export function priorityFromComplaint(p: string | null | undefined): number {
  return COMPLAINT_PRIORITY_MAP[p ?? "medium"] ?? 3;
}

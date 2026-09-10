import { describe, it, expect } from "vitest";
import { schedule, compareAlgorithms, validateProcess, DEMO_PROCESSES, type SchedProcess } from "./os-scheduling";

const demo = DEMO_PROCESSES;

describe("FCFS", () => {
  it("runs processes in arrival order with correct metrics", () => {
    const r = schedule(demo, "fcfs");
    expect(r.timeline.map((t) => t.processId)).toEqual(["P1", "P2", "P3", "P4"]);
    expect(r.results.map((x) => x.completionTime)).toEqual([5, 8, 12, 14]);
    // TAT = CT - AT
    expect(r.results.map((x) => x.turnaroundTime)).toEqual([5, 7, 10, 11]);
    // WT = TAT - BT
    expect(r.results.map((x) => x.waitingTime)).toEqual([0, 4, 6, 9]);
    expect(r.avgWaitingTime).toBeCloseTo(19 / 4);
    expect(r.avgTurnaroundTime).toBeCloseTo(33 / 4);
    expect(r.totalTime).toBe(14);
    expect(r.cpuUtilization).toBe(100);
  });

  it("handles CPU idle time", () => {
    const p: SchedProcess[] = [
      { processId: "A", taskName: "A", arrivalTime: 0, burstTime: 2, priority: 1 },
      { processId: "B", taskName: "B", arrivalTime: 6, burstTime: 2, priority: 1 },
    ];
    const r = schedule(p, "fcfs");
    expect(r.timeline.some((t) => t.idle && t.start === 2 && t.end === 6)).toBe(true);
    expect(r.idleTime).toBe(4);
    expect(r.busyTime).toBe(4);
    expect(r.cpuUtilization).toBeCloseTo(50);
  });
});

describe("SJF (non-preemptive)", () => {
  it("picks the shortest arrived job", () => {
    const r = schedule(demo, "sjf");
    expect(r.timeline.map((t) => t.processId)).toEqual(["P1", "P4", "P2", "P3"]);
    const by = Object.fromEntries(r.results.map((x) => [x.processId, x]));
    expect(by.P1.completionTime).toBe(5);
    expect(by.P4.completionTime).toBe(7);
    expect(by.P2.completionTime).toBe(10);
    expect(by.P3.completionTime).toBe(14);
    expect(r.avgWaitingTime).toBeLessThan(schedule(demo, "fcfs").avgWaitingTime);
  });

  it("breaks burst-time ties by arrival time", () => {
    const p: SchedProcess[] = [
      { processId: "A", taskName: "A", arrivalTime: 0, burstTime: 4, priority: 3 },
      { processId: "B", taskName: "B", arrivalTime: 1, burstTime: 2, priority: 3 },
      { processId: "C", taskName: "C", arrivalTime: 2, burstTime: 2, priority: 3 },
    ];
    expect(schedule(p, "sjf").timeline.map((t) => t.processId)).toEqual(["A", "B", "C"]);
  });
});

describe("Priority (non-preemptive)", () => {
  it("picks the highest priority arrived job (1 = highest)", () => {
    const r = schedule(demo, "priority");
    expect(r.timeline.map((t) => t.processId)).toEqual(["P1", "P3", "P2", "P4"]);
    const by = Object.fromEntries(r.results.map((x) => [x.processId, x]));
    expect(by.P3.completionTime).toBe(9);
    expect(by.P2.completionTime).toBe(12);
    expect(by.P4.completionTime).toBe(14);
  });

  it("uses arrival time as tie-breaker for equal priority", () => {
    const p: SchedProcess[] = [
      { processId: "A", taskName: "A", arrivalTime: 0, burstTime: 3, priority: 2 },
      { processId: "C", taskName: "C", arrivalTime: 2, burstTime: 1, priority: 1 },
      { processId: "B", taskName: "B", arrivalTime: 1, burstTime: 1, priority: 1 },
    ];
    expect(schedule(p, "priority").timeline.map((t) => t.processId)).toEqual(["A", "B", "C"]);
  });
});

describe("edge cases", () => {
  it("returns empty metrics for no processes", () => {
    const r = schedule([], "fcfs");
    expect(r.completed).toBe(0);
    expect(r.avgWaitingTime).toBe(0);
  });

  it("handles a single process arriving late", () => {
    const r = schedule([{ processId: "A", taskName: "A", arrivalTime: 3, burstTime: 4, priority: 1 }], "sjf");
    expect(r.results[0].waitingTime).toBe(0);
    expect(r.results[0].turnaroundTime).toBe(4);
    expect(r.totalTime).toBe(4);
  });

  it("handles identical arrival times", () => {
    const p: SchedProcess[] = [
      { processId: "P1", taskName: "1", arrivalTime: 0, burstTime: 3, priority: 2 },
      { processId: "P2", taskName: "2", arrivalTime: 0, burstTime: 1, priority: 1 },
    ];
    expect(schedule(p, "sjf").timeline.map((t) => t.processId)).toEqual(["P2", "P1"]);
    expect(schedule(p, "fcfs").timeline.map((t) => t.processId)).toEqual(["P1", "P2"]);
  });

  it("compare returns all three algorithms with equal total busy time", () => {
    const all = compareAlgorithms(demo);
    expect(all.map((a) => a.algorithm)).toEqual(["fcfs", "sjf", "priority"]);
    expect(new Set(all.map((a) => a.busyTime)).size).toBe(1);
  });
});

describe("validation", () => {
  it("rejects duplicates and bad values", () => {
    expect(validateProcess({ processId: "P1", taskName: "x", arrivalTime: 0, burstTime: 1, priority: 1 }, ["P1"])).toMatch(/already exists/);
    expect(validateProcess({ processId: "P9", taskName: "x", arrivalTime: -1, burstTime: 1, priority: 1 }, [])).toMatch(/Arrival/);
    expect(validateProcess({ processId: "P9", taskName: "x", arrivalTime: 0, burstTime: 0, priority: 1 }, [])).toMatch(/Burst/);
    expect(validateProcess({ processId: "P9", taskName: "x", arrivalTime: 0, burstTime: 1, priority: 5 }, [])).toMatch(/Priority/);
    expect(validateProcess({ processId: "P9", taskName: "x", arrivalTime: 0, burstTime: 1, priority: 2 }, [])).toBeNull();
  });
});

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Cpu, PlusCircle, Play, Trash2, Download, Database, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GanttChart } from "@/components/os-gantt-chart";
import { formatDate } from "@/lib/complaint-utils";
import {
  ALGORITHM_LABELS,
  DEMO_PROCESSES,
  PRIORITY_TEXT,
  compareAlgorithms,
  priorityFromComplaint,
  schedule,
  validateProcess,
  type Algorithm,
  type SchedProcess,
} from "@/lib/os-scheduling";

export const Route = createFileRoute("/_authenticated/os-scheduler")({
  head: () => ({
    meta: [
      { title: "OS Process Scheduler — UrbanPulse" },
      { name: "description", content: "Simulate FCFS, SJF and Priority CPU scheduling algorithms using real civic maintenance tasks." },
      { property: "og:title", content: "OS Process Scheduler — UrbanPulse" },
      { property: "og:description", content: "Simulate FCFS, SJF and Priority scheduling with UrbanPulse maintenance work orders." },
    ],
  }),
  component: OsSchedulerPage,
});

interface Row extends SchedProcess {
  dbId?: string;
  status: string;
}

const emptyForm = { processId: "", complaintCode: "", taskName: "", category: "", arrivalTime: "0", burstTime: "1", priority: "3" };

function OsSchedulerPage() {
  const { data: user } = useCurrentUser();
  const qc = useQueryClient();
  const canManage = Boolean(user?.isAdmin || user?.roles.includes("department_head") || user?.roles.includes("municipal_officer"));

  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [algorithm, setAlgorithm] = useState<Algorithm>("fcfs");
  const [open, setOpen] = useState(false);
  const [persist, setPersist] = useState(true);
  const [form, setForm] = useState(emptyForm);

  // Saved scheduling tasks (database persistence).
  const { data: savedTasks = [] } = useQuery({
    queryKey: ["os-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("os_scheduling_tasks").select("*").order("arrival_time");
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(user?.isStaff),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["os-runs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("os_scheduling_runs").select("*").order("created_at", { ascending: false }).limit(15);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(user?.isStaff),
  });

  // Load persisted tasks into the working set once.
  if (!loaded && savedTasks.length > 0) {
    setRows(
      savedTasks.map((t) => ({
        dbId: t.id,
        processId: t.process_id,
        complaintCode: t.complaint_id,
        taskName: t.task_name,
        category: t.category,
        arrivalTime: t.arrival_time,
        burstTime: t.burst_time,
        priority: t.priority,
        status: t.status,
      })),
    );
    setLoaded(true);
  }

  const result = useMemo(() => schedule(rows, algorithm), [rows, algorithm]);
  const comparison = useMemo(() => compareAlgorithms(rows), [rows]);

  function loadDemo() {
    setLoaded(true);
    setRows(DEMO_PROCESSES.map((p) => ({ ...p, status: "READY" })));
    toast.success("Demo tasks loaded (not saved to the database).");
  }

  async function importFromComplaints() {
    const { data, error } = await supabase
      .from("complaints")
      .select("id, reference_code, title, priority, created_at, complaint_categories(name)")
      .in("status", ["submitted", "acknowledged", "assigned", "in_progress"])
      .order("created_at")
      .limit(8);
    if (error) {
      toast.error("Could not load complaints. Please try again.");
      return;
    }
    if (!data || data.length === 0) {
      toast.info("No pending complaints available to schedule.");
      return;
    }
    const base = new Date(data[0].created_at).getTime();
    setLoaded(true);
    setRows(
      data.map((c, i) => ({
        processId: `P${i + 1}`,
        complaintCode: c.reference_code,
        taskName: c.title,
        category: (c.complaint_categories as { name: string } | null)?.name ?? "General",
        // Arrival time = hours since the first pending complaint was created.
        arrivalTime: Math.max(0, Math.round((new Date(c.created_at).getTime() - base) / 3_600_000)),
        // Estimated processing time — editable below.
        burstTime: 3,
        priority: priorityFromComplaint(c.priority),
        status: "READY",
      })),
    );
    toast.success(`Imported ${data.length} complaints. Adjust estimated processing time as needed.`);
  }

  async function addProcess() {
    const p: SchedProcess = {
      processId: form.processId.trim(),
      complaintCode: form.complaintCode.trim() || null,
      taskName: form.taskName.trim(),
      category: form.category.trim() || null,
      arrivalTime: Number(form.arrivalTime),
      burstTime: Number(form.burstTime),
      priority: Number(form.priority),
    };
    const err = validateProcess(p, rows.map((r) => r.processId));
    if (err) {
      toast.error(err);
      return;
    }

    let dbId: string | undefined;
    if (persist && canManage) {
      const { data, error } = await supabase
        .from("os_scheduling_tasks")
        .insert({
          process_id: p.processId,
          task_name: p.taskName,
          category: p.category,
          arrival_time: p.arrivalTime,
          burst_time: p.burstTime,
          priority: p.priority,
          status: "READY",
          created_by: user?.id,
        })
        .select("id")
        .maybeSingle();
      if (error) {
        toast.error(error.code === "23505" ? "That Process ID already exists in the database." : "Could not save the task.");
        return;
      }
      dbId = data?.id;
      qc.invalidateQueries({ queryKey: ["os-tasks"] });
    }

    setRows((r) => [...r, { ...p, status: "READY", dbId }]);
    setForm(emptyForm);
    setOpen(false);
    toast.success(`Process ${p.processId} added.`);
  }

  async function removeRow(row: Row) {
    if (row.dbId) {
      const { error } = await supabase.from("os_scheduling_tasks").delete().eq("id", row.dbId);
      if (error) {
        toast.error("You are not allowed to delete this task.");
        return;
      }
      qc.invalidateQueries({ queryKey: ["os-tasks"] });
    }
    setRows((r) => r.filter((x) => x.processId !== row.processId));
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((r) => r.map((x) => (x.processId === id ? { ...x, ...patch } : x)));
  }

  async function saveRun() {
    if (rows.length === 0) {
      toast.error("Add at least one process before running the scheduler.");
      return;
    }
    if (!canManage) {
      toast.error("Only admins, department heads and municipal officers can save simulation runs.");
      return;
    }
    const { error } = await supabase.from("os_scheduling_runs").insert({
      algorithm,
      process_count: result.completed,
      avg_waiting_time: Number(result.avgWaitingTime.toFixed(2)),
      avg_turnaround_time: Number(result.avgTurnaroundTime.toFixed(2)),
      avg_response_time: Number(result.avgResponseTime.toFixed(2)),
      total_time: result.totalTime,
      cpu_utilization: Number(result.cpuUtilization.toFixed(2)),
      timeline: JSON.parse(JSON.stringify(result.timeline)),
      run_by: user?.id,
    });
    if (error) {
      toast.error("Could not save this simulation.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["os-runs"] });
    toast.success("Simulation saved to scheduling history.");
  }

  if (user && !user.isStaff) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Restricted module</CardTitle>
            <CardDescription>The OS Process Scheduler is available to municipal staff only.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Cpu className="h-6 w-6 text-primary" /> UrbanPulse OS Process Scheduler
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Simulate Operating System scheduling algorithms using real-world civic maintenance tasks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadDemo}>
            <Download className="mr-2 h-4 w-4" /> Load Demo Data
          </Button>
          <Button variant="outline" size="sm" onClick={importFromComplaints}>
            <Database className="mr-2 h-4 w-4" /> Import Complaints
          </Button>
        </div>
      </header>

      <Card className="border-dashed">
        <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            This module is an <strong>educational simulation</strong> running at application level. It does not control the real CPU or the
            host operating system scheduler — maintenance tasks are treated as processes and a maintenance crew as the CPU.
          </p>
        </CardContent>
      </Card>

      {/* Process table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Ready Queue</CardTitle>
            <CardDescription>Maintenance tasks waiting to be processed.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Process
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add scheduling process</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Process ID</Label>
                  <Input value={form.processId} onChange={(e) => setForm({ ...form, processId: e.target.value })} placeholder="P5" />
                </div>
                <div className="space-y-1">
                  <Label>Complaint ID (optional)</Label>
                  <Input value={form.complaintCode} onChange={(e) => setForm({ ...form, complaintCode: e.target.value })} placeholder="UP-105" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Task name</Label>
                  <Input value={form.taskName} onChange={(e) => setForm({ ...form, taskName: e.target.value })} placeholder="Repair Water Pipeline" />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Water" />
                </div>
                <div className="space-y-1">
                  <Label>Priority (1 highest – 4 lowest)</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((p) => (
                        <SelectItem key={p} value={String(p)}>{PRIORITY_TEXT[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Arrival time</Label>
                  <Input type="number" min={0} value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Burst time (estimated processing)</Label>
                  <Input type="number" min={1} value={form.burstTime} onChange={(e) => setForm({ ...form, burstTime: e.target.value })} />
                </div>
              </div>
              {canManage && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} className="h-4 w-4 accent-primary" />
                  Save this task to the database
                </label>
              )}
              <Button onClick={addProcess}>Add process</Button>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No processes yet. Use <strong>Load Demo Data</strong>, <strong>Import Complaints</strong>, or add a process manually.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Process</TableHead>
                  <TableHead>Complaint</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-24">Arrival</TableHead>
                  <TableHead className="w-24">Burst</TableHead>
                  <TableHead className="w-24">Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.processId}>
                    <TableCell className="font-medium">{r.processId}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.complaintCode ?? "—"}</TableCell>
                    <TableCell>{r.taskName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.category ?? "—"}</TableCell>
                    <TableCell>
                      <Input
                        type="number" min={0} value={r.arrivalTime} className="h-8 w-20"
                        onChange={(e) => updateRow(r.processId, { arrivalTime: Math.max(0, Number(e.target.value) || 0) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" min={1} value={r.burstTime} className="h-8 w-20"
                        onChange={(e) => updateRow(r.processId, { burstTime: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={String(r.priority)} onValueChange={(v) => updateRow(r.processId, { priority: Number(v) })}>
                        <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map((p) => <SelectItem key={p} value={String(p)}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeRow(r)} aria-label={`Remove ${r.processId}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Algorithm + Gantt */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Gantt Chart</CardTitle>
            <CardDescription>Execution order produced by the selected algorithm.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as Algorithm)}>
              <SelectTrigger className="w-[300px] max-w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ALGORITHM_LABELS) as Algorithm[]).map((a) => (
                  <SelectItem key={a} value={a}>{ALGORITHM_LABELS[a]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={saveRun}><Play className="mr-2 h-4 w-4" /> Save Run</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <GanttChart timeline={result.timeline} />

          {result.completed > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Metric label="Avg Waiting Time" value={result.avgWaitingTime.toFixed(2)} />
                <Metric label="Avg Turnaround Time" value={result.avgTurnaroundTime.toFixed(2)} />
                <Metric label="Avg Response Time" value={result.avgResponseTime.toFixed(2)} />
                <Metric label="Total Execution Time" value={String(result.totalTime)} />
                <Metric label="Worker Utilization" value={`${result.cpuUtilization.toFixed(1)}%`} />
                <Metric label="Tasks Completed" value={String(result.completed)} />
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Process</TableHead>
                      <TableHead>Arrival</TableHead>
                      <TableHead>Burst</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>Completion</TableHead>
                      <TableHead>Turnaround</TableHead>
                      <TableHead>Waiting</TableHead>
                      <TableHead>Response</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.results.map((r) => (
                      <TableRow key={r.processId}>
                        <TableCell className="font-medium">{r.processId}</TableCell>
                        <TableCell>{r.arrivalTime}</TableCell>
                        <TableCell>{r.burstTime}</TableCell>
                        <TableCell>{r.priority}</TableCell>
                        <TableCell>{r.startTime}</TableCell>
                        <TableCell>{r.completionTime}</TableCell>
                        <TableCell>{r.turnaroundTime}</TableCell>
                        <TableCell>{r.waitingTime}</TableCell>
                        <TableCell>{r.responseTime}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Compare Scheduling Algorithms</CardTitle>
          <CardDescription>All three algorithms run on the same set of processes.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add processes to compare algorithms.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Algorithm</TableHead>
                  <TableHead>Avg Waiting Time</TableHead>
                  <TableHead>Avg Turnaround Time</TableHead>
                  <TableHead>Total Time</TableHead>
                  <TableHead>Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.map((c) => {
                  const best = Math.min(...comparison.map((x) => x.avgWaitingTime));
                  return (
                    <TableRow key={c.algorithm}>
                      <TableCell className="font-medium">
                        {ALGORITHM_LABELS[c.algorithm].split(" (")[0]}
                        {c.avgWaitingTime === best && <Badge className="ml-2">Best</Badge>}
                      </TableCell>
                      <TableCell>{c.avgWaitingTime.toFixed(2)}</TableCell>
                      <TableCell>{c.avgTurnaroundTime.toFixed(2)}</TableCell>
                      <TableCell>{c.totalTime}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.timeline.map((t) => (t.idle ? "idle" : t.processId)).join(" → ")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduling History</CardTitle>
          <CardDescription>Previously saved simulations.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No simulations saved yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Algorithm</TableHead>
                  <TableHead>Processes</TableHead>
                  <TableHead>Avg Waiting</TableHead>
                  <TableHead>Avg Turnaround</TableHead>
                  <TableHead>Total Time</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium uppercase">{h.algorithm}</TableCell>
                    <TableCell>{h.process_count}</TableCell>
                    <TableCell>{Number(h.avg_waiting_time).toFixed(2)}</TableCell>
                    <TableCell>{Number(h.avg_turnaround_time).toFixed(2)}</TableCell>
                    <TableCell>{h.total_time}</TableCell>
                    <TableCell>{formatDate(h.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Educational */}
      <Card>
        <CardHeader>
          <CardTitle>Operating System Concept — How it works</CardTitle>
          <CardDescription>Beginner-friendly explanation of the OS ideas used on this page.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Operating System</TableHead><TableHead>UrbanPulse equivalent</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ["Process", "Civic maintenance task / work order"],
                  ["CPU", "Maintenance worker / municipal processing capacity"],
                  ["Burst Time", "Estimated time to complete the maintenance task"],
                  ["Arrival Time", "Time the complaint entered the processing queue"],
                  ["Priority", "Urgency of the civic issue (1 highest – 4 lowest)"],
                  ["Ready Queue", "Pending maintenance tasks waiting to be processed"],
                  ["Waiting Time", "Time a task waits before work begins"],
                  ["Turnaround Time", "Total time from arrival until completion"],
                  ["Completion Time", "Time at which the task finishes"],
                ].map(([a, b]) => (
                  <TableRow key={a}><TableCell className="font-medium">{a}</TableCell><TableCell>{b}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger>What is process scheduling?</AccordionTrigger>
              <AccordionContent>
                Scheduling decides which waiting job gets the worker (CPU) next. A city has more complaints than crews, so the order
                chosen changes how long citizens wait.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger>What is FCFS?</AccordionTrigger>
              <AccordionContent>
                First Come First Serve handles tasks strictly in the order they arrived. It is fair and simple, but one long task can make
                everyone behind it wait (the "convoy effect").
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger>What is SJF?</AccordionTrigger>
              <AccordionContent>
                Shortest Job First picks the task with the smallest estimated time among the tasks that have already arrived. It gives the
                lowest average waiting time, but long tasks may be delayed repeatedly (starvation).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger>What is Priority Scheduling?</AccordionTrigger>
              <AccordionContent>
                The most urgent task runs first (1 = highest). If two tasks share a priority, the earlier arrival goes first. Useful when a
                water leak must be fixed before a cosmetic repair.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger>Arrival, burst, waiting and turnaround time</AccordionTrigger>
              <AccordionContent>
                Arrival time is when the task enters the queue; burst time is how long the work takes. Then:
                <br />Turnaround Time = Completion Time − Arrival Time
                <br />Waiting Time = Turnaround Time − Burst Time
                <br />Response Time = Start Time − Arrival Time
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q6">
              <AccordionTrigger>What is a Gantt chart?</AccordionTrigger>
              <AccordionContent>
                A timeline bar showing which task is being worked on during each time slot, including idle gaps when no task has arrived yet.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

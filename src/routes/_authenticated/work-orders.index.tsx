import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PlusCircle, Search, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WO_STATUS_LABELS, WO_STATUS_VARIANT, formatCurrency } from "@/lib/work-order-utils";
import { PRIORITY_LABELS, PRIORITY_COLORS, formatDate } from "@/lib/complaint-utils";

export const Route = createFileRoute("/_authenticated/work-orders/")({
  head: () => ({ meta: [{ title: "Work Orders — UrbanPulse" }] }),
  component: WorkOrdersPage,
});

function WorkOrdersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["work-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("id, reference_code, title, status, priority, estimated_cost, actual_cost, scheduled_end, created_at, departments(name), contractors(company_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = data.filter((w) => {
    if (status !== "all" && w.status !== status) return false;
    if (q) {
      const s = q.toLowerCase();
      return w.title.toLowerCase().includes(s) || w.reference_code.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Wrench className="h-7 w-7" />Work Orders</h1>
          <p className="text-muted-foreground mt-1">Field operations and repair tasks.</p>
        </div>
        <Button asChild><Link to="/work-orders/new"><PlusCircle className="h-4 w-4 mr-2" />New work order</Link></Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search title, code…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(WO_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <CardTitle className="text-sm text-muted-foreground font-normal ml-auto">
              {rows.length} result{rows.length === 1 ? "" : "s"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border rounded-md border border-border">
            {isLoading && <div className="p-6 text-center text-muted-foreground">Loading…</div>}
            {!isLoading && rows.length === 0 && (
              <div className="p-10 text-center text-muted-foreground">No work orders yet.</div>
            )}
            {rows.map((w) => (
              <Link key={w.id} to="/work-orders/$id" params={{ id: w.id }} className="block p-4 hover:bg-muted/50 transition">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{w.title}</span>
                      <span className="text-xs text-muted-foreground">{w.reference_code}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {w.departments?.name ?? "—"} · {w.contractors?.company_name ?? "In-house"} · Due {formatDate(w.scheduled_end)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Est. {formatCurrency(Number(w.estimated_cost))} · Actual {formatCurrency(Number(w.actual_cost))}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[w.priority]}`}>
                      {PRIORITY_LABELS[w.priority]}
                    </span>
                    <Badge variant={WO_STATUS_VARIANT[w.status] ?? "secondary"} className="capitalize">
                      {WO_STATUS_LABELS[w.status] ?? w.status}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

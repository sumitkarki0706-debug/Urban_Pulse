import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WO_STATUS_LABELS, WO_STATUS_VARIANT, formatCurrency } from "@/lib/work-order-utils";
import { formatDate, PRIORITY_LABELS, PRIORITY_COLORS } from "@/lib/complaint-utils";

export const Route = createFileRoute("/_authenticated/work-orders/$id")({
  head: () => ({ meta: [{ title: "Work Order — UrbanPulse" }] }),
  component: WorkOrderDetailPage,
});

function WorkOrderDetailPage() {
  const { id } = Route.useParams();
  const { data: user } = useCurrentUser();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [hours, setHours] = useState("0");
  const [actualCost, setActualCost] = useState("");

  const { data: wo, isLoading } = useQuery({
    queryKey: ["work-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*, departments(name), contractors(company_name, contact_email), complaints(reference_code, title)")
        .eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["wo-updates", id],
    queryFn: async () => (await supabase.from("work_order_updates").select("*").eq("work_order_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  async function postUpdate(newStatus?: string) {
    if (!note.trim() && !newStatus) return toast.error("Add a note");
    const { error } = await supabase.from("work_order_updates").insert({
      work_order_id: id,
      posted_by: user?.id,
      note: note || `Status changed to ${newStatus}`,
      hours_worked: Number(hours) || 0,
      status_from: wo?.status,
      status_to: (newStatus as any) ?? wo?.status,
    });
    if (error) return toast.error(error.message);
    if (newStatus) {
      const patch: any = { status: newStatus };
      if (newStatus === "completed") patch.completed_at = new Date().toISOString();
      if (actualCost) patch.actual_cost = Number(actualCost);
      await supabase.from("work_orders").update(patch).eq("id", id);
    }
    setNote(""); setHours("0"); setActualCost("");
    toast.success("Update posted");
    qc.invalidateQueries({ queryKey: ["work-order", id] });
    qc.invalidateQueries({ queryKey: ["wo-updates", id] });
  }

  if (isLoading || !wo) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/work-orders"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">{wo.title}</CardTitle>
              <CardDescription>{wo.reference_code} · Created {formatDate(wo.created_at)}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[wo.priority]}`}>{PRIORITY_LABELS[wo.priority]}</span>
              <Badge variant={WO_STATUS_VARIANT[wo.status] ?? "secondary"}>{WO_STATUS_LABELS[wo.status]}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {wo.description && <p className="text-sm">{wo.description}</p>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
            <div><div className="text-muted-foreground text-xs">Department</div>{wo.departments?.name ?? "—"}</div>
            <div><div className="text-muted-foreground text-xs">Contractor</div>{wo.contractors?.company_name ?? "In-house"}</div>
            <div><div className="text-muted-foreground text-xs">Estimated</div>{formatCurrency(Number(wo.estimated_cost))}</div>
            <div><div className="text-muted-foreground text-xs">Actual</div>{formatCurrency(Number(wo.actual_cost))}</div>
            <div><div className="text-muted-foreground text-xs">Scheduled start</div>{formatDate(wo.scheduled_start)}</div>
            <div><div className="text-muted-foreground text-xs">Scheduled end</div>{formatDate(wo.scheduled_end)}</div>
            <div><div className="text-muted-foreground text-xs">Completed</div>{formatDate(wo.completed_at)}</div>
            {wo.complaints && (
              <div className="col-span-2"><div className="text-muted-foreground text-xs">Linked complaint</div>
                <Link to="/complaints/$id" params={{ id: wo.complaint_id! }} className="underline">{wo.complaints.reference_code} — {wo.complaints.title}</Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {user?.isStaff && (
        <Card>
          <CardHeader><CardTitle>Post update</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea rows={3} placeholder="Progress note…" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Hours worked</Label><Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
              <div><Label>Actual cost (optional)</Label><Input type="number" value={actualCost} onChange={(e) => setActualCost(e.target.value)} /></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => postUpdate()}>Add note</Button>
              <Select onValueChange={(v) => postUpdate(v)}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Change status…" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(WO_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Activity ({updates.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {updates.length === 0 && <p className="text-sm text-muted-foreground">No updates yet.</p>}
          {updates.map((u) => (
            <div key={u.id} className="border-l-2 border-primary/40 pl-3">
              <p className="text-sm">{u.note}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(u.created_at)}
                {u.hours_worked ? ` · ${u.hours_worked}h` : ""}
                {u.status_to && u.status_from !== u.status_to ? ` · ${WO_STATUS_LABELS[u.status_from ?? ""] ?? ""} → ${WO_STATUS_LABELS[u.status_to] ?? ""}` : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

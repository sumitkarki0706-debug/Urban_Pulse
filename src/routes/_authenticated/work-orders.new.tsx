import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/work-orders/new")({
  head: () => ({ meta: [{ title: "New Work Order — UrbanPulse" }] }),
  component: NewWorkOrderPage,
});

function NewWorkOrderPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const [form, setForm] = useState({
    title: "", description: "", department_id: "", contractor_id: "",
    complaint_id: "", priority: "medium", estimated_cost: "0",
    scheduled_start: "", scheduled_end: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: depts = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await supabase.from("departments").select("id, name")).data ?? [],
  });
  const { data: contractors = [] } = useQuery({
    queryKey: ["contractors-active"],
    queryFn: async () => (await supabase.from("contractors").select("id, company_name").eq("active", true)).data ?? [],
  });
  const { data: openComplaints = [] } = useQuery({
    queryKey: ["complaints-open"],
    queryFn: async () => (await supabase.from("complaints").select("id, reference_code, title").not("status", "in", "(resolved,closed,rejected)").limit(100)).data ?? [],
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) return toast.error("Title required");
    setSaving(true);
    const { data, error } = await supabase.from("work_orders").insert({
      title: form.title,
      description: form.description || null,
      department_id: form.department_id || null,
      contractor_id: form.contractor_id || null,
      complaint_id: form.complaint_id || null,
      priority: form.priority as any,
      estimated_cost: Number(form.estimated_cost) || 0,
      scheduled_start: form.scheduled_start || null,
      scheduled_end: form.scheduled_end || null,
      created_by: user?.id,
      status: "scheduled",
    }).select("id").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Work order created");
    navigate({ to: "/work-orders/$id", params: { id: data.id } });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader><CardTitle>New work order</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department</Label>
                <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Contractor</Label>
                <Select value={form.contractor_id} onValueChange={(v) => setForm({ ...form, contractor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="In-house" /></SelectTrigger>
                  <SelectContent>{contractors.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low","medium","high","critical"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estimated cost</Label>
                <Input type="number" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} />
              </div>
              <div>
                <Label>Scheduled start</Label>
                <Input type="datetime-local" value={form.scheduled_start} onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} />
              </div>
              <div>
                <Label>Scheduled end</Label>
                <Input type="datetime-local" value={form.scheduled_end} onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Linked complaint (optional)</Label>
              <Select value={form.complaint_id} onValueChange={(v) => setForm({ ...form, complaint_id: v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {openComplaints.map((c) => <SelectItem key={c.id} value={c.id}>{c.reference_code} — {c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create work order"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

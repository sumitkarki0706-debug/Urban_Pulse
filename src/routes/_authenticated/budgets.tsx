import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Wallet, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/work-order-utils";

export const Route = createFileRoute("/_authenticated/budgets")({
  head: () => ({ meta: [{ title: "Budgets — UrbanPulse" }] }),
  component: BudgetsPage,
});

function BudgetsPage() {
  const { data: user } = useCurrentUser();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ department_id: "", fiscal_year: String(new Date().getFullYear()), total_amount: "0", notes: "" });

  const canManage = user?.isAdmin || user?.roles.includes("department_head");

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => (await supabase.from("budgets").select("*, departments(name)").order("fiscal_year", { ascending: false })).data ?? [],
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await supabase.from("budget_expenses").select("budget_id, amount")).data ?? [],
  });
  const { data: depts = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await supabase.from("departments").select("id, name")).data ?? [],
  });

  const spentByBudget = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.budget_id] = (acc[e.budget_id] ?? 0) + Number(e.amount);
    return acc;
  }, {});

  async function submit() {
    if (!form.department_id) return toast.error("Department required");
    const { error } = await supabase.from("budgets").insert({
      department_id: form.department_id,
      fiscal_year: Number(form.fiscal_year),
      total_amount: Number(form.total_amount),
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Budget created");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["budgets"] });
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Wallet className="h-7 w-7" />Budgets</h1>
          <p className="text-muted-foreground mt-1">Departmental fiscal-year allocations and spend.</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="h-4 w-4 mr-2" />New budget</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create budget</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Department</Label>
                  <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Fiscal year</Label><Input type="number" value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })} /></div>
                <div><Label>Total amount</Label><Input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} /></div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button onClick={submit} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {budgets.map((b) => {
          const spent = spentByBudget[b.id] ?? 0;
          const total = Number(b.total_amount);
          const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;
          return (
            <Card key={b.id}>
              <CardHeader>
                <CardTitle className="text-lg">{b.departments?.name ?? "—"}</CardTitle>
                <CardDescription>Fiscal year {b.fiscal_year}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Spent {formatCurrency(spent)}</span>
                  <span className="text-muted-foreground">of {formatCurrency(total)}</span>
                </div>
                <Progress value={pct} />
                <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% utilized · {formatCurrency(total - spent)} remaining</p>
                {b.notes && <p className="text-sm text-muted-foreground pt-1">{b.notes}</p>}
              </CardContent>
            </Card>
          );
        })}
        {budgets.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">No budgets yet.</p>}
      </div>
    </div>
  );
}

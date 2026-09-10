import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/contractors")({
  head: () => ({ meta: [{ title: "Contractors — UrbanPulse" }] }),
  component: ContractorsPage,
});

function ContractorsPage() {
  const { data: user } = useCurrentUser();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_name: "", contact_email: "", contact_phone: "", specialization: "" });

  const { data = [] } = useQuery({
    queryKey: ["contractors"],
    queryFn: async () => (await supabase.from("contractors").select("*").order("company_name")).data ?? [],
  });

  const canManage = user?.isAdmin || user?.roles.includes("department_head");

  async function submit() {
    if (!form.company_name) return toast.error("Company name required");
    const { error } = await supabase.from("contractors").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Contractor added");
    setOpen(false);
    setForm({ company_name: "", contact_email: "", contact_phone: "", specialization: "" });
    qc.invalidateQueries({ queryKey: ["contractors"] });
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Users className="h-7 w-7" />Contractors</h1>
          <p className="text-muted-foreground mt-1">External partners handling work orders.</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="h-4 w-4 mr-2" />Add contractor</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New contractor</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Company name</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
                <div><Label>Contact email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
                <div><Label>Contact phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
                <div><Label>Specialization</Label><Input placeholder="e.g. Road repair, Electrical" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} /></div>
                <Button onClick={submit} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{c.company_name}</CardTitle>
                <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Active" : "Inactive"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {c.specialization && <p className="text-muted-foreground">{c.specialization}</p>}
              {c.contact_email && <p>{c.contact_email}</p>}
              {c.contact_phone && <p>{c.contact_phone}</p>}
              <p className="text-xs text-muted-foreground pt-2">Rating: {Number(c.rating).toFixed(1)} / 5</p>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <p className="text-muted-foreground col-span-full text-center py-10">No contractors yet.</p>}
      </div>
    </div>
  );
}

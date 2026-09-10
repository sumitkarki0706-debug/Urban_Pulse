import { createFileRoute, useParams, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Send, Loader2, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComplaintMap } from "@/components/complaint-map";
import { STATUS_LABELS, STATUS_VARIANT, PRIORITY_LABELS, PRIORITY_COLORS, formatDate } from "@/lib/complaint-utils";
import { triageComplaint } from "@/lib/ai-triage.functions";
import { ComplaintProof, PROOF_AFTER, PROOF_BEFORE } from "@/components/complaint-proof";

export const Route = createFileRoute("/_authenticated/complaints/$id")({
  head: () => ({ meta: [{ title: "Complaint — UrbanPulse" }] }),
  component: ComplaintDetailPage,
});

function ComplaintDetailPage() {
  const { id } = useParams({ from: "/_authenticated/complaints/$id" });
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [comment, setComment] = useState("");

  const complaintQuery = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select(`
          id, reference_code, title, description, status, priority,
          latitude, longitude, address, created_at, resolved_at, rating, feedback,
          reporter_id, assigned_to,
          complaint_categories(name),
          departments(name)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const historyQuery = useQuery({
    queryKey: ["complaint-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaint_status_history")
        .select("id, from_status, to_status, note, created_at")
        .eq("complaint_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const commentsQuery = useQuery({
    queryKey: ["complaint-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaint_comments")
        .select("id, body, is_internal, created_at, author_id")
        .eq("complaint_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const authorIds = Array.from(new Set((data ?? []).map((c) => c.author_id)));
      const profiles = authorIds.length
        ? (await supabase.from("profiles").select("id, full_name").in("id", authorIds)).data ?? []
        : [];
      const nameMap = new Map(profiles.map((p) => [p.id, p.full_name] as const));
      return (data ?? []).map((c) => ({ ...c, author_name: nameMap.get(c.author_id) ?? "User" }));
    },
  });

  const attachmentsQuery = useQuery({
    queryKey: ["complaint-attachments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaint_attachments")
        .select("id, storage_path, file_name, mime_type, kind, created_at")
        .eq("complaint_id", id)
        .not("kind", "in", `(${PROOF_BEFORE},${PROOF_AFTER})`);
      if (error) throw error;
      // create signed URLs
      const withUrls = await Promise.all(
        (data ?? []).map(async (a) => {
          const { data: signed } = await supabase.storage
            .from("complaint-attachments")
            .createSignedUrl(a.storage_path, 3600);
          return { ...a, url: signed?.signedUrl ?? null };
        }),
      );
      return withUrls;
    },
  });

  const aiQuery = useQuery({
    queryKey: ["complaint-ai", id],
    enabled: !!currentUser?.isStaff,
    queryFn: async () => {
      const { data } = await supabase.from("ai_analysis").select("*").eq("complaint_id", id).maybeSingle();
      return data;
    },
  });

  const runTriage = useServerFn(triageComplaint);
  const triageMutation = useMutation({
    mutationFn: async () => runTriage({ data: { complaintId: id, title: c!.title, description: c!.description ?? "" } }),
    onSuccess: () => { toast.success("AI triage complete"); queryClient.invalidateQueries({ queryKey: ["complaint-ai", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("Not signed in");
      const body = comment.trim();
      if (body.length < 1) throw new Error("Comment cannot be empty");
      const { error } = await supabase.from("complaint_comments").insert({
        complaint_id: id, author_id: currentUser.id, body, is_internal: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["complaint-comments", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async (nextStatus: string) => {
      const { error } = await supabase
        .from("complaints")
        .update({ status: nextStatus as never })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["complaint", id] });
      queryClient.invalidateQueries({ queryKey: ["complaint-history", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (complaintQuery.isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  const c = complaintQuery.data;
  if (!c) return <div className="p-6 text-muted-foreground">Not found.</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{c.reference_code}</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{c.title}</h1>
        <div className="flex gap-2 mt-3 items-center flex-wrap">
          <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"} className="capitalize">
            {STATUS_LABELS[c.status] ?? c.status}
          </Badge>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[c.priority]}`}>
            {PRIORITY_LABELS[c.priority]} priority
          </span>
          <span className="text-sm text-muted-foreground">
            {c.complaint_categories?.name} · {c.departments?.name ?? "Unassigned"} · {formatDate(c.created_at)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">{c.description}</CardContent>
          </Card>

          {(attachmentsQuery.data?.length ?? 0) > 0 && (
            <Card>
              <CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {attachmentsQuery.data!.map((a) => (
                  <a key={a.id} href={a.url ?? "#"} target="_blank" rel="noopener noreferrer" className="block rounded-md border border-border overflow-hidden hover:opacity-90">
                    {a.kind === "image" && a.url ? (
                      <img src={a.url} alt={a.file_name} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-muted text-xs text-muted-foreground p-2 text-center">
                        {a.file_name}
                      </div>
                    )}
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          <ComplaintProof
            complaintId={c.id}
            isStaff={!!currentUser?.isStaff}
            isReporter={currentUser?.id === c.reporter_id}
            status={c.status}
            rating={c.rating ?? null}
            feedback={c.feedback ?? null}
          />

          <Card>

            <CardHeader>
              <CardTitle>Comments</CardTitle>
              <CardDescription>Public conversation on this complaint.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {commentsQuery.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                )}
                {commentsQuery.data?.map((cm) => (
                  <div key={cm.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{cm.author_name}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(cm.created_at)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{cm.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 items-end">
                <Textarea
                  value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment…" rows={2} maxLength={2000}
                />
                <Button
                  onClick={() => addComment.mutate()}
                  disabled={addComment.isPending || comment.trim().length === 0}
                >
                  {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {c.latitude != null && c.longitude != null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" />Location</CardTitle>
                {c.address && <CardDescription>{c.address}</CardDescription>}
              </CardHeader>
              <CardContent>
                <ComplaintMap
                  points={[{ id: c.id, lat: c.latitude, lng: c.longitude, title: c.title, status: c.status }]}
                  center={[c.latitude, c.longitude]}
                  zoom={16}
                  height={240}
                />
              </CardContent>
            </Card>
          )}

          {currentUser?.isStaff && (
            <Card>
              <CardHeader><CardTitle>Update status</CardTitle></CardHeader>
              <CardContent>
                <Select value={c.status} onValueChange={(v) => updateStatus.mutate(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {currentUser?.isStaff && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI Triage</CardTitle>
                <CardDescription>Category, priority & routing suggestions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {aiQuery.data ? (
                  <>
                    {aiQuery.data.summary && <p className="text-muted-foreground italic">"{aiQuery.data.summary}"</p>}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div><div className="text-xs text-muted-foreground">Category</div>{aiQuery.data.suggested_category ?? "—"}</div>
                      <div><div className="text-xs text-muted-foreground">Priority</div>{aiQuery.data.suggested_priority ?? "—"}</div>
                      <div className="col-span-2"><div className="text-xs text-muted-foreground">Department</div>{aiQuery.data.suggested_department ?? "—"}</div>
                    </div>
                    {aiQuery.data.confidence != null && <p className="text-xs text-muted-foreground pt-1">Confidence: {(Number(aiQuery.data.confidence) * 100).toFixed(0)}%</p>}
                  </>
                ) : (
                  <p className="text-muted-foreground text-xs">No AI analysis yet.</p>
                )}
                <Button size="sm" variant="outline" className="w-full" onClick={() => triageMutation.mutate()} disabled={triageMutation.isPending}>
                  {triageMutation.isPending ? <><Loader2 className="h-3 w-3 animate-spin mr-2" />Analyzing…</> : <><Sparkles className="h-3 w-3 mr-2" />{aiQuery.data ? "Re-run analysis" : "Run AI triage"}</>}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>History</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {historyQuery.data?.length === 0 && <p className="text-sm text-muted-foreground">No changes yet.</p>}
              {historyQuery.data?.map((h) => (
                <div key={h.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="font-medium capitalize">{STATUS_LABELS[h.to_status] ?? h.to_status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-4">{formatDate(h.created_at)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

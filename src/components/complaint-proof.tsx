import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2, Star, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export const PROOF_BEFORE = "proof_before";
export const PROOF_AFTER = "proof_after";

interface Props {
  complaintId: string;
  isStaff: boolean;
  isReporter: boolean;
  status: string;
  rating: number | null;
  feedback: string | null;
}

export function ComplaintProof({ complaintId, isStaff, isReporter, status, rating, feedback }: Props) {
  const queryClient = useQueryClient();

  const proofQuery = useQuery({
    queryKey: ["complaint-proof", complaintId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaint_attachments")
        .select("id, storage_path, file_name, mime_type, kind, created_at")
        .eq("complaint_id", complaintId)
        .in("kind", [PROOF_BEFORE, PROOF_AFTER])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return Promise.all(
        (data ?? []).map(async (a) => {
          const { data: signed } = await supabase.storage
            .from("complaint-attachments")
            .createSignedUrl(a.storage_path, 3600);
          return { ...a, url: signed?.signedUrl ?? null };
        }),
      );
    },
  });

  const before = (proofQuery.data ?? []).filter((p) => p.kind === PROOF_BEFORE);
  const after = (proofQuery.data ?? []).filter((p) => p.kind === PROOF_AFTER);

  const upload = useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) throw new Error("Not signed in");
      if (file.size > 25 * 1024 * 1024) throw new Error("File must be under 25 MB");
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${complaintId}/${kind}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("complaint-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase.from("complaint_attachments").insert({
        complaint_id: complaintId,
        uploader_id: user.id,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        kind,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proof uploaded");
      queryClient.invalidateQueries({ queryKey: ["complaint-proof", complaintId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canRate = isReporter && (status === "resolved" || status === "closed");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Proof of work
        </CardTitle>
        <CardDescription>
          Before &amp; after evidence uploaded by the authority handling this issue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <ProofColumn
            title="Before"
            items={before}
            canUpload={isStaff}
            uploading={upload.isPending}
            onUpload={(file) => upload.mutate({ file, kind: PROOF_BEFORE })}
          />
          <ProofColumn
            title="After"
            items={after}
            canUpload={isStaff}
            uploading={upload.isPending}
            onUpload={(file) => upload.mutate({ file, kind: PROOF_AFTER })}
          />
        </div>

        {(canRate || rating != null) && (
          <RatingBlock
            complaintId={complaintId}
            rating={rating}
            feedback={feedback}
            editable={canRate}
          />
        )}
        {isReporter && !canRate && rating == null && (
          <p className="text-xs text-muted-foreground">
            You can rate the work once this issue is marked resolved.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProofColumn({
  title,
  items,
  canUpload,
  uploading,
  onUpload,
}: {
  title: string;
  items: Array<{ id: string; url: string | null; file_name: string; mime_type: string | null }>;
  canUpload: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              <span className="ml-2">Upload</span>
            </Button>
          </>
        )}
      </div>
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No {title.toLowerCase()} evidence yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {items.map((it) =>
            it.mime_type?.startsWith("video/") && it.url ? (
              <video key={it.id} src={it.url} controls className="w-full h-28 rounded-md border border-border object-cover" />
            ) : (
              <a key={it.id} href={it.url ?? "#"} target="_blank" rel="noopener noreferrer">
                <img
                  src={it.url ?? ""}
                  alt={it.file_name}
                  className="w-full h-28 rounded-md border border-border object-cover hover:opacity-90"
                />
              </a>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function RatingBlock({
  complaintId,
  rating,
  feedback,
  editable,
}: {
  complaintId: string;
  rating: number | null;
  feedback: string | null;
  editable: boolean;
}) {
  const queryClient = useQueryClient();
  const [stars, setStars] = useState(rating ?? 0);
  const [note, setNote] = useState(feedback ?? "");

  const submit = useMutation({
    mutationFn: async () => {
      if (stars < 1) throw new Error("Pick a star rating first");
      const { error } = await supabase.rpc("rate_complaint", {
        _complaint_id: complaintId,
        _rating: stars,
        _feedback: note.trim() || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks for your feedback");
      queryClient.invalidateQueries({ queryKey: ["complaint", complaintId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <p className="text-sm font-medium">
        {editable ? "Rate the work done" : "Citizen rating"}
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={!editable}
            onClick={() => setStars(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={editable ? "cursor-pointer" : "cursor-default"}
          >
            <Star className={`h-5 w-5 ${n <= stars ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      {editable ? (
        <>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Optional feedback on the resolution…"
          />
          <Button size="sm" onClick={() => submit.mutate()} disabled={submit.isPending}>
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {rating != null ? "Update rating" : "Submit rating"}
          </Button>
        </>
      ) : (
        feedback && <p className="text-sm text-muted-foreground italic">"{feedback}"</p>
      )}
    </div>
  );
}

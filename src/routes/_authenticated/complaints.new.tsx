import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { MapPin, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComplaintMap } from "@/components/complaint-map";

export const Route = createFileRoute("/_authenticated/complaints/new")({
  head: () => ({ meta: [{ title: "Report an Issue — UrbanPulse" }] }),
  component: NewComplaintPage,
});

const schema = z.object({
  title: z.string().trim().min(5, "Title needs at least 5 characters").max(160),
  description: z.string().trim().min(10, "Please describe the issue (min 10 chars)").max(2000),
  category_id: z.string().uuid("Please pick a category"),
  address: z.string().trim().max(300).optional().or(z.literal("")),
});

function NewComplaintPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [locating, setLocating] = useState(false);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaint_categories")
        .select("id, name, default_priority, department_id")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async (form: FormData) => {
      if (!user) throw new Error("Not signed in");
      const parsed = schema.safeParse({
        title: form.get("title"),
        description: form.get("description"),
        category_id: form.get("category_id"),
        address: form.get("address") ?? "",
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const category = categories.data?.find((c) => c.id === parsed.data.category_id);

      const { data: inserted, error } = await supabase
        .from("complaints")
        .insert({
          title: parsed.data.title,
          description: parsed.data.description,
          category_id: parsed.data.category_id,
          department_id: category?.department_id ?? null,
          priority: category?.default_priority ?? "medium",
          reporter_id: user.id,
          latitude: coords?.[0] ?? null,
          longitude: coords?.[1] ?? null,
          address: parsed.data.address || null,
        })
        .select("id, reference_code")
        .single();
      if (error) throw error;

      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${inserted.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("complaint-attachments").upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (!upErr) {
          await supabase.from("complaint_attachments").insert({
            complaint_id: inserted.id,
            uploader_id: user.id,
            storage_path: path,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            kind: file.type.startsWith("video/") ? "video" : "image",
          });
        }
      }

      return inserted;
    },
    onSuccess: (data) => {
      toast.success(`Complaint ${data.reference_code} submitted`);
      queryClient.invalidateQueries({ queryKey: ["complaints-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-complaints"] });
      navigate({ to: "/complaints/$id", params: { id: data.id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function useMyLocation() {
    if (!navigator.geolocation) return toast.error("Geolocation not available");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords([pos.coords.latitude, pos.coords.longitude]); setLocating(false); toast.success("Location captured"); },
      () => { setLocating(false); toast.error("Could not get location"); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit.mutate(new FormData(e.currentTarget));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Report an Issue</h1>
        <p className="text-muted-foreground mt-1">Add a photo and location so we can act quickly.</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select name="category_id" required>
                  <SelectTrigger id="category"><SelectValue placeholder="Pick a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.data?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required maxLength={160} placeholder="Pothole near school gate" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" required rows={5} maxLength={2000} placeholder="Describe the issue…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address (optional)</Label>
                <Input id="address" name="address" maxLength={300} placeholder="Street, landmark, area" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photo or video</CardTitle>
              <CardDescription>Evidence helps us triage faster.</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 rounded-md border border-dashed border-border p-4 cursor-pointer hover:bg-muted/40 transition">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{file?.name ?? "Click to upload"}</p>
                  <p className="text-xs text-muted-foreground">Images or short videos, up to 20 MB.</p>
                </div>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f && f.size > 20 * 1024 * 1024) return toast.error("File too large (max 20MB)");
                    setFile(f);
                  }}
                />
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
              <CardDescription>Tap the map or use GPS.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button type="button" variant="outline" className="w-full" onClick={useMyLocation} disabled={locating}>
                {locating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
                Use my location
              </Button>
              <ComplaintMap
                height={280}
                center={coords ?? [20.5937, 78.9629]}
                zoom={coords ? 15 : 5}
                onPick={(lat, lng) => setCoords([lat, lng])}
                picked={coords}
              />
              {coords && (
                <p className="text-xs text-muted-foreground">
                  {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
                </p>
              )}
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={submit.isPending}>
            {submit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit complaint
          </Button>
        </div>
      </form>
    </div>
  );
}

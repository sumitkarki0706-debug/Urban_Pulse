import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Crosshair, Loader2, MapPin, PlusCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS, STATUS_VARIANT, PRIORITY_LABELS, PRIORITY_COLORS, formatDate } from "@/lib/complaint-utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { geocode, haversineKm } from "@/lib/geo";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/complaints/")({
  head: () => ({ meta: [{ title: "Complaints — UrbanPulse" }] }),
  component: ComplaintsListPage,
});

function ComplaintsListPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const { data: currentUser } = useCurrentUser();
  const isStaff = !!currentUser?.isStaff;
  const [areaInput, setAreaInput] = useState("");
  const [radiusKm, setRadiusKm] = useState(25);
  const [center, setCenter] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [locating, setLocating] = useState(false);

  async function applyArea() {
    if (!areaInput.trim()) { setCenter(null); return; }
    setLocating(true);
    try {
      const res = await geocode(areaInput.trim());
      if (!res) toast.error("Could not find that location");
      else setCenter(res);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) { toast.error("Geolocation not available"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "My current location" });
        setAreaInput("My current location");
        setLocating(false);
      },
      () => { toast.error("Could not get your location"); setLocating(false); },
    );
  }

  const complaintsQuery = useQuery({
    queryKey: ["complaints-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("id, reference_code, title, description, status, priority, address, latitude, longitude, created_at, complaint_categories(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = (complaintsQuery.data ?? []).filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (isStaff && center) {
      if (c.latitude == null || c.longitude == null) return false;
      if (haversineKm(center.lat, center.lng, c.latitude, c.longitude) > radiusKm) return false;
    }
    if (query) {
      const q = query.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.reference_code.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Complaints</h1>
          <p className="text-muted-foreground mt-1">
            {isStaff ? "All reported issues across the city — filter by your jurisdiction area." : "All reported issues you can see."}
          </p>
        </div>
        <Button asChild><Link to="/complaints/new"><PlusCircle className="h-4 w-4 mr-2" />New complaint</Link></Button>
      </div>

      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />Jurisdiction area
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs text-muted-foreground">Location</label>
              <Input
                placeholder="Enter a city, area or address…"
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void applyArea(); }}
              />
            </div>
            <div className="w-[140px]">
              <label className="text-xs text-muted-foreground">Radius (km)</label>
              <Input
                type="number" min={1} max={200} value={radiusKm}
                onChange={(e) => setRadiusKm(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <Button onClick={() => void applyArea()} disabled={locating}>
              {locating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Apply
            </Button>
            <Button variant="outline" onClick={useMyLocation} disabled={locating}>
              <Crosshair className="h-4 w-4 mr-2" />Use my location
            </Button>
            {center && (
              <Button variant="ghost" onClick={() => { setCenter(null); setAreaInput(""); }}>Clear</Button>
            )}
            {center && (
              <p className="w-full text-xs text-muted-foreground">
                Showing complaints within {radiusKm} km of {center.label}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by title, code…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <CardTitle className="text-sm text-muted-foreground font-normal ml-auto">
              {rows.length} result{rows.length === 1 ? "" : "s"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border rounded-md border border-border">
            {complaintsQuery.isLoading && <div className="p-6 text-center text-muted-foreground">Loading…</div>}
            {!complaintsQuery.isLoading && rows.length === 0 && (
              <div className="p-10 text-center text-muted-foreground">
                No complaints match your filters.
              </div>
            )}
            {rows.map((c) => (
              <Link key={c.id} to="/complaints/$id" params={{ id: c.id }} className="block p-4 hover:bg-muted/50 transition">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{c.title}</span>
                      <span className="text-xs text-muted-foreground">{c.reference_code}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{c.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.complaint_categories?.name ?? "Uncategorized"} · {formatDate(c.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[c.priority]}`}>
                      {PRIORITY_LABELS[c.priority]}
                    </span>
                    <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"} className="capitalize">
                      {STATUS_LABELS[c.status] ?? c.status}
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

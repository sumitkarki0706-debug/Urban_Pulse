import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from "chart.js";
import { AlertTriangle, CheckCircle2, Clock, FileText, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComplaintMap } from "@/components/complaint-map";
import { STATUS_LABELS, STATUS_VARIANT, formatDate } from "@/lib/complaint-utils";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — UrbanPulse" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: user } = useCurrentUser();

  const complaintsQuery = useQuery({
    queryKey: ["dashboard-complaints", user?.id, user?.isStaff],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("id, reference_code, title, status, priority, latitude, longitude, created_at, category_id")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const complaints = complaintsQuery.data ?? [];
  const total = complaints.length;
  const open = complaints.filter((c) => !["resolved", "closed", "rejected"].includes(c.status)).length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;
  const critical = complaints.filter((c) => c.priority === "critical").length;

  const statusCounts = complaints.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const dailyCounts = last7.map((d) => {
    const key = d.toISOString().slice(0, 10);
    return complaints.filter((c) => c.created_at.slice(0, 10) === key).length;
  });

  const mapPoints = complaints
    .filter((c) => c.latitude != null && c.longitude != null)
    .slice(0, 100)
    .map((c) => ({ id: c.id, lat: c.latitude!, lng: c.longitude!, title: c.title, status: c.status }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {user?.isStaff ? "Operations dashboard" : `Hi, ${user?.fullName?.split(" ")[0] ?? "there"}`}
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.isStaff ? "City-wide complaint overview." : "Track your reported issues and city updates."}
          </p>
        </div>
        <Button asChild><Link to="/complaints/new"><PlusCircle className="h-4 w-4 mr-2" />Report issue</Link></Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard icon={FileText} label="Total complaints" value={total} tone="primary" />
        <KpiCard icon={Clock} label="Open" value={open} tone="warning" />
        <KpiCard icon={CheckCircle2} label="Resolved" value={resolved} tone="success" />
        <KpiCard icon={AlertTriangle} label="Critical" value={critical} tone="destructive" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Reports — last 7 days</CardTitle>
            <CardDescription>Daily volume of new complaints.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar
                data={{
                  labels: last7.map((d) => d.toLocaleDateString(undefined, { weekday: "short" })),
                  datasets: [{
                    label: "Complaints",
                    data: dailyCounts,
                    backgroundColor: "rgba(80, 120, 200, 0.7)",
                    borderRadius: 6,
                  }],
                }}
                options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { precision: 0 } } } }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By status</CardTitle>
            <CardDescription>Current pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {total === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : (
                <Doughnut
                  data={{
                    labels: Object.keys(statusCounts).map((k) => STATUS_LABELS[k] ?? k),
                    datasets: [{
                      data: Object.values(statusCounts),
                      backgroundColor: ["#6b7fb0", "#d4a34c", "#7fa370", "#4a8ab0", "#c86558", "#8b7aa8", "#a8a8a8"],
                    }],
                  }}
                  options={{ maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map + recent list */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Complaint map</CardTitle>
            <CardDescription>{mapPoints.length} geotagged complaints</CardDescription>
          </CardHeader>
          <CardContent>
            <ComplaintMap points={mapPoints} height={420} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent</CardTitle>
            <CardDescription>Latest reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-auto">
            {complaints.slice(0, 8).map((c) => (
              <Link key={c.id} to="/complaints/$id" params={{ id: c.id }} className="block rounded-md border border-border p-3 hover:bg-muted/50 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.reference_code} · {formatDate(c.created_at)}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"} className="capitalize shrink-0 text-xs">
                    {STATUS_LABELS[c.status] ?? c.status}
                  </Badge>
                </div>
              </Link>
            ))}
            {complaints.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No complaints yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: "primary" | "warning" | "success" | "destructive" }) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/20 text-warning-foreground",
    success: "bg-success/20 text-success",
    destructive: "bg-destructive/15 text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-4">
        <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

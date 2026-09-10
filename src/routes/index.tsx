import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, MapPin, ShieldCheck, Sparkles, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </span>
            UrbanPulse
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-accent" />
          AI-powered smart city operations
        </div>
        <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight text-balance">
          A single pulse for every <span className="text-primary">civic issue</span> in your city.
        </h1>
        <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground">
          Citizens report potholes, garbage, streetlights, and leaks with a photo and a tap.
          Authorities triage, assign, and resolve — with a live map, analytics, and audit trail.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg"><Link to="/auth" search={{ mode: "signup" }}>Report an issue</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/auth">Authority login</Link></Button>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: MapPin, title: "GPS-tagged reports", body: "Every complaint pinned to a precise location with photo evidence." },
            { icon: Users, title: "Role-based workflow", body: "Citizens, officers, engineers, and contractors — each with the right view." },
            { icon: BarChart3, title: "Live analytics", body: "Heat maps, resolution times, and department SLAs at a glance." },
            { icon: ShieldCheck, title: "Full audit trail", body: "Every status change logged. Nothing falls through the cracks." },
            { icon: Sparkles, title: "AI-ready", body: "Categorization, duplicate detection, and priority prediction hooks built in." },
            { icon: Activity, title: "Real-time updates", body: "Reporters get status notifications from acknowledgement to resolution." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        UrbanPulse — Smart City Operations Platform
      </footer>
    </div>
  );
}

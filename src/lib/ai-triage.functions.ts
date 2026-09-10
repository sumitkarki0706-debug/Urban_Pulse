import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface TriageInput {
  complaintId: string;
  title: string;
  description: string;
}

export const triageComplaint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: TriageInput) => d)
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway not configured");

    const { data: cats } = await context.supabase.from("complaint_categories").select("name");
    const { data: depts } = await context.supabase.from("departments").select("name");
    const categoryList = (cats ?? []).map((c) => c.name).join(", ");
    const deptList = (depts ?? []).map((d) => d.name).join(", ");

    const prompt = `You are a smart-city complaint triage assistant. Analyze the citizen complaint and return JSON with fields: suggested_category (one of: ${categoryList}), suggested_priority (low|medium|high|critical), suggested_department (one of: ${deptList}), summary (1-2 sentences), confidence (0-1).\n\nTitle: ${data.title}\nDescription: ${data.description}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Return only valid JSON, no markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI error: ${res.status}`);
    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "{}";
    const cleaned = text.replace(/```json|```/g, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(cleaned); } catch { parsed = { summary: cleaned }; }

    const priority = ["low", "medium", "high", "critical"].includes(parsed.suggested_priority)
      ? parsed.suggested_priority : null;

    const row = {
      complaint_id: data.complaintId,
      suggested_category: parsed.suggested_category ?? null,
      suggested_priority: priority,
      suggested_department: parsed.suggested_department ?? null,
      summary: parsed.summary ?? null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : null,
      model: "google/gemini-2.5-flash",
      raw: parsed,
      created_by: context.userId,
    };
    const { error } = await context.supabase.from("ai_analysis").upsert(row, { onConflict: "complaint_id" });
    if (error) throw error;
    return row;
  });

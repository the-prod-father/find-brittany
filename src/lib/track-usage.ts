import { createServiceClient } from "./supabase";

interface UsageEntry {
  service: "anthropic" | "gemini" | "openai";
  model: string;
  endpoint: string;
  evidence_id?: string;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  cost_cents?: number;
  duration_ms?: number;
  notes?: string;
}

// Approximate costs per 1K tokens (in cents)
const COSTS: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 0.3, output: 1.5 },
  "gemini-2.0-flash": { input: 0.01, output: 0.04 },
  "whisper-1": { input: 0.6, output: 0 }, // $0.006/min, estimate ~1K tokens/min
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = COSTS[model] || { input: 0.1, output: 0.5 };
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
}

export async function trackUsage(entry: UsageEntry) {
  try {
    const supabase = createServiceClient();
    await supabase.from("ai_usage").insert({
      service: entry.service,
      model: entry.model,
      endpoint: entry.endpoint,
      evidence_id: entry.evidence_id || null,
      input_tokens: entry.input_tokens || null,
      output_tokens: entry.output_tokens || null,
      total_tokens: entry.total_tokens || (entry.input_tokens || 0) + (entry.output_tokens || 0),
      cost_cents: entry.cost_cents || (entry.input_tokens && entry.output_tokens
        ? estimateCost(entry.model, entry.input_tokens, entry.output_tokens)
        : null),
      duration_ms: entry.duration_ms || null,
      notes: entry.notes || null,
    });
  } catch (err) {
    console.error("Usage tracking failed:", err);
  }
}

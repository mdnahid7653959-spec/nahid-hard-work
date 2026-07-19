declare const process: { env: Record<string, string | undefined> };
import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseFor(ctx: ToolContext) {
  const headers: Record<string, string> = {};
  if (ctx.isAuthenticated()) headers.Authorization = `Bearer ${ctx.getToken()}`;
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers }, auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export default defineTool({
  name: "get_product",
  title: "Get product",
  description: "Fetch full details for a single product by slug or id.",
  inputSchema: {
    slug: z.string().trim().min(1).optional().describe("Product slug."),
    id: z.string().uuid().optional().describe("Product UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug, id }, ctx) => {
    if (!slug && !id) {
      return { content: [{ type: "text", text: "Provide slug or id." }], isError: true };
    }
    const supabase = supabaseFor(ctx);
    let query = supabase.from("products_public").select("*").limit(1);
    query = id ? query.eq("id", id) : query.eq("slug", slug!);
    const { data, error } = await query.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { product: data },
    };
  },
});

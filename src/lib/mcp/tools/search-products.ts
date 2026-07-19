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
  name: "search_products",
  title: "Search products",
  description: "Search the marketplace catalog by keyword. Returns id, name, slug, price, and image.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Search keyword matched against product name."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results, default 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    const supabase = supabaseFor(ctx);
    const { data, error } = await supabase
      .from("products_public")
      .select("id, name, slug, price, sale_price, image_url")
      .ilike("name", `%${query}%`)
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { products: data ?? [] },
    };
  },
});

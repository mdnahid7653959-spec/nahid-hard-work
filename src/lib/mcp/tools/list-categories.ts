declare const process: { env: Record<string, string | undefined> };
import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

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
  name: "list_categories",
  title: "List categories",
  description: "List all storefront categories.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const supabase = supabaseFor(ctx);
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, parent_id, image_url")
      .order("name");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { categories: data ?? [] },
    };
  },
});

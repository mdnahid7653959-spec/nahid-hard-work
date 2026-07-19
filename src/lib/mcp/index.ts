import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search-products";
import getProduct from "./tools/get-product";
import listCategories from "./tools/list-categories";
import listMyOrders from "./tools/list-my-orders";
import getMyProfile from "./tools/get-my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ecom-genesis-mcp",
  title: "Darzo Marketplace MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Darzo multi-vendor marketplace. Use search_products / get_product / list_categories to browse the public catalog. Use list_my_orders and get_my_profile to read data belonging to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProducts, getProduct, listCategories, listMyOrders, getMyProfile],
});

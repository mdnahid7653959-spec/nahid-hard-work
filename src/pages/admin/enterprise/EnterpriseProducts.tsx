import React, { useState, useEffect } from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { AdminAuditLogService } from "@/services/admin/security/AdminAuditLogService";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  Package,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Search,
  Filter,
  RefreshCcw,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export const EnterpriseProducts: React.FC = () => {
  const { adminUser, adminRole } = useAdminAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setProducts(list);
    } catch (error) {
      console.error("Fetch products error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, "products", id));
      await AdminAuditLogService.logAction({
        adminId: adminUser?.uid || "ADMIN",
        adminEmail: adminUser?.email || "",
        adminRole: adminRole || "Admin",
        action: "PRODUCT_DELETE",
        module: "PRODUCT_CATALOG",
        details: `Deleted product: ${name}`,
        targetId: id,
        status: "SUCCESS"
      });

      toast({ title: "Product Deleted", description: `${name} was deleted.` });
      loadProducts();
    } catch (error) {
      toast({ title: "Delete Failed", description: "Could not delete product.", variant: "destructive" });
    }
  };

  const filteredProducts = products.filter(p =>
    (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              Enterprise Product Catalog & Stock Manager
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-400">FIRESTORE SYNC</Badge>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage product listings, SKU variants, category tags, and bulk stock levels.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={loadProducts} className="bg-slate-800 text-slate-200 text-xs border border-slate-700">
              <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search products by title, category, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-950 border-slate-800 text-white text-xs font-mono"
          />
        </div>

        {/* PRODUCT TABLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Product Info</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200 font-medium">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No products found in Firestore catalog
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-3 flex items-center gap-3">
                        <img
                          src={prod.image || prod.images?.[0] || "/placeholder.svg"}
                          alt={prod.name}
                          className="h-10 w-10 object-cover rounded-lg border border-slate-800 bg-slate-950"
                        />
                        <div>
                          <p className="font-bold text-white max-w-xs truncate">{prod.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">ID: #{prod.id.slice(0, 8)}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                          {prod.category || "General"}
                        </Badge>
                      </td>
                      <td className="p-3 font-extrabold text-emerald-400">
                        ৳{(prod.price || 0).toLocaleString("en-BD")}
                      </td>
                      <td className="p-3 font-mono">
                        {prod.stock !== undefined ? prod.stock : (prod.inStock ? "In Stock" : "Out of Stock")}
                      </td>
                      <td className="p-3">
                        <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px]">
                          ACTIVE
                        </Badge>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </EnterpriseAdminLayout>
  );
};

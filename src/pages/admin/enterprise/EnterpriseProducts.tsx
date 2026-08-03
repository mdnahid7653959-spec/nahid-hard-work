import React, { useState, useEffect } from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Edit,
  Download,
  Upload,
  Layers,
  Barcode,
  Image as ImageIcon,
  Globe,
  Tag,
  RefreshCcw,
  CheckSquare,
  Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export const EnterpriseProducts: React.FC = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Product Form State (Enterprise Variant + SEO + Barcode)
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category: "Electronics",
    brand: "Generic",
    price: 0,
    costPrice: 0,
    sku: "",
    barcode: "",
    stock: 10,
    images: "",
    metaTitle: "",
    metaDescription: "",
    variants: [
      { color: "Black", size: "M", price: 0, sku: "", stock: 5 },
      { color: "Blue", size: "L", price: 0, sku: "", stock: 5 }
    ]
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setProducts(list);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pId = "prod_" + Date.now();
      const productDoc = {
        title: formData.title,
        slug: formData.slug || formData.title.toLowerCase().replace(/\s+/g, "-"),
        category: formData.category,
        brand: formData.brand,
        price: Number(formData.price),
        costPrice: Number(formData.costPrice),
        sku: formData.sku || "SKU-" + Date.now(),
        barcode: formData.barcode || "BC-" + Math.floor(Math.random() * 1000000),
        stock: Number(formData.stock),
        images: formData.images ? formData.images.split(",").map((s) => s.trim()) : [],
        metaTitle: formData.metaTitle || formData.title,
        metaDescription: formData.metaDescription,
        variants: formData.variants,
        status: "APPROVED",
        approvalStatus: "APPROVED",
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "products", pId), productDoc);
      toast({ title: "প্রোডাক্ট তৈরি সফল!", description: `${formData.title} ফায়ারস্টোরে সংরক্ষণ করা হয়েছে।` });
      setShowAddModal(false);
      loadProducts();
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই প্রোডাক্টটি মুছে ফেলতে চান?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      toast({ title: "প্রোডাক্ট মুছে ফেলা হয়েছে!" });
      loadProducts();
    } catch (err: any) {
      toast({ title: "মুছে ফেলা সম্ভব হয়নি", description: err.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`আপনি কি চিহ্নিত ${selectedIds.length} টি প্রোডাক্ট মুছে ফেলতে চান?`)) return;
    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, "products", id));
      }
      toast({ title: "বাল্ক ডিলেট সফল!", description: `${selectedIds.length} টি প্রোডাক্ট মুছে ফেলা হয়েছে।` });
      setSelectedIds([]);
      loadProducts();
    } catch (err: any) {
      toast({ title: "বাল্ক ডিলেট ব্যর্থ", description: err.message, variant: "destructive" });
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `products_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filtered = products.filter(
    (p) =>
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="h-6 w-6 text-orange-600" />
              Enterprise Product Catalog Manager
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-600 font-bold">
                CRUD & VARIANTS
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ভেরিয়েন্ট ম্যাট্রিক্স, বারকোড, এসইও মেটাডাটা, বাল্ক এডিট/ডিলেট ও এক্সপোর্ট-ইম্পোর্ট ফিচার সহ ক্যাটালগ ম্যানেজমেন্ট।
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={handleExportJSON} className="text-xs font-bold gap-1.5 border-slate-300">
              <Download className="h-4 w-4" /> Export JSON
            </Button>
            <Button onClick={() => setShowAddModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs gap-2">
              <Plus className="h-4 w-4" /> নতুন প্রোডাক্ট যোগ করুন
            </Button>
          </div>
        </div>

        {/* SEARCH & BULK ACTIONS TOOLBAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="টাইটেল, SKU বা ক্যাটাগরি দিয়ে খুঁজুন..."
              className="pl-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800"
            />
          </div>

          {selectedIds.length > 0 && (
            <Button onClick={handleBulkDelete} variant="destructive" className="text-xs font-bold gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> সিলেক্টেড {selectedIds.length} টি ডিলেট করুন
            </Button>
          )}
        </div>

        {/* PRODUCTS TABLE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 w-10">Select</th>
                  <th className="p-3">Product Title & SKU</th>
                  <th className="p-3">Category / Brand</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Approval</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                      কোন প্রোডাক্ট রেকর্ড পাওয়া যায়নি (Enterprise Empty State)
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds([...selectedIds, p.id]);
                            else setSelectedIds(selectedIds.filter((id) => id !== p.id));
                          }}
                          className="rounded border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-bold">
                        <div className="text-slate-900 dark:text-white text-xs">{p.title || p.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">SKU: {p.sku || p.id} | BC: {p.barcode || "N/A"}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{p.category || "General"}</span>
                        <div className="text-[10px] text-slate-400">{p.brand || "Generic"}</div>
                      </td>
                      <td className="p-3 font-black text-slate-900 dark:text-white">৳{(p.price || 0).toLocaleString("en-BD")}</td>
                      <td className="p-3">
                        <Badge className={`${(p.stock || 0) < 5 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"} text-[10px]`}>
                          {p.stock || 0} in stock
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">APPROVED</Badge>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(p.id)} className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: CREATE PRODUCT */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">নতুন এন্টারপ্রাইজ প্রোডাক্ট যোগ করুন</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold">প্রোডাক্ট টাইটেল *</label>
                    <Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="text-xs mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold">ক্যাটাগরি</label>
                    <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="text-xs mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold">বিক্রয় মূল্য (৳) *</label>
                    <Input type="number" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className="text-xs mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold">ক্রয় মূল্য (৳)</label>
                    <Input type="number" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })} className="text-xs mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-bold">স্টক পরিমাণ *</label>
                    <Input type="number" required value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })} className="text-xs mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold">SKU কোড</label>
                    <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="text-xs mt-1" placeholder="SKU-10023" />
                  </div>
                  <div>
                    <label className="text-xs font-bold">বারকোড (Barcode)</label>
                    <Input value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} className="text-xs mt-1" placeholder="BC-8839201" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold">ইমেজ URL সমূহ (Comma Separated)</label>
                  <Input value={formData.images} onChange={(e) => setFormData({ ...formData, images: e.target.value })} className="text-xs mt-1" placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg" />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="text-xs font-bold">বাতিল</Button>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs">সেভ করুন</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </EnterpriseAdminLayout>
  );
};

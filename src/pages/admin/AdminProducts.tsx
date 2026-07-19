import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Eye, MoreHorizontal, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAdminCacheInvalidation } from "@/hooks/useRealtimeSync";
import { AdminProductPreviewDialog } from "@/components/admin/AdminProductPreviewDialog";

interface Product {
  id: string;
  name: string;
  slug: string;
  regular_price: number;
  discount_price: number | null;
  stock_quantity: number;
  status: string;
  approval_status: string | null;
  seller_id: string | null;
  is_featured: boolean;
  created_at: string;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; productId: string; action: "reject" | "ban" }>({ open: false, productId: "", action: "reject" });
  const [rejectReason, setRejectReason] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();
  const { admin } = useAdminAuth();
  const { invalidateProducts } = useAdminCacheInvalidation();

  const fetchProducts = async () => {
    if (!admin?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("admin-products", {
        body: { action: "list", adminId: admin.id }
      });

      if (error || data?.error) {
        console.error("Error fetching products:", error || data?.error);
      } else {
        setProducts(data?.products || []);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!admin?.id) return;
    fetchProducts();

    const channel = supabase
      .channel("admin-products-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [admin?.id]);


  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    invalidateProducts();
    toast({ title: "Products refreshed", description: "All caches updated" });
    setRefreshing(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    if (!admin?.id) {
      toast({ variant: "destructive", title: "Error", description: "Admin session not found" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("admin-products", {
        body: { action: "delete", adminId: admin.id, productId: id }
      });
      if (error || data?.error) {
        toast({ variant: "destructive", title: "Error", description: data?.error || "Failed to delete" });
      } else {
        toast({ title: "Product deleted successfully" });
        fetchProducts();
        invalidateProducts();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!admin?.id) {
      toast({ variant: "destructive", title: "Error", description: "Admin session not found" });
      return;
    }
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const { data, error } = await supabase.functions.invoke("admin-products", {
        body: { action: "toggle-status", adminId: admin.id, productId: id, productData: { status: newStatus } }
      });
      if (error || data?.error) {
        toast({ variant: "destructive", title: "Error", description: data?.error || "Failed to update" });
      } else {
        toast({ title: `Product ${newStatus}` });
        fetchProducts();
        invalidateProducts();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleApprove = async (productId: string) => {
    if (!admin?.id) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-products", {
        body: { action: "approve-product", adminId: admin.id, productId }
      });
      if (error || data?.error) {
        toast({ variant: "destructive", title: "Error", description: data?.error || "Failed to approve" });
      } else {
        toast({ title: "Product approved!", description: "Product is now live." });
        fetchProducts();
        invalidateProducts();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
    setActionLoading(false);
  };

  const handleRejectOrBan = async () => {
    if (!admin?.id || !rejectDialog.productId) return;
    setActionLoading(true);
    const action = rejectDialog.action === "ban" ? "ban-product" : "reject-product";
    try {
      const { data, error } = await supabase.functions.invoke("admin-products", {
        body: { action, adminId: admin.id, productId: rejectDialog.productId, productData: { reason: rejectReason } }
      });
      if (error || data?.error) {
        toast({ variant: "destructive", title: "Error", description: data?.error || "Failed" });
      } else {
        toast({ title: rejectDialog.action === "ban" ? "Product banned" : "Product rejected" });
        fetchProducts();
        invalidateProducts();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
    setActionLoading(false);
    setRejectDialog({ open: false, productId: "", action: "reject" });
    setRejectReason("");
  };

  const getApprovalBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "banned":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><Ban className="h-3 w-3 mr-1" />Banned</Badge>;
      default:
        return <Badge variant="secondary">{status || "N/A"}</Badge>;
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "pending") return matchesSearch && p.approval_status === "pending";
    if (activeTab === "approved") return matchesSearch && p.approval_status === "approved";
    if (activeTab === "rejected") return matchesSearch && (p.approval_status === "rejected" || p.approval_status === "banned");
    if (activeTab === "seller") return matchesSearch && p.seller_id !== null;
    return matchesSearch;
  });

  const pendingCount = products.filter(p => p.approval_status === "pending").length;

  return (
    <AdminLayout title="Products">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog & approvals</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Link to="/admin/products/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({products.length})</TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected/Banned</TabsTrigger>
            <TabsTrigger value="seller">Seller Products</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No products found</TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className={product.approval_status === "pending" ? "bg-yellow-500/5" : ""}>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">/{product.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">৳{(product.discount_price || product.regular_price).toLocaleString()}</p>
                        {product.discount_price && (
                          <p className="text-sm text-muted-foreground line-through">৳{product.regular_price.toLocaleString()}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.stock_quantity > 10 ? "outline" : "destructive"}>
                        {product.stock_quantity} in stock
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.status === "active" ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleStatus(product.id, product.status)}
                      >
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{getApprovalBadge(product.approval_status)}</TableCell>
                    <TableCell>
                      {product.seller_id ? (
                        <Badge variant="outline" className="text-xs">Seller</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Admin</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem asChild>
                            <Link to={`/product/${product.slug}`}>
                              <Eye className="h-4 w-4 mr-2" />View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/products/${product.id}`}>
                              <Edit className="h-4 w-4 mr-2" />Edit
                            </Link>
                          </DropdownMenuItem>

                          {/* Approval Actions */}
                          {product.approval_status === "pending" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleApprove(product.id)}
                                className="text-green-600 focus:text-green-600"
                                disabled={actionLoading}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setRejectDialog({ open: true, productId: product.id, action: "reject" })}
                                className="text-orange-600 focus:text-orange-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {product.approval_status !== "banned" && product.seller_id && (
                            <DropdownMenuItem
                              onClick={() => setRejectDialog({ open: true, productId: product.id, action: "ban" })}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Ban className="h-4 w-4 mr-2" />Ban
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Reject/Ban Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => { if (!open) { setRejectDialog({ open: false, productId: "", action: "reject" }); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rejectDialog.action === "ban" ? "Ban Product" : "Reject Product"}</DialogTitle>
            <DialogDescription>
              {rejectDialog.action === "ban"
                ? "This will ban the product and prevent the seller from relisting it."
                : "Provide a reason so the seller knows what to fix."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog({ open: false, productId: "", action: "reject" }); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectOrBan}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : rejectDialog.action === "ban" ? "Ban Product" : "Reject Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

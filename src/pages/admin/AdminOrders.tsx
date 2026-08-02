import { useEffect, useState } from "react";
import { 
  Eye, 
  MoreHorizontal, 
  Package, 
  Truck, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  RefreshCw, 
  Calendar, 
  CreditCard,
  Printer,
  PackageCheck,
  Tag,
  Save,
  CheckCircle2,
  ExternalLink,
  Edit
} from "lucide-react";
import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAdminCacheInvalidation } from "@/hooks/useRealtimeSync";

import { PrintableInvoiceModal } from "@/components/admin/PrintableInvoiceModal";
import { PrintablePackingSlipModal } from "@/components/admin/PrintablePackingSlipModal";
import { PrintableShippingLabelModal } from "@/components/admin/PrintableShippingLabelModal";
import { OrderTimelineAudit } from "@/components/admin/OrderTimelineAudit";

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  subtotal: number;
  shipping_cost: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  total: number;
  notes: string | null;
  shipping_address: any;
  billing_address: any;
  courier_name?: string | null;
  tracking_number?: string | null;
  created_at: string;
  updated_at: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  price: number;
  total: number;
  product_id: string | null;
  product_image?: string;
  product_category?: string;
  sku?: string | null;
}

interface CustomerInfo {
  email: string;
  full_name: string | null;
  phone: string | null;
}

interface LinkedConsignment {
  id: string;
  consignment_number: string | null;
  courier: string | null;
  tracking_number: string | null;
  status: string;
  shipped_at: string | null;
  delivered_at: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-warning text-warning-foreground",
  processing: "bg-blue-500 text-white",
  shipped: "bg-purple-500 text-white",
  delivered: "bg-success text-success-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
  refunded: "bg-muted text-muted-foreground",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-warning text-warning-foreground",
  paid: "bg-success text-success-foreground",
  failed: "bg-destructive text-destructive-foreground",
  refunded: "bg-muted text-muted-foreground",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const { invalidateOrders } = useAdminCacheInvalidation();
  const { admin } = useAdminAuth();

  // Order Details Dialog State
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [linkedConsignment, setLinkedConsignment] = useState<LinkedConsignment | null>(null);

  // Courier & Tracking edit state
  const [courierInput, setCourierInput] = useState("");
  const [trackingInput, setTrackingInput] = useState("");
  const [savingCourier, setSavingCourier] = useState(false);

  // Printable Modals State
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [packingSlipOpen, setPackingSlipOpen] = useState(false);
  const [shippingLabelOpen, setShippingLabelOpen] = useState(false);

  const fetchOrders = async () => {
    if (!admin?.id) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke("admin-orders", {
        body: { action: "list", adminId: admin.id, data: { limit: 100 } }
      });

      if (error || data?.error) {
        // Direct DB fallback if edge function fails
        const { data: dbOrders, error: dbErr } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (dbErr) {
          console.error("Fetch orders error:", dbErr);
          toast({ variant: "destructive", title: "Error", description: "Failed to load orders" });
        } else {
          setOrders(dbOrders || []);
        }
      } else {
        setOrders(data?.orders || []);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to load orders" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // Real-time subscription
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    invalidateOrders();
    toast({ title: "Orders synced" });
    setRefreshing(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const nowIso = new Date().toISOString();

      // 1. Invoke function or fallback to DB update
      if (admin?.id) {
        const { data, error } = await supabase.functions.invoke("admin-orders", {
          body: { action: "update-status", adminId: admin.id, orderId: id, data: { status: newStatus } }
        });
        if (error || data?.error) {
          await adminDb.update("orders", { status: newStatus, updated_at: nowIso }, { id });
          await supabase.from("orders").update({ status: newStatus, updated_at: nowIso }).eq("id", id);
        }
      } else {
        await adminDb.update("orders", { status: newStatus, updated_at: nowIso }, { id });
        await supabase.from("orders").update({ status: newStatus, updated_at: nowIso }).eq("id", id);
      }

      // 2. Record transition in order_timelines
      const timelineRecord = {
        order_id: id,
        status: newStatus,
        notes: `Order status changed to ${newStatus}`,
        changed_by: admin?.displayName || admin?.username || "Admin",
        created_at: nowIso,
      };

      try {
        await supabase.from("order_timelines" as any).insert(timelineRecord);
      } catch {
        await adminDb.insert("order_timelines", timelineRecord);
      }

      toast({ title: "Order status updated", description: `Changed status to ${newStatus}` });
      fetchOrders();
      invalidateOrders();

      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err: any) {
      console.error("Status update error:", err);
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to update status" });
    }
  };

  const updatePaymentStatus = async (id: string, payment_status: string) => {
    try {
      const nowIso = new Date().toISOString();
      if (admin?.id) {
        const { data, error } = await supabase.functions.invoke("admin-orders", {
          body: { action: "update-payment", adminId: admin.id, orderId: id, data: { payment_status } }
        });
        if (error || data?.error) {
          await adminDb.update("orders", { payment_status, updated_at: nowIso }, { id });
          await supabase.from("orders").update({ payment_status, updated_at: nowIso }).eq("id", id);
        }
      } else {
        await adminDb.update("orders", { payment_status, updated_at: nowIso }, { id });
        await supabase.from("orders").update({ payment_status, updated_at: nowIso }).eq("id", id);
      }

      toast({ title: "Payment status updated", description: `Payment status changed to ${payment_status}` });
      fetchOrders();
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder({ ...selectedOrder, payment_status });
      }
    } catch (err: any) {
      console.error("Payment status update error:", err);
      toast({ variant: "destructive", title: "Error", description: err.message || "Failed to update payment status" });
    }
  };

  const handleSaveCourierTracking = async () => {
    if (!selectedOrder) return;
    setSavingCourier(true);
    try {
      const nowIso = new Date().toISOString();
      const updates = {
        courier_name: courierInput.trim() || null,
        tracking_number: trackingInput.trim() || null,
        updated_at: nowIso,
      };

      await supabase.from("orders").update(updates).eq("id", selectedOrder.id);
      await adminDb.update("orders", updates, { id: selectedOrder.id });

      // Audit note
      const timelineRecord = {
        order_id: selectedOrder.id,
        status: selectedOrder.status,
        notes: `Assigned Courier: ${courierInput || 'None'}, Tracking #: ${trackingInput || 'None'}`,
        changed_by: admin?.displayName || admin?.username || "Admin",
        created_at: nowIso,
      };
      try {
        await supabase.from("order_timelines" as any).insert(timelineRecord);
      } catch {}

      setSelectedOrder({
        ...selectedOrder,
        courier_name: courierInput.trim(),
        tracking_number: trackingInput.trim(),
      });

      toast({ title: "Courier info saved", description: "Updated tracking parameters" });
      fetchOrders();
    } catch (err: any) {
      console.error("Courier save error:", err);
      toast({ variant: "destructive", title: "Failed to save", description: err.message });
    } finally {
      setSavingCourier(false);
    }
  };

  const viewOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setCourierInput(order.courier_name || "");
    setTrackingInput(order.tracking_number || "");
    setDetailsOpen(true);
    setLoadingDetails(true);

    try {
      if (!admin?.id) return;
      
      const { data, error } = await supabase.functions.invoke("admin-orders", {
        body: { action: "get", adminId: admin.id, orderId: order.id }
      });

      if (!error && data?.order) {
        const fetchedOrder = data.order;
        const items = fetchedOrder.order_items || [];
        const itemsWithDetails = await Promise.all(
          items.map(async (item: any) => {
            let product_image = null;
            let product_category = null;

            if (item.product_id) {
              const { data: images } = await supabase
                .from("product_images")
                .select("image_url, is_primary")
                .eq("product_id", item.product_id);

              if (images && images.length > 0) {
                const primaryImage = images.find((img: any) => img.is_primary);
                product_image = primaryImage?.image_url || images[0]?.image_url || null;
              }

              const { data: product } = await supabase
                .from("products_public")
                .select("category_id")
                .eq("id", item.product_id)
                .single();

              if (product?.category_id) {
                const { data: category } = await supabase
                  .from("categories")
                  .select("name")
                  .eq("id", product.category_id)
                  .single();
                product_category = category?.name || null;
              }
            }

            return { ...item, product_image, product_category };
          })
        );
        setOrderItems(itemsWithDetails);

        if (fetchedOrder.customer) {
          setCustomerInfo(fetchedOrder.customer);
        }
      } else {
        // Direct query fallback for items
        const { data: directItems } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", order.id);
        setOrderItems(directItems || []);
      }

      // Fetch linked consignment from consignments table
      const { data: consData } = await supabase
        .from("consignments")
        .select("id, consignment_number, courier, tracking_number, status, shipped_at, delivered_at")
        .eq("order_id", order.id)
        .single();
      
      if (consData) {
        setLinkedConsignment(consData as LinkedConsignment);
      } else {
        setLinkedConsignment(null);
      }

    } catch (err) {
      console.error("Error fetching order details:", err);
    }

    setLoadingDetails(false);
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.tracking_number && order.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const processingCount = orders.filter((o) => o.status === "processing").length;
  const shippedCount = orders.filter((o) => o.status === "shipped").length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const totalRevenue = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + o.total, 0);

  const formatAddress = (address: any) => {
    if (!address) return "No address provided";
    if (typeof address === "string") return address;
    const parts = [
      address.name || address.firstName,
      address.street || address.address || address.address_line1,
      address.city,
      address.state,
      address.zip || address.postal_code,
      address.country,
    ].filter(Boolean);
    const addressText = parts.join(", ") || "No address provided";
    const phone = address.phone;
    return phone ? `${addressText}\n📞 ${phone}` : addressText;
  };

  return (
    <AdminLayout title="Orders">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Orders & Fulfillment</h1>
            <p className="text-muted-foreground">Manage customer orders, status timelines, dynamic invoices & courier shipping</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Sync Orders
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-500">{processingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Shipped</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-500">{shippedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{deliveredCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Paid Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">৳{totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Search order # or tracking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status Transition</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading orders...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium font-mono">#{order.order_number}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method || 'COD'}
                        </p>
                        {order.tracking_number && (
                          <p className="text-[11px] text-purple-600 font-mono flex items-center gap-1 mt-0.5">
                            <Truck className="h-3 w-3" />
                            {order.tracking_number}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(order.created_at).toLocaleDateString('en-BD')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(v) => updateStatus(order.id, v)}
                      >
                        <SelectTrigger className="w-32 h-8 p-0 border-0 bg-transparent">
                          <Badge className={statusColors[order.status] || "bg-muted"}>{order.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.payment_status}
                        onValueChange={(v) => updatePaymentStatus(order.id, v)}
                      >
                        <SelectTrigger className="w-24 h-8 p-0 border-0 bg-transparent">
                          <Badge className={paymentStatusColors[order.payment_status] || "bg-muted"}>
                            {order.payment_status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-medium text-primary">৳{order.total.toFixed(0)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => viewOrderDetails(order)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details & Timelines
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedOrder(order);
                            setInvoiceModalOpen(true);
                          }}>
                            <Printer className="h-4 w-4 mr-2" />
                            Print Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedOrder(order);
                            setPackingSlipOpen(true);
                          }}>
                            <PackageCheck className="h-4 w-4 mr-2" />
                            Print Packing Slip
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedOrder(order);
                            setShippingLabelOpen(true);
                          }}>
                            <Tag className="h-4 w-4 mr-2" />
                            Print Shipping Label
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

      {/* Order Details & Audit Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span>Order #{selectedOrder?.order_number}</span>
              </div>

              {/* Printable Action Buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setInvoiceModalOpen(true)}>
                  <Printer className="h-4 w-4 mr-1" />
                  Invoice
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPackingSlipOpen(true)}>
                  <PackageCheck className="h-4 w-4 mr-1" />
                  Packing Slip
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShippingLabelOpen(true)}>
                  <Tag className="h-4 w-4 mr-1" />
                  Shipping Label
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              Placed on {selectedOrder && new Date(selectedOrder.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Row & Transition Select */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg border">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={statusColors[selectedOrder?.status || "pending"]}>
                    Status: {selectedOrder?.status}
                  </Badge>
                  <Badge className={paymentStatusColors[selectedOrder?.payment_status || "pending"]}>
                    Payment: {selectedOrder?.payment_status}
                  </Badge>
                  {selectedOrder?.payment_method && (
                    <Badge variant="outline">
                      <CreditCard className="h-3 w-3 mr-1" />
                      {selectedOrder.payment_method}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Change Status:</span>
                  <Select
                    value={selectedOrder?.status}
                    onValueChange={(v) => selectedOrder && updateStatus(selectedOrder.id, v)}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Courier & Shipping Tracking Section */}
              <Card className="border-purple-500/20 bg-purple-50/10 dark:bg-purple-950/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-purple-600" />
                      <span>Courier Shipping & Consignment Tracking</span>
                    </div>
                    {linkedConsignment && (
                      <Badge className="bg-purple-600 text-white font-mono text-xs">
                        Consignment: #{linkedConsignment.consignment_number || linkedConsignment.id.slice(0, 8)}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="courier-name" className="text-xs">Courier Service Provider</Label>
                      <Select value={courierInput} onValueChange={setCourierInput}>
                        <SelectTrigger id="courier-name" className="h-9 text-xs">
                          <SelectValue placeholder="Select Courier Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pathao Courier">Pathao Courier</SelectItem>
                          <SelectItem value="Steadfast Courier">Steadfast Courier</SelectItem>
                          <SelectItem value="RedX Logistics">RedX Logistics</SelectItem>
                          <SelectItem value="Paperfly">Paperfly</SelectItem>
                          <SelectItem value="Sundarban Courier">Sundarban Courier</SelectItem>
                          <SelectItem value="eCourier">eCourier</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="tracking-no" className="text-xs">Consignment / Tracking Number</Label>
                      <div className="flex gap-2">
                        <Input
                          id="tracking-no"
                          placeholder="e.g. PTH-98402910"
                          value={trackingInput}
                          onChange={(e) => setTrackingInput(e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveCourierTracking}
                          disabled={savingCourier}
                          className="h-9 px-3"
                        >
                          {savingCourier ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>

                  {linkedConsignment && (
                    <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-purple-900 dark:text-purple-200">Linked Consignment Status: </span>
                        <span className="capitalize font-bold text-purple-700 dark:text-purple-300">{linkedConsignment.status}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Courier: {linkedConsignment.courier || courierInput || "Assigned"}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Timeline Audit Component */}
              {selectedOrder && (
                <OrderTimelineAudit
                  orderId={selectedOrder.id}
                  orderNumber={selectedOrder.order_number}
                  currentStatus={selectedOrder.status}
                />
              )}

              {/* Customer Info */}
              {customerInfo && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {customerInfo.full_name || "No name"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {customerInfo.email}
                    </div>
                    {customerInfo.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {customerInfo.phone}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Addresses */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm whitespace-pre-line">
                    {formatAddress(selectedOrder?.shipping_address)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Billing Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm whitespace-pre-line">
                    {formatAddress(selectedOrder?.billing_address || selectedOrder?.shipping_address)}
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order Items ({orderItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderItems.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No items found</p>
                    ) : (
                      orderItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-4 p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {item.product_image ? (
                              <img 
                                src={item.product_image} 
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground line-clamp-1">{item.product_name}</p>
                            {item.product_category && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                {item.product_category}
                              </Badge>
                            )}
                            {item.variant_name && (
                              <p className="text-xs text-muted-foreground mt-1">Variant: {item.variant_name}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-sm">
                              <span className="text-muted-foreground">৳{item.price.toFixed(0)}</span>
                              <span className="text-muted-foreground">×</span>
                              <span className="font-medium">{item.quantity}</span>
                            </div>
                          </div>
                          
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-primary">৳{item.total.toFixed(0)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Order Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>৳{selectedOrder?.subtotal.toFixed(0)}</span>
                    </div>
                    {(selectedOrder?.shipping_cost ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>৳{selectedOrder?.shipping_cost?.toFixed(0)}</span>
                      </div>
                    )}
                    {(selectedOrder?.tax_amount ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span>৳{selectedOrder?.tax_amount?.toFixed(0)}</span>
                      </div>
                    )}
                    {(selectedOrder?.discount_amount ?? 0) > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Discount</span>
                        <span>-৳{selectedOrder?.discount_amount?.toFixed(0)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg pt-2">
                      <span>Total</span>
                      <span className="text-primary">৳{selectedOrder?.total.toFixed(0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedOrder?.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Order Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">{selectedOrder.notes}</CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Printable Modals */}
      {selectedOrder && (
        <>
          <PrintableInvoiceModal
            open={invoiceModalOpen}
            onOpenChange={setInvoiceModalOpen}
            order={selectedOrder}
            orderItems={orderItems}
            customerInfo={customerInfo}
          />

          <PrintablePackingSlipModal
            open={packingSlipOpen}
            onOpenChange={setPackingSlipOpen}
            order={selectedOrder}
            orderItems={orderItems}
          />

          <PrintableShippingLabelModal
            open={shippingLabelOpen}
            onOpenChange={setShippingLabelOpen}
            order={selectedOrder}
            courierName={courierInput || selectedOrder.courier_name}
            trackingNumber={trackingInput || selectedOrder.tracking_number}
          />
        </>
      )}
    </AdminLayout>
  );
}

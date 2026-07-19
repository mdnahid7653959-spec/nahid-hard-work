import { useEffect, useState } from "react";
import { Eye, MoreHorizontal, Package, Truck, MapPin, User, Phone, Mail, RefreshCw, Calendar, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}

interface CustomerInfo {
  email: string;
  full_name: string | null;
  phone: string | null;
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

  // Order Details Dialog
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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
        console.error("Fetch orders error:", error || data?.error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load orders" });
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
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("[Admin] Orders changed:", payload.eventType);
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

  const updateStatus = async (id: string, status: string) => {
    if (!admin?.id) return;
    
    const { data, error } = await supabase.functions.invoke("admin-orders", {
      body: { action: "update-status", adminId: admin.id, orderId: id, data: { status } }
    });

    if (error || data?.error) {
      toast({ variant: "destructive", title: "Error", description: data?.error || error?.message });
    } else {
      toast({ title: "Order status updated", description: `Order status changed to ${status}` });
      fetchOrders();
      invalidateOrders();
    }
  };

  const updatePaymentStatus = async (id: string, payment_status: string) => {
    if (!admin?.id) return;
    
    const { data, error } = await supabase.functions.invoke("admin-orders", {
      body: { action: "update-payment", adminId: admin.id, orderId: id, data: { payment_status } }
    });

    if (error || data?.error) {
      toast({ variant: "destructive", title: "Error", description: data?.error || error?.message });
    } else {
      toast({ title: "Payment status updated" });
      fetchOrders();
    }
  };

  const viewOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
    setLoadingDetails(true);

    try {
      if (!admin?.id) return;
      
      const { data, error } = await supabase.functions.invoke("admin-orders", {
        body: { action: "get", adminId: admin.id, orderId: order.id }
      });

      if (!error && data?.order) {
        const fetchedOrder = data.order;
        
        // Set order items with product details
        const items = fetchedOrder.order_items || [];
        const itemsWithDetails = await Promise.all(
          items.map(async (item: any) => {
            let product_image = null;
            let product_category = null;

            if (item.product_id) {
              // These are public tables, so anon key works
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

        // Set customer info
        if (fetchedOrder.customer) {
          setCustomerInfo(fetchedOrder.customer);
        }
      }
    } catch (err) {
      console.error("Error fetching order details:", err);
    }

    setLoadingDetails(false);
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase());
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
            <h1 className="text-2xl font-bold text-foreground">Orders</h1>
            <p className="text-muted-foreground">Manage customer orders and fulfillment</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Sync
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
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
              placeholder="Search by order number..."
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
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
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
                        <p className="font-medium">#{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(order.created_at).toLocaleDateString('bn-BD')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(v) => updateStatus(order.id, v)}
                      >
                        <SelectTrigger className="w-32 h-8 p-0 border-0 bg-transparent">
                          <Badge className={statusColors[order.status]}>{order.status}</Badge>
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
                            View Details
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

      {/* Order Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order #{selectedOrder?.order_number}
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
              {/* Status Row */}
              <div className="flex flex-wrap gap-2">
                <Badge className={statusColors[selectedOrder?.status || "pending"]}>
                  {selectedOrder?.status}
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
                  <CardContent className="text-sm">
                    {formatAddress(selectedOrder?.billing_address)}
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
                          {/* Product Image */}
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
                          
                          {/* Product Info */}
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
                          
                          {/* Total */}
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
                  <CardTitle className="text-sm">Order Summary</CardTitle>
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
    </AdminLayout>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  Store,
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  RefreshCw,
  Star,
  Package,
  ShoppingCart,
  DollarSign,
  ExternalLink,
} from "lucide-react";

type SellerStatus = "pending" | "approved" | "rejected" | "suspended" | "banned";

interface Seller {
  id: string;
  user_id: string;
  shop_name: string;
  shop_slug: string;
  shop_logo: string | null;
  business_name: string | null;
  business_type: string | null;
  contact_phone: string;
  contact_email: string;
  status: SellerStatus;
  rejection_reason: string | null;
  warning_count: number;
  rating_average: number;
  rating_count: number;
  total_products: number;
  total_orders: number;
  total_sales: number;
  commission_rate: number | null;
  is_featured: boolean;
  created_at: string;
  nid_front_image: string | null;
  nid_back_image: string | null;
  nid_number: string | null;
  id_document_type: string | null;
  birth_certificate_number: string | null;
  birth_certificate_image: string | null;
  trade_license_number: string | null;
  trade_license_image: string | null;
  warehouse_address: any;
  bank_name: string | null;
  bank_account_number: string | null;
  mobile_banking_provider: string | null;
  mobile_banking_number: string | null;
}

const statusConfig: Record<SellerStatus, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-600", icon: AlertTriangle },
  approved: { label: "Approved", color: "bg-green-500/10 text-green-600", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-600", icon: XCircle },
  suspended: { label: "Suspended", color: "bg-orange-500/10 text-orange-600", icon: AlertTriangle },
  banned: { label: "Banned", color: "bg-red-500/10 text-red-600", icon: Ban },
};

export default function AdminSellers() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "suspend" | "ban" | "unsuspend">("approve");
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSellers = useCallback(async () => {
    try {
      // Get admin session token from localStorage (must match AdminAuthContext key)
      const adminSession = localStorage.getItem("megamart_admin_session");
      const sessionToken = adminSession ? JSON.parse(adminSession).token : null;

      if (!sessionToken) {
        console.error("No admin session token found");
        setLoading(false);
        return;
      }

      // Use edge function to bypass RLS
      const { data, error } = await supabase.functions.invoke("admin-sellers", {
        body: { action: "list", sessionToken },
      });

      if (error) throw error;
      
      if (data?.success) {
        setSellers(data.sellers || []);
      } else {
        throw new Error(data?.error || "Failed to fetch sellers");
      }
    } catch (error) {
      console.error("Error fetching sellers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  const sendNotificationEmail = async (type: string, email: string, details: any) => {
    try {
      await supabase.functions.invoke("send-notification-email", {
        body: {
          type,
          recipientEmail: email,
          recipientName: details.recipientName,
          details,
        },
      });
    } catch (error) {
      console.error("Failed to send notification email:", error);
    }
  };

  const handleAction = async () => {
    if (!selectedSeller || !admin) return;

    setActionLoading(true);

    try {
      // Get admin session token (must match AdminAuthContext key)
      const adminSession = localStorage.getItem("megamart_admin_session");
      const sessionToken = adminSession ? JSON.parse(adminSession).token : null;

      if (!sessionToken) {
        throw new Error("No admin session found");
      }

      let emailType: string = "";
      
      switch (actionType) {
        case "approve":
          emailType = "seller_approved";
          break;
        case "reject":
          emailType = "seller_rejected";
          break;
        case "suspend":
          emailType = "seller_suspended";
          break;
        case "ban":
          emailType = "seller_suspended";
          break;
        case "unsuspend":
          emailType = "seller_approved";
          break;
        default:
          return;
      }

      // Use edge function to update seller status (bypasses RLS)
      const { data, error } = await supabase.functions.invoke("admin-sellers", {
        body: {
          action: actionType,
          sellerId: selectedSeller.id,
          reason: actionReason,
          adminId: admin.id,
          sessionToken,
        },
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || "Failed to update seller");
      }

      // Send notification email
      sendNotificationEmail(emailType, selectedSeller.contact_email, {
        shopName: selectedSeller.shop_name,
        reason: actionReason,
      });

      toast({
        title: "Success",
        description: `Seller ${actionType === "approve" ? "approved" : actionType === "reject" ? "rejected" : actionType === "suspend" ? "suspended" : actionType === "ban" ? "banned" : "unsuspended"} successfully`,
      });

      setActionDialogOpen(false);
      setActionReason("");
      fetchSellers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update seller status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openActionDialog = (seller: Seller, type: typeof actionType) => {
    setSelectedSeller(seller);
    setActionType(type);
    setActionReason("");
    setActionDialogOpen(true);
  };

  const filteredSellers = sellers.filter((seller) => {
    const matchesSearch =
      seller.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.contact_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.contact_phone.includes(searchQuery);

    const matchesStatus = statusFilter === "all" || seller.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: sellers.length,
    pending: sellers.filter((s) => s.status === "pending").length,
    approved: sellers.filter((s) => s.status === "approved").length,
    suspended: sellers.filter((s) => s.status === "suspended" || s.status === "banned").length,
  };

  if (loading) {
    return (
      <AdminLayout title="Seller Management">
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Seller Management">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Sellers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-500/10">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending Approval</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Active Sellers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-500/10">
                  <Ban className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.suspended}</p>
                  <p className="text-xs text-muted-foreground">Suspended/Banned</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>All Sellers</CardTitle>
                <CardDescription>Manage seller applications and accounts</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sellers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={fetchSellers}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSellers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No sellers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSellers.map((seller) => {
                    const status = statusConfig[seller.status];
                    const StatusIcon = status.icon;

                    return (
                      <TableRow key={seller.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {seller.shop_logo ? (
                              <img
                                src={seller.shop_logo}
                                alt={seller.shop_name}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                <Store className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{seller.shop_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {seller.business_type || "Individual"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{seller.contact_email}</p>
                          <p className="text-xs text-muted-foreground">{seller.contact_phone}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{seller.total_products}</TableCell>
                        <TableCell>{seller.total_orders}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span>{seller.rating_average.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">
                              ({seller.rating_count})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(seller.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSeller(seller);
                                  setViewDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {seller.status === "pending" && (
                                <>
                                  <DropdownMenuItem onClick={() => openActionDialog(seller, "approve")}>
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openActionDialog(seller, "reject")}>
                                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {seller.status === "approved" && (
                                <>
                                  <DropdownMenuItem onClick={() => openActionDialog(seller, "suspend")}>
                                    <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                                    Suspend
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openActionDialog(seller, "ban")}>
                                    <Ban className="h-4 w-4 mr-2 text-red-600" />
                                    Ban
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(seller.status === "suspended" || seller.status === "rejected") && (
                                <DropdownMenuItem onClick={() => openActionDialog(seller, "unsuspend")}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Reactivate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Seller Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Seller Details</DialogTitle>
              <DialogDescription>
                View complete seller profile and documents
              </DialogDescription>
            </DialogHeader>

            {selectedSeller && (
              <div className="space-y-6">
                {/* Shop Info */}
                <div className="flex items-start gap-4">
                  {selectedSeller.shop_logo ? (
                    <img
                      src={selectedSeller.shop_logo}
                      alt={selectedSeller.shop_name}
                      className="h-20 w-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center">
                      <Store className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{selectedSeller.shop_name}</h3>
                    <p className="text-muted-foreground">
                      {selectedSeller.business_name || "Individual Seller"}
                    </p>
                    <Badge className={statusConfig[selectedSeller.status].color}>
                      {statusConfig[selectedSeller.status].label}
                    </Badge>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Package className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{selectedSeller.total_products}</p>
                    <p className="text-xs text-muted-foreground">Products</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <ShoppingCart className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">{selectedSeller.total_orders}</p>
                    <p className="text-xs text-muted-foreground">Orders</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-lg font-bold">৳{selectedSeller.total_sales?.toLocaleString() || 0}</p>
                    <p className="text-xs text-muted-foreground">Sales</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Star className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                    <p className="text-lg font-bold">{selectedSeller.rating_average.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <p className="text-sm bg-muted p-2 rounded">{selectedSeller.contact_email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <p className="text-sm bg-muted p-2 rounded">{selectedSeller.contact_phone}</p>
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-4">
                  <Label className="block">Identity Documents</Label>

                  {/* Identity numbers */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Document Type</p>
                      <p className="text-sm bg-muted p-2 rounded capitalize">
                        {selectedSeller.id_document_type?.replace("_", " ") || "Not specified"}
                      </p>
                    </div>
                    {selectedSeller.id_document_type === "birth_certificate" ? (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Birth Certificate Number</p>
                        <p className="text-sm bg-muted p-2 rounded">
                          {selectedSeller.birth_certificate_number || "Not provided"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">NID Number</p>
                        <p className="text-sm bg-muted p-2 rounded">
                          {selectedSeller.nid_number || "Not provided"}
                        </p>
                      </div>
                    )}
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-xs text-muted-foreground">Trade License Number</p>
                      <p className="text-sm bg-muted p-2 rounded">
                        {selectedSeller.trade_license_number || "Not provided (optional for individual sellers)"}
                      </p>
                    </div>
                  </div>

                  {/* Document images */}
                  {(selectedSeller.nid_front_image ||
                    selectedSeller.nid_back_image ||
                    selectedSeller.birth_certificate_image ||
                    selectedSeller.trade_license_image) ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { url: selectedSeller.nid_front_image, label: "NID Front" },
                        { url: selectedSeller.nid_back_image, label: "NID Back" },
                        { url: selectedSeller.birth_certificate_image, label: "Birth Certificate" },
                        { url: selectedSeller.trade_license_image, label: "Trade License" },
                      ]
                        .filter((d) => d.url)
                        .map((d) => (
                          <a
                            key={d.label}
                            href={d.url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <div className="border rounded-lg p-2 hover:bg-muted transition-colors">
                              <img
                                src={d.url as string}
                                alt={d.label}
                                className="w-full h-28 object-cover rounded"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                                }}
                              />
                              <p className="text-xs text-center mt-2">{d.label}</p>
                            </div>
                          </a>
                        ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground bg-muted/50 border border-dashed rounded-lg p-4 text-center">
                      No document images uploaded by this seller.
                    </div>
                  )}
                </div>


                {/* Payment Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Account</Label>
                    <div className="text-sm bg-muted p-3 rounded space-y-1">
                      <p>{selectedSeller.bank_name || "Not provided"}</p>
                      <p className="text-muted-foreground">
                        {selectedSeller.bank_account_number || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile Banking</Label>
                    <div className="text-sm bg-muted p-3 rounded space-y-1">
                      <p className="capitalize">{selectedSeller.mobile_banking_provider || "Not provided"}</p>
                      <p className="text-muted-foreground">
                        {selectedSeller.mobile_banking_number || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason */}
                {selectedSeller.rejection_reason && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                    <Label className="text-red-700 dark:text-red-400">Rejection/Suspension Reason</Label>
                    <p className="text-sm mt-2">{selectedSeller.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Action Dialog */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" && "Approve Seller"}
                {actionType === "reject" && "Reject Application"}
                {actionType === "suspend" && "Suspend Seller"}
                {actionType === "ban" && "Ban Seller"}
                {actionType === "unsuspend" && "Reactivate Seller"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve" && "This will allow the seller to start listing products."}
                {actionType === "reject" && "Please provide a reason for rejection."}
                {actionType === "suspend" && "This will temporarily disable the seller's account."}
                {actionType === "ban" && "This will permanently disable the seller's account."}
                {actionType === "unsuspend" && "This will reactivate the seller's account."}
              </DialogDescription>
            </DialogHeader>

            {(actionType === "reject" || actionType === "suspend" || actionType === "ban") && (
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter the reason..."
                  rows={3}
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={actionLoading || ((actionType === "reject" || actionType === "suspend" || actionType === "ban") && !actionReason)}
                variant={actionType === "approve" || actionType === "unsuspend" ? "default" : "destructive"}
              >
                {actionLoading ? "Processing..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

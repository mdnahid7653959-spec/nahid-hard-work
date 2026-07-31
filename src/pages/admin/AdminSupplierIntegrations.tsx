import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { encryptCredentials, decryptCredentials } from "@/lib/crypto";
import { 
  Globe, Settings, Percent, DollarSign, Activity, 
  CheckCircle2, XCircle, AlertCircle, Trash2, Edit, 
  Plus, RefreshCw, Play, Link2, ShieldCheck, HelpCircle,
  TrendingUp, Clock, AlertTriangle, ArrowRight
} from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { adminDb } from "@/lib/adminDb";

interface SupplierIntegration {
  id: string;
  name: string;
  company_name: string;
  api_base_url: string;
  api_version: string;
  auth_type: 'apikey' | 'bearer' | 'oauth2' | 'basic';
  credentials_encrypted: string;
  endpoints_config: any;
  pricing_rules: any;
  sync_interval: string;
  is_active: boolean;
  webhook_url: string;
  created_at?: string;
  updated_at?: string;
}

interface SyncLog {
  id: string;
  supplier_id: string;
  action_type: 'connection_test' | 'product_sync' | 'order_forward' | 'webhook';
  status: 'success' | 'failed';
  response_time_ms: number;
  message: string;
  error_details: any;
  created_at: string;
}

export default function AdminSupplierIntegrations() {
  const { toast } = useToast();
  const { admin } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierIntegration[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [mappingsCount, setMappingsCount] = useState<Record<string, number>>({});
  
  // Form State
  const [editingSupplier, setEditingSupplier] = useState<Partial<SupplierIntegration> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [credsInput, setCredsInput] = useState<any>({});
  const [endpointsInput, setEndpointsInput] = useState<any>({});
  const [pricingInput, setPricingInput] = useState<any>({
    markup_type: 'percentage',
    markup_value: 0,
    commission_margin: 0,
    min_profit: 0,
    max_profit: 999999,
    conversion_rate: 1,
    auto_round: false,
    round_to: 99
  });

  // Action status loader states
  const [pinging, setPinging] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all integrations
      const { data: supplierData } = await adminDb.select<SupplierIntegration>("supplier_integrations", {
        orderBy: { col: "created_at", ascending: false }
      });
      setSuppliers(supplierData || []);

      // Fetch recent logs
      const { data: logData } = await adminDb.select<SyncLog>("supplier_sync_logs", {
        limit: 50,
        orderBy: { col: "created_at", ascending: false }
      });
      setLogs(logData || []);

      // Fetch mapping counts for each supplier
      const { data: mappings } = await adminDb.select<any>("supplier_product_mappings", {
        columns: "supplier_id"
      });
      
      const counts: Record<string, number> = {};
      mappings?.forEach((m: any) => {
        counts[m.supplier_id] = (counts[m.supplier_id] || 0) + 1;
      });
      setMappingsCount(counts);

    } catch (error: any) {
      toast({
        title: "Error fetching supplier data",
        description: error.message || "Failed to query database",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleEdit = (supplier: SupplierIntegration) => {
    setEditingSupplier(supplier);
    setCredsInput(decryptCredentials(supplier.credentials_encrypted) || {});
    setEndpointsInput(supplier.endpoints_config || {});
    setPricingInput(supplier.pricing_rules || {});
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingSupplier({
      name: "",
      company_name: "",
      api_base_url: "",
      api_version: "v1",
      auth_type: "apikey",
      sync_interval: "1h",
      is_active: true,
      webhook_url: ""
    });
    setCredsInput({});
    setEndpointsInput({
      connection_test: "/ping",
      product_list: "/products",
      response_root_path: "products",
      sku_path: "sku",
      name_path: "name",
      price_path: "price",
      stock_path: "stock",
      description_path: "description",
      image_path: "image",
      weight_path: "weight",
      dimensions_path: "dimensions",
      create_order: "/orders",
      order_id_path: "order_id"
    });
    setPricingInput({
      markup_type: 'percentage',
      markup_value: 15,
      commission_margin: 5,
      min_profit: 50,
      max_profit: 1000,
      conversion_rate: 1,
      auto_round: true,
      round_to: 99
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !admin) return;

    try {
      const encryptedCreds = encryptCredentials(credsInput);
      const payload: any = {
        name: editingSupplier.name,
        company_name: editingSupplier.company_name,
        api_base_url: editingSupplier.api_base_url,
        api_version: editingSupplier.api_version,
        auth_type: editingSupplier.auth_type,
        credentials_encrypted: encryptedCreds,
        endpoints_config: endpointsInput,
        pricing_rules: pricingInput,
        sync_interval: editingSupplier.sync_interval,
        is_active: editingSupplier.is_active,
        webhook_url: editingSupplier.webhook_url,
        updated_at: new Date().toISOString()
      };

      if (editingSupplier.id) {
        // Update existing
        const { error } = await adminDb.update("supplier_integrations", payload, { id: editingSupplier.id });
        if (error) throw error;
        toast({ title: "Supplier integration updated successfully" });
      } else {
        // Insert new
        const { error } = await adminDb.insert("supplier_integrations", {
          ...payload,
          created_at: new Date().toISOString()
        });
        if (error) throw error;
        toast({ title: "Supplier integration added successfully" });
      }

      setIsFormOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Failed to update database",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier integration? All product mappings and logs will be deleted.")) return;

    try {
      const { error } = await adminDb.remove("supplier_integrations", { id });
      if (error) throw error;
      toast({ title: "Integration deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Real connection test via Deno Edge function proxy
  const handleTestConnection = async (supplierId: string) => {
    setPinging(prev => ({ ...prev, [supplierId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("supplier-api", {
        body: {
          action: "test-connection",
          supplierId
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || "Connection refused or auth failed");
      }

      toast({
        title: "Connection test passed!",
        description: `Ping response returned HTTP ${data.status} in ${data.responseTimeMs}ms.`
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Connection test failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setPinging(prev => ({ ...prev, [supplierId]: false }));
    }
  };

  // Real sync products via Deno Edge function proxy
  const handleSyncProducts = async (supplierId: string) => {
    setSyncing(prev => ({ ...prev, [supplierId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("supplier-api", {
        body: {
          action: "sync-products",
          supplierId
        }
      });

      if (error) throw new Error(error.message || "Sync failed");

      toast({
        title: "Sync completed successfully!",
        description: `Synced: ${data.syncedCount} products. Skipped/Invalidated: ${data.skippedCount || 0}.`
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Synchronization failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSyncing(prev => ({ ...prev, [supplierId]: false }));
    }
  };

  const getSuccessRate = () => {
    if (logs.length === 0) return 100;
    const successLogs = logs.filter(l => l.status === "success").length;
    return Math.round((successLogs / logs.length) * 100);
  };

  const getAverageResponseTime = () => {
    if (logs.length === 0) return 0;
    const total = logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0);
    return Math.round(total / logs.length);
  };

  return (
    <AdminLayout title="Supplier API Integrations">
      <div className="flex flex-col gap-6 p-6">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Connected Suppliers</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{suppliers.length}</div>
              <p className="text-xs text-muted-foreground">
                {suppliers.filter(s => s.is_active).length} Active integrations
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Sync Mappings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(mappingsCount).reduce((a, b) => a + b, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Products linked to suppliers</p>
            </CardContent>
          </Card>
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">API Success Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getSuccessRate()}%</div>
              <p className="text-xs text-muted-foreground">Based on last 50 transactions</p>
            </CardContent>
          </Card>
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Average Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getAverageResponseTime()} ms</div>
              <p className="text-xs text-muted-foreground">API latency proxy speed</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Workspace */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle>Supplier Integrations Manager</CardTitle>
              <CardDescription>Configure external API credentials, endpoint payload maps, and pricing rules.</CardDescription>
            </div>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" /> Add New Supplier
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            
            <Tabs defaultValue="suppliers" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="suppliers" className="gap-2"><Globe className="h-4 w-4" /> Connected Accounts</TabsTrigger>
                <TabsTrigger value="pricing" className="gap-2"><Percent className="h-4 w-4" /> Pricing Engine Rules</TabsTrigger>
                <TabsTrigger value="logs" className="gap-2"><Activity className="h-4 w-4" /> Sync Logs & Errors</TabsTrigger>
              </TabsList>

              {/* 1. Suppliers Tab */}
              <TabsContent value="suppliers" className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading suppliers integrations...</div>
                ) : suppliers.length === 0 ? (
                  <div className="text-center py-12 border rounded-lg border-dashed">
                    <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <h3 className="font-semibold text-lg">No Suppliers Connected</h3>
                    <p className="text-sm text-muted-foreground mb-4">You can configure any custom supplier API below.</p>
                    <Button onClick={handleAddNew}>Add First Supplier</Button>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Supplier Info</TableHead>
                          <TableHead>Authentication</TableHead>
                          <TableHead>Sync Interval</TableHead>
                          <TableHead>Linked Products</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suppliers.map(s => (
                          <TableRow key={s.id}>
                            <TableCell>
                              <div className="font-medium text-foreground">{s.name}</div>
                              <div className="text-xs text-muted-foreground">{s.api_base_url}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{s.auth_type}</Badge>
                            </TableCell>
                            <TableCell>{s.sync_interval}</TableCell>
                            <TableCell>{mappingsCount[s.id] || 0} products</TableCell>
                            <TableCell>
                              <Badge variant={s.is_active ? "default" : "secondary"}>
                                {s.is_active ? "Active" : "Disabled"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleTestConnection(s.id)} disabled={pinging[s.id]} className="gap-1">
                                {pinging[s.id] ? <RefreshCw className="h-3. w-3 animate-spin" /> : <Play className="h-3 w-3" />} Test Ping
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleSyncProducts(s.id)} disabled={syncing[s.id]} className="gap-1">
                                {syncing[s.id] ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Sync Products
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* 2. Pricing Tab */}
              <TabsContent value="pricing" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {suppliers.map(s => (
                    <Card key={s.id} className="border shadow-none">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Percent className="h-4 w-4 text-primary" /> {s.name} Rules
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Markup Type</Label>
                            <div className="font-semibold capitalize">{s.pricing_rules?.markup_type || "Percentage"}</div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Markup Value</Label>
                            <div className="font-semibold">{s.pricing_rules?.markup_value || 0}%</div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Commission Margin</Label>
                            <div className="font-semibold">{s.pricing_rules?.commission_margin || 0}%</div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Currency Conversion Rate</Label>
                            <div className="font-semibold">1 USD = {s.pricing_rules?.conversion_rate || 1} BDT</div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Auto-Rounding</Label>
                            <div className="font-semibold">{s.pricing_rules?.auto_round ? `Round to .${s.pricing_rules?.round_to}` : "Disabled"}</div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Profit Boundary</Label>
                            <div className="font-semibold">৳{s.pricing_rules?.min_profit || 0} - ৳{s.pricing_rules?.max_profit || "Unlimited"}</div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(s)} className="w-full mt-2">
                          <Settings className="h-3 w-3 mr-1" /> Edit Rules
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* 3. Sync Logs Tab */}
              <TabsContent value="logs" className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Latency</TableHead>
                        <TableHead>Log Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No sync history logs found.</TableCell>
                        </TableRow>
                      ) : (
                        logs.map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(l.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{l.action_type.replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className={`flex items-center gap-1 text-sm font-medium ${l.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {l.status === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                {l.status}
                              </span>
                            </TableCell>
                            <TableCell>{l.response_time_ms} ms</TableCell>
                            <TableCell className="max-w-md truncate text-xs text-foreground font-mono">
                              {l.message}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>

        {/* Configurations Forms Modal/Panel */}
        {isFormOpen && editingSupplier && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-border/80 shadow-2xl">
              <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{editingSupplier.id ? "Edit Supplier Configuration" : "New Supplier Connection"}</CardTitle>
                  <CardDescription>Setup secure endpoints and pricing logic for automated synchronization.</CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setIsFormOpen(false)}>✕</Button>
              </CardHeader>
              <form onSubmit={handleSave}>
                <CardContent className="space-y-6 pt-6">
                  
                  {/* General Configs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="s_name">Supplier Display Name *</Label>
                      <Input 
                        id="s_name" 
                        required 
                        value={editingSupplier.name || ""} 
                        onChange={e => setEditingSupplier(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s_company">Company / Legal Name</Label>
                      <Input 
                        id="s_company" 
                        value={editingSupplier.company_name || ""} 
                        onChange={e => setEditingSupplier(prev => ({ ...prev, company_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s_base">API Base URL *</Label>
                      <Input 
                        id="s_base" 
                        required 
                        placeholder="https://api.supplier.com" 
                        value={editingSupplier.api_base_url || ""} 
                        onChange={e => setEditingSupplier(prev => ({ ...prev, api_base_url: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s_version">API Version</Label>
                      <Input 
                        id="s_version" 
                        placeholder="v1" 
                        value={editingSupplier.api_version || ""} 
                        onChange={e => setEditingSupplier(prev => ({ ...prev, api_version: e.target.value }))}
                      />
                    </div>
                  </div>

                  <hr />

                  {/* Auth Configuration */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Credentials & Authentication</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="s_auth">Auth Type</Label>
                        <Select 
                          value={editingSupplier.auth_type} 
                          onValueChange={(val: any) => setEditingSupplier(prev => ({ ...prev, auth_type: val }))}
                        >
                          <SelectTrigger id="s_auth">
                            <SelectValue placeholder="Select auth method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apikey">API Key / Header</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="oauth2">OAuth 2.0 Flow</SelectItem>
                            <SelectItem value="basic">Basic Username/Password</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {editingSupplier.auth_type === 'apikey' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="apikey_val">API Key Value</Label>
                            <Input 
                              id="apikey_val" 
                              type="password"
                              placeholder="••••••••••••••••"
                              value={credsInput.api_key || ""} 
                              onChange={e => setCredsInput((prev: any) => ({ ...prev, api_key: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="apikey_header">Custom Header Name (Optional)</Label>
                            <Input 
                              id="apikey_header" 
                              placeholder="X-API-KEY"
                              value={credsInput.api_key_header || ""} 
                              onChange={e => setCredsInput((prev: any) => ({ ...prev, api_key_header: e.target.value }))}
                            />
                          </div>
                        </>
                      )}

                      {editingSupplier.auth_type === 'bearer' && (
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="bearer_token">Bearer Access Token</Label>
                          <Input 
                            id="bearer_token" 
                            type="password"
                            placeholder="eyJhbGciOi..."
                            value={credsInput.access_token || ""} 
                            onChange={e => setCredsInput((prev: any) => ({ ...prev, access_token: e.target.value }))}
                          />
                        </div>
                      )}

                      {editingSupplier.auth_type === 'basic' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="basic_user">Username</Label>
                            <Input 
                              id="basic_user" 
                              value={credsInput.username || ""} 
                              onChange={e => setCredsInput((prev: any) => ({ ...prev, username: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="basic_pass">Password</Label>
                            <Input 
                              id="basic_pass" 
                              type="password"
                              value={credsInput.password || ""} 
                              onChange={e => setCredsInput((prev: any) => ({ ...prev, password: e.target.value }))}
                            />
                          </div>
                        </>
                      )}

                      {editingSupplier.auth_type === 'oauth2' && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="oauth_cid">Client ID</Label>
                            <Input 
                              id="oauth_cid" 
                              value={credsInput.client_id || ""} 
                              onChange={e => setCredsInput((prev: any) => ({ ...prev, client_id: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="oauth_sec">Client Secret</Label>
                            <Input 
                              id="oauth_sec" 
                              type="password"
                              value={credsInput.client_secret || ""} 
                              onChange={e => setCredsInput((prev: any) => ({ ...prev, client_secret: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="oauth_ref">Refresh Token</Label>
                            <Input 
                              id="oauth_ref" 
                              type="password"
                              value={credsInput.refresh_token || ""} 
                              onChange={e => setCredsInput((prev: any) => ({ ...prev, refresh_token: e.target.value }))}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <hr />

                  {/* Endpoints & JSON Mappings */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Endpoint Payload Mappings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ep_ping">Ping Connection Check Endpoint</Label>
                        <Input 
                          id="ep_ping" 
                          placeholder="/ping" 
                          value={endpointsInput.connection_test || ""} 
                          onChange={e => setEndpointsInput((prev: any) => ({ ...prev, connection_test: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ep_list">Product Catalog Endpoint</Label>
                        <Input 
                          id="ep_list" 
                          placeholder="/products" 
                          value={endpointsInput.product_list || ""} 
                          onChange={e => setEndpointsInput((prev: any) => ({ ...prev, product_list: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ep_root">Response JSON Root Path</Label>
                        <Input 
                          id="ep_root" 
                          placeholder="data.products" 
                          value={endpointsInput.response_root_path || ""} 
                          onChange={e => setEndpointsInput((prev: any) => ({ ...prev, response_root_path: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ep_sku">SKU Path Mapping</Label>
                        <Input 
                          id="ep_sku" 
                          placeholder="variants[0].sku" 
                          value={endpointsInput.sku_path || ""} 
                          onChange={e => setEndpointsInput((prev: any) => ({ ...prev, sku_path: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ep_name">Name Path Mapping</Label>
                        <Input 
                          id="ep_name" 
                          placeholder="title" 
                          value={endpointsInput.name_path || ""} 
                          onChange={e => setEndpointsInput((prev: any) => ({ ...prev, name_path: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ep_price">Price Path Mapping</Label>
                        <Input 
                          id="ep_price" 
                          placeholder="variants[0].price" 
                          value={endpointsInput.price_path || ""} 
                          onChange={e => setEndpointsInput((prev: any) => ({ ...prev, price_path: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ep_stock">Stock Path Mapping</Label>
                        <Input 
                          id="ep_stock" 
                          placeholder="variants[0].inventory_quantity" 
                          value={endpointsInput.stock_path || ""} 
                          onChange={e => setEndpointsInput((prev: any) => ({ ...prev, stock_path: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ep_img">Primary Image Path Mapping</Label>
                        <Input 
                          id="ep_img" 
                          placeholder="images[0].src" 
                          value={endpointsInput.image_path || ""} 
                          onChange={e => setEndpointsInput((prev: any) => ({ ...prev, image_path: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <hr />

                  {/* Pricing Engine Configs */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /> Advanced Profit Margin & Pricing Calculator</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pr_type">Profit Markup Type</Label>
                        <Select 
                          value={pricingInput.markup_type} 
                          onValueChange={(val: any) => setPricingInput((prev: any) => ({ ...prev, markup_type: val }))}
                        >
                          <SelectTrigger id="pr_type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage Margin (%)</SelectItem>
                            <SelectItem value="fixed">Fixed BDT markup</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pr_val">Profit Markup Value</Label>
                        <Input 
                          id="pr_val" 
                          type="number"
                          value={pricingInput.markup_value || 0} 
                          onChange={e => setPricingInput((prev: any) => ({ ...prev, markup_value: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pr_comm">Commission Margin (%)</Label>
                        <Input 
                          id="pr_comm" 
                          type="number"
                          value={pricingInput.commission_margin || 0} 
                          onChange={e => setPricingInput((prev: any) => ({ ...prev, commission_margin: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pr_conv">Exchange Rate (USD to BDT)</Label>
                        <Input 
                          id="pr_conv" 
                          type="number"
                          value={pricingInput.conversion_rate || 1} 
                          onChange={e => setPricingInput((prev: any) => ({ ...prev, conversion_rate: parseFloat(e.target.value) || 1 }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pr_min">Minimum Profit Cap (BDT)</Label>
                        <Input 
                          id="pr_min" 
                          type="number"
                          value={pricingInput.min_profit || 0} 
                          onChange={e => setPricingInput((prev: any) => ({ ...prev, min_profit: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pr_max">Maximum Profit Cap (BDT)</Label>
                        <Input 
                          id="pr_max" 
                          type="number"
                          value={pricingInput.max_profit || 999999} 
                          onChange={e => setPricingInput((prev: any) => ({ ...prev, max_profit: parseFloat(e.target.value) || 999999 }))}
                        />
                      </div>

                      <div className="flex items-center space-x-2 pt-6">
                        <Switch 
                          id="pr_round" 
                          checked={pricingInput.auto_round || false}
                          onCheckedChange={(checked: boolean) => setPricingInput((prev: any) => ({ ...prev, auto_round: checked }))}
                        />
                        <Label htmlFor="pr_round">Auto Round selling prices</Label>
                      </div>

                      {pricingInput.auto_round && (
                        <div className="space-y-2">
                          <Label htmlFor="pr_round_to">Round Last Digits to</Label>
                          <Input 
                            id="pr_round_to" 
                            type="number"
                            placeholder="99"
                            value={pricingInput.round_to || 99} 
                            onChange={e => setPricingInput((prev: any) => ({ ...prev, round_to: parseInt(e.target.value, 10) || 99 }))}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <hr />

                  {/* Sync intervals & Webhooks */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="s_interval">Auto Sync Schedule</Label>
                      <Select 
                        value={editingSupplier.sync_interval} 
                        onValueChange={(val: any) => setEditingSupplier(prev => ({ ...prev, sync_interval: val }))}
                      >
                        <SelectTrigger id="s_interval">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5m">Every 5 Minutes</SelectItem>
                          <SelectItem value="15m">Every 15 Minutes</SelectItem>
                          <SelectItem value="30m">Every 30 Minutes</SelectItem>
                          <SelectItem value="1h">Every 1 Hour</SelectItem>
                          <SelectItem value="6h">Every 6 Hours</SelectItem>
                          <SelectItem value="12h">Every 12 Hours</SelectItem>
                          <SelectItem value="24h">Every 24 Hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="s_webhook">Webhook Update URL</Label>
                      <Input 
                        id="s_webhook" 
                        placeholder="https://durtup.shop/api/webhook" 
                        value={editingSupplier.webhook_url || ""} 
                        onChange={e => setEditingSupplier(prev => ({ ...prev, webhook_url: e.target.value }))}
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <Switch 
                        id="s_active" 
                        checked={editingSupplier.is_active || false}
                        onCheckedChange={(checked: boolean) => setEditingSupplier(prev => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="s_active">Enable Auto Sync & API requests</Label>
                    </div>
                  </div>

                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between">
                  <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                  <Button type="submit" className="gap-2">
                    <ShieldCheck className="h-4 w-4" /> Save Configuration
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

// Inline card footer since we import it
function CardFooter({ children, className, ...props }: any) {
  return (
    <div className={`p-6 flex items-center ${className || ""}`} {...props}>
      {children}
    </div>
  );
}

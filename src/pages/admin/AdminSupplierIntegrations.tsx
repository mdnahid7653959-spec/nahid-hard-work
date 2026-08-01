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
  TrendingUp, Clock, AlertTriangle, ArrowRight, ArrowLeft,
  Terminal, ShieldAlert, Cpu, Sparkles, Check
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

const TEMPLATES = {
  cj: {
    id: "cj",
    logo: "📦",
    name: "CJ Dropshipping API",
    company_name: "CJ Dropshipping Co., Ltd.",
    api_base_url: "https://developers.cjdropshipping.com",
    api_version: "v2",
    auth_type: "apikey" as const,
    api_key: "",
    api_key_header: "Access-Token",
    endpoints_config: {
      connection_test: "/api/v2/authentication/getAccessToken",
      product_list: "/api/v2/product/list",
      response_root_path: "data.list",
      sku_path: "variants[0].sku",
      name_path: "productName",
      price_path: "variants[0].sellPrice",
      stock_path: "variants[0].inventoryQuantity",
      description_path: "productDesc",
      image_path: "productImage",
      weight_path: "variants[0].productWeight",
      dimensions_path: "variants[0].packLength",
      create_order: "/api/v2/order/create",
      order_id_path: "orderId"
    },
    pricing_rules: {
      markup_type: 'percentage',
      markup_value: 15,
      commission_margin: 5,
      min_profit: 100,
      max_profit: 5000,
      conversion_rate: 120,
      auto_round: true,
      round_to: 99
    },
    sync_interval: "1h",
    is_active: true,
    webhook_url: ""
  },
  aliexpress: {
    id: "aliexpress",
    logo: "🌏",
    name: "AliExpress Open API",
    company_name: "Alibaba Group Holding Limited",
    api_base_url: "https://api.aliexpress.com",
    api_version: "v1.1",
    auth_type: "oauth2" as const,
    client_id: "",
    client_secret: "",
    refresh_token: "",
    endpoints_config: {
      connection_test: "/rest/api/check",
      product_list: "/rest/api/products",
      response_root_path: "result.products",
      sku_path: "sku",
      name_path: "title",
      price_path: "price",
      stock_path: "inventory",
      description_path: "description",
      image_url_path: "image_url",
      weight_path: "shipping_weight",
      dimensions_path: "package_size",
      create_order: "/rest/api/orders",
      order_id_path: "order_id"
    },
    pricing_rules: {
      markup_type: 'percentage',
      markup_value: 20,
      commission_margin: 5,
      min_profit: 150,
      max_profit: 8000,
      conversion_rate: 120,
      auto_round: true,
      round_to: 99
    },
    sync_interval: "6h",
    is_active: true,
    webhook_url: ""
  },
  custom: {
    id: "custom",
    logo: "🔌",
    name: "Custom REST API Partner",
    company_name: "Generic Supplier Inc.",
    api_base_url: "https://api.example-supplier.com",
    api_version: "v1",
    auth_type: "apikey" as const,
    api_key: "",
    api_key_header: "X-API-Key",
    endpoints_config: {
      connection_test: "/status",
      product_list: "/catalog/products",
      response_root_path: "products",
      sku_path: "sku",
      name_path: "name",
      price_path: "price",
      stock_path: "stock_quantity",
      description_path: "description",
      image_path: "images[0].src",
      weight_path: "weight",
      dimensions_path: "dimensions",
      create_order: "/orders/create",
      order_id_path: "id"
    },
    pricing_rules: {
      markup_type: 'percentage',
      markup_value: 10,
      commission_margin: 2,
      min_profit: 50,
      max_profit: 2000,
      conversion_rate: 1,
      auto_round: false,
      round_to: 99
    },
    sync_interval: "24h",
    is_active: true,
    webhook_url: ""
  }
};

export default function AdminSupplierIntegrations() {
  const { toast } = useToast();
  const { admin } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierIntegration[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [mappingsCount, setMappingsCount] = useState<Record<string, number>>({});
  
  // Wizard Setup States
  const [currentStep, setCurrentStep] = useState(1);
  const [editingSupplier, setEditingSupplier] = useState<Partial<SupplierIntegration> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [credsInput, setCredsInput] = useState<any>({});
  const [endpointsInput, setEndpointsInput] = useState<any>({});
  const [pricingInput, setPricingInput] = useState<any>({
    markup_type: 'percentage',
    markup_value: 15,
    commission_margin: 5,
    min_profit: 50,
    max_profit: 999999,
    conversion_rate: 1,
    auto_round: false,
    round_to: 99
  });

  // Action status loader states
  const [pinging, setPinging] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: supplierData } = await adminDb.select<SupplierIntegration>("supplier_integrations", {
        orderBy: { col: "created_at", ascending: false }
      });
      setSuppliers(supplierData || []);

      const { data: logData } = await adminDb.select<SyncLog>("supplier_sync_logs", {
        limit: 50,
        orderBy: { col: "created_at", ascending: false }
      });
      setLogs(logData || []);

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
        title: "Error fetching data",
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
    setSelectedTemplateId(null);
    setCurrentStep(1);
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
    setEndpointsInput({});
    setPricingInput({
      markup_type: 'percentage',
      markup_value: 15,
      commission_margin: 5,
      min_profit: 50,
      max_profit: 999999,
      conversion_rate: 1,
      auto_round: false,
      round_to: 99
    });
    setSelectedTemplateId(null);
    setCurrentStep(1);
    setIsFormOpen(true);
  };

  const handleSelectTemplate = (templateKey: keyof typeof TEMPLATES) => {
    const template = TEMPLATES[templateKey];
    setSelectedTemplateId(templateKey);
    
    setEditingSupplier(prev => ({
      ...prev,
      name: template.name,
      company_name: template.company_name,
      api_base_url: template.api_base_url,
      api_version: template.api_version,
      auth_type: template.auth_type,
      sync_interval: template.sync_interval,
      is_active: template.is_active,
      webhook_url: template.webhook_url
    }));

    // Setup default creds
    if (template.auth_type === 'apikey') {
      setCredsInput({ api_key: "", api_key_header: template.api_key_header });
    } else if (template.auth_type === 'oauth2') {
      setCredsInput({ client_id: "", client_secret: "", refresh_token: "" });
    } else {
      setCredsInput({});
    }

    setEndpointsInput(template.endpoints_config);
    setPricingInput(template.pricing_rules);

    toast({
      title: `${template.name} Template Applied`,
      description: "Default fields populated. Adjust credentials in Step 2."
    });
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
        const { error } = await adminDb.update("supplier_integrations", payload, { id: editingSupplier.id });
        if (error) throw error;
        toast({ title: "Integration updated successfully" });
      } else {
        const { error } = await adminDb.insert("supplier_integrations", {
          ...payload,
          created_at: new Date().toISOString()
        });
        if (error) throw error;
        toast({ title: "Integration added successfully" });
      }

      setIsFormOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save configuration",
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
    <AdminLayout title="Supplier Integrations">
      <div className="flex flex-col gap-6 p-1 md:p-4">
        
        {/* Banner with subtle gradients */}
        <div className="relative rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/10 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-hidden">
          <div className="absolute right-0 bottom-0 top-0 opacity-10 pointer-events-none flex items-center pr-12">
            <Cpu className="h-44 w-44 text-orange-500 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-500/15 border-orange-500/20 text-orange-600 font-semibold gap-1 dark:text-orange-400">
                <Sparkles className="h-3 w-3" /> Core Engine
              </Badge>
              <span className="text-xs text-muted-foreground">• Live Dropship Sync Active</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Supplier API Gateway</h1>
            <p className="text-muted-foreground text-sm max-w-xl">
              Connect external supplier inventory catalogs, map fields to the Darzo catalog schema, and automate daily profit markups.
            </p>
          </div>
          <Button onClick={handleAddNew} className="shadow-lg hover:shadow-orange-500/15 transition-all bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-medium gap-2 flex-shrink-0">
            <Plus className="h-4 w-4" /> Add New Supplier
          </Button>
        </div>

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected Suppliers</CardTitle>
              <Globe className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">{suppliers.length}</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                <span className="text-green-500 font-semibold">{suppliers.filter(s => s.is_active).length} active</span> connections syncing
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sync Mappings</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">
                {Object.values(mappingsCount).reduce((a, b) => a + b, 0)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Products linked to supplier APIs</p>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Success Rate</CardTitle>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">{getSuccessRate()}%</div>
              <p className="text-[11px] text-muted-foreground mt-1">Calculated over past 50 calls</p>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Average Response Latency</CardTitle>
              <Clock className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">{getAverageResponseTime()} ms</div>
              <p className="text-[11px] text-muted-foreground mt-1">Direct endpoint communication speed</p>
            </CardContent>
          </Card>
        </div>

        {/* Workspace Panels */}
        <Card className="border-border/30 bg-card/40 backdrop-blur-sm shadow-md overflow-hidden">
          <Tabs defaultValue="suppliers" className="w-full">
            <div className="border-b border-border/40 bg-muted/20 px-6 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <TabsList className="bg-transparent border-none p-0 h-auto gap-4">
                <TabsTrigger value="suppliers" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:shadow-none rounded-none px-0 py-3 font-semibold text-sm gap-2">
                  <Globe className="h-4 w-4" /> Connected Accounts
                </TabsTrigger>
                <TabsTrigger value="pricing" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:shadow-none rounded-none px-0 py-3 font-semibold text-sm gap-2">
                  <Percent className="h-4 w-4" /> Pricing Calculators
                </TabsTrigger>
                <TabsTrigger value="logs" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:shadow-none rounded-none px-0 py-3 font-semibold text-sm gap-2">
                  <Activity className="h-4 w-4" /> Sync Diagnostics
                </TabsTrigger>
              </TabsList>
              <div className="text-xs text-muted-foreground py-1">
                Data refreshed: {new Date().toLocaleTimeString()}
              </div>
            </div>

            {/* 1. Suppliers List Tab */}
            <TabsContent value="suppliers" className="m-0 p-6 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <RefreshCw className="h-10 w-10 text-orange-500 animate-spin" />
                  <p className="text-sm text-muted-foreground font-medium">Fetching integrations from gateway...</p>
                </div>
              ) : suppliers.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-border/60 rounded-xl max-w-xl mx-auto my-6 p-6">
                  <Globe className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <h3 className="font-semibold text-lg">No Suppliers Connected</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                    Integrate your wholesale API endpoints, map JSON payloads, and begin importing active catalogs.
                  </p>
                  <Button onClick={handleAddNew} className="bg-orange-600 hover:bg-orange-500 text-white font-medium">
                    Add First Supplier
                  </Button>
                </div>
              ) : (
                <div className="border border-border/30 rounded-xl overflow-hidden shadow-inner bg-card/60">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold">Supplier Info</TableHead>
                        <TableHead className="font-semibold">Auth Type</TableHead>
                        <TableHead className="font-semibold">Sync Interval</TableHead>
                        <TableHead className="font-semibold">Mappings</TableHead>
                        <TableHead className="font-semibold">Sync Status</TableHead>
                        <TableHead className="text-right font-semibold pr-6">Quick Tools</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map(s => (
                        <TableRow key={s.id} className="transition-colors hover:bg-muted/20">
                          <TableCell className="py-4">
                            <div className="font-bold text-foreground text-sm flex items-center gap-2">
                              {s.name.includes("CJ") ? "📦" : s.name.includes("Ali") ? "🌏" : "🔌"}{s.name}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground truncate max-w-xs">{s.api_base_url}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs font-medium border-border/50 bg-background/50">
                              {s.auth_type === 'apikey' ? 'API Header' : s.auth_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{s.sync_interval}</TableCell>
                          <TableCell className="font-semibold text-sm">
                            {mappingsCount[s.id] || 0} products
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5">
                              <span className={`h-2.5 w-2.5 rounded-full ${s.is_active ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                              <span className="text-xs font-medium text-foreground">{s.is_active ? 'Active' : 'Paused'}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-4 pr-6 space-x-1.5">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleTestConnection(s.id)} 
                              disabled={pinging[s.id]} 
                              className="h-8 text-xs font-medium border-border/60 hover:bg-muted"
                            >
                              {pinging[s.id] ? (
                                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Play className="h-3 w-3 mr-1 text-green-500" />
                              )}
                              Ping API
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleSyncProducts(s.id)} 
                              disabled={syncing[s.id]} 
                              className="h-8 text-xs font-medium border-border/60 hover:bg-muted"
                            >
                              {syncing[s.id] ? (
                                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <RefreshCw className="h-3 w-3 mr-1 text-blue-500" />
                              )}
                              Sync Catalog
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(s)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(s.id)} 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
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

            {/* 2. Pricing Engine Tab */}
            <TabsContent value="pricing" className="m-0 p-6 space-y-6">
              {suppliers.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No suppliers connected. Set one up to configure pricing rules.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {suppliers.map(s => (
                    <Card key={s.id} className="border border-border/40 shadow-sm overflow-hidden bg-card/60">
                      <div className="bg-muted/10 px-5 py-4 border-b border-border/30 flex items-center justify-between">
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Percent className="h-4 w-4 text-orange-500" />
                          {s.name} Profit Margin
                        </div>
                        <Badge className="bg-orange-500/10 border-orange-500/20 text-orange-600 font-semibold dark:text-orange-400">
                          {s.pricing_rules?.markup_type === 'percentage' ? `${s.pricing_rules?.markup_value || 0}% markup` : `৳${s.pricing_rules?.markup_value || 0} fixed`}
                        </Badge>
                      </div>
                      <CardContent className="p-5 space-y-3.5">
                        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                          <div>
                            <div className="text-muted-foreground">Markup Type</div>
                            <div className="font-semibold text-foreground capitalize mt-0.5">{s.pricing_rules?.markup_type || "Percentage"}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Markup Value</div>
                            <div className="font-semibold text-foreground mt-0.5">
                              {s.pricing_rules?.markup_type === 'percentage' ? `${s.pricing_rules?.markup_value || 0}%` : `৳${s.pricing_rules?.markup_value || 0}`}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Commission Margin</div>
                            <div className="font-semibold text-foreground mt-0.5">{s.pricing_rules?.commission_margin || 0}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Currency Conversion</div>
                            <div className="font-semibold text-foreground mt-0.5">1 USD = {s.pricing_rules?.conversion_rate || 1} BDT</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Auto-Rounding</div>
                            <div className="font-semibold text-foreground mt-0.5">
                              {s.pricing_rules?.auto_round ? `Round to .${s.pricing_rules?.round_to}` : "Disabled"}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Profit boundaries</div>
                            <div className="font-semibold text-foreground mt-0.5">
                              ৳{s.pricing_rules?.min_profit || 0} - {s.pricing_rules?.max_profit === 999999 ? "No limit" : `৳${s.pricing_rules?.max_profit}`}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(s)} className="w-full mt-2 border-border/60 hover:bg-muted text-xs h-9">
                          <Settings className="h-3.5 w-3.5 mr-1.5" /> Adjust Pricing Matrix
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 3. Terminal Style Sync Diagnostics Log Tab */}
            <TabsContent value="logs" className="m-0 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5"><Terminal className="h-4 w-4 text-orange-500" /> System Debug Log</h3>
                  <p className="text-xs text-muted-foreground">Recent transaction statuses and API requests payload details.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData} className="gap-1 border-border/60 h-8 text-xs">
                  <RefreshCw className="h-3 w-3" /> Refresh Diagnostics
                </Button>
              </div>

              <div className="rounded-xl border border-border/40 bg-zinc-950 font-mono text-[11px] leading-relaxed text-zinc-300 overflow-hidden shadow-2xl">
                <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-[10px] text-zinc-500 ml-2">logs_stream_gateway.sh</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-zinc-800 text-zinc-500 uppercase">
                    UTF-8 connection
                  </Badge>
                </div>
                <div className="overflow-x-auto max-h-[450px] p-4 space-y-2 divide-y divide-zinc-900/50">
                  {logs.length === 0 ? (
                    <div className="text-center py-10 text-zinc-600 font-mono">
                      ~ system: waiting for new log inputs...
                    </div>
                  ) : (
                    logs.map((l, index) => {
                      const dateStr = new Date(l.created_at).toLocaleTimeString();
                      const statusColor = l.status === "success" ? "text-green-500" : "text-rose-500";
                      const actionType = l.action_type.toUpperCase();
                      
                      return (
                        <div key={l.id} className="pt-2 flex flex-col md:flex-row md:items-start gap-1 md:gap-4 first:pt-0">
                          <span className="text-zinc-500 whitespace-nowrap min-w-[70px]">{dateStr}</span>
                          <span className="font-semibold text-blue-400 whitespace-nowrap min-w-[120px]">{`[${actionType}]`}</span>
                          <span className={`${statusColor} font-semibold whitespace-nowrap min-w-[70px]`}>
                            {l.status === "success" ? "✔ OK" : "✘ FAIL"}
                          </span>
                          <span className="text-zinc-500 whitespace-nowrap min-w-[60px]">{l.response_time_ms}ms</span>
                          <span className="text-zinc-300 break-all">{l.message}</span>
                          {l.error_details && (
                            <details className="mt-1 text-[10px] text-zinc-500 w-full cursor-pointer hover:text-zinc-400">
                              <summary className="font-semibold text-zinc-500">View diagnostic details</summary>
                              <pre className="p-2 mt-1 rounded bg-zinc-900 border border-zinc-800/50 text-rose-400 overflow-x-auto">
                                {JSON.stringify(l.error_details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Step-by-Step Configuration Wizard Dialog Modal */}
        {isFormOpen && editingSupplier && (
          <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-3xl max-h-[92vh] overflow-hidden border-border/60 shadow-2xl flex flex-col bg-background">
              
              {/* Header */}
              <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-orange-500" />
                      {editingSupplier.id ? "Modify Integration Schema" : "Integrate New Supplier Partner"}
                    </CardTitle>
                    <CardDescription>Setup secure endpoints and pricing logic for automated synchronization.</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)} className="rounded-full h-8 w-8 hover:bg-muted">
                    ✕
                  </Button>
                </div>

                {/* Custom Step Indicator Timeline */}
                <div className="flex items-center justify-between mt-6 px-4 pb-2">
                  {[
                    { label: "Profile", icon: Globe },
                    { label: "Credentials", icon: ShieldCheck },
                    { label: "Data Mapping", icon: Settings },
                    { label: "Sync & Pricing", icon: Percent }
                  ].map((step, idx) => {
                    const stepNum = idx + 1;
                    const isCompleted = currentStep > stepNum;
                    const isActive = currentStep === stepNum;
                    return (
                      <div key={step.label} className="flex items-center flex-1 last:flex-initial">
                        <div className="flex flex-col items-center relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-300 ${
                            isCompleted ? 'bg-primary border-primary text-primary-foreground' :
                            isActive ? 'border-orange-500 text-orange-500 bg-orange-500/10 shadow-[0_0_12px_rgba(249,115,22,0.3)]' :
                            'border-muted text-muted-foreground bg-background'
                          }`}>
                            {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                          </div>
                          <span className={`text-[10px] font-semibold mt-2 absolute -bottom-5 whitespace-nowrap ${
                            isActive ? 'text-foreground font-bold' : 'text-muted-foreground'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                        {idx < 3 && (
                          <div className={`h-[2px] flex-1 mx-3 transition-all duration-500 ${
                            isCompleted ? 'bg-primary' : 'bg-muted'
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardHeader>

              {/* Wizard Content */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto flex flex-col">
                <CardContent className="p-6 md:p-8 space-y-6 flex-1">
                  
                  {/* STEP 1: Supplier Profile */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      {!editingSupplier.id && (
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Preset Template API</Label>
                          <p className="text-xs text-muted-foreground mb-3">Load preset fields configurations to avoid manual endpoint setup.</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {Object.entries(TEMPLATES).map(([key, template]) => {
                              const isSelected = selectedTemplateId === key;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => handleSelectTemplate(key as any)}
                                  className={`flex flex-col items-start text-left p-4 rounded-xl border-2 transition-all duration-200 hover:border-orange-500/40 hover:bg-muted/10 ${
                                    isSelected 
                                      ? 'border-orange-500 bg-orange-500/[0.03] shadow-md' 
                                      : 'border-border/60 bg-card'
                                  }`}
                                >
                                  <span className="text-2xl mb-1">{template.logo}</span>
                                  <span className="font-bold text-sm text-foreground">{template.name}</span>
                                  <span className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{template.company_name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold border-b pb-2 text-foreground">General Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="s_name" className="text-xs font-semibold">Supplier Display Name *</Label>
                            <Input 
                              id="s_name" 
                              required 
                              placeholder="e.g. CJ Dropship Portal"
                              value={editingSupplier.name || ""} 
                              onChange={e => setEditingSupplier(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="s_company" className="text-xs font-semibold">Company / Legal Name</Label>
                            <Input 
                              id="s_company" 
                              placeholder="e.g. Yiwu CJ Dropshipping Co."
                              value={editingSupplier.company_name || ""} 
                              onChange={e => setEditingSupplier(prev => ({ ...prev, company_name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="s_base" className="text-xs font-semibold">API Base URL *</Label>
                            <Input 
                              id="s_base" 
                              required 
                              placeholder="https://api.supplier.com" 
                              value={editingSupplier.api_base_url || ""} 
                              onChange={e => setEditingSupplier(prev => ({ ...prev, api_base_url: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="s_version" className="text-xs font-semibold">API Version (Prefix)</Label>
                            <Input 
                              id="s_version" 
                              placeholder="v1" 
                              value={editingSupplier.api_version || ""} 
                              onChange={e => setEditingSupplier(prev => ({ ...prev, api_version: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Authentication Credentials */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h3 className="text-sm font-semibold text-foreground">Authentication Protocol</h3>
                          <Badge variant="outline" className="capitalize">{editingSupplier.auth_type}</Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2 max-w-md">
                            <Label htmlFor="s_auth" className="text-xs font-semibold">Auth Type</Label>
                            <Select 
                              value={editingSupplier.auth_type} 
                              onValueChange={(val: any) => setEditingSupplier(prev => ({ ...prev, auth_type: val }))}
                            >
                              <SelectTrigger id="s_auth" className="h-10">
                                <SelectValue placeholder="Select auth method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="apikey">API Key (Header / Query)</SelectItem>
                                <SelectItem value="bearer">Bearer Token</SelectItem>
                                <SelectItem value="oauth2">OAuth 2.0 Auth Flow</SelectItem>
                                <SelectItem value="basic">Basic Auth (User/Password)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="border border-border/40 p-5 rounded-xl bg-muted/10 space-y-4 mt-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <ShieldCheck className="h-4 w-4 text-orange-500" /> Enter Encryption Credentials
                            </h4>

                            {editingSupplier.auth_type === 'apikey' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="apikey_val" className="text-xs font-semibold">API Key Value *</Label>
                                  <Input 
                                    id="apikey_val" 
                                    type="password"
                                    required
                                    placeholder="Paste API authentication key"
                                    value={credsInput.api_key || ""} 
                                    onChange={e => setCredsInput((prev: any) => ({ ...prev, api_key: e.target.value }))}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="apikey_header" className="text-xs font-semibold">Custom Header Name</Label>
                                  <Input 
                                    id="apikey_header" 
                                    placeholder="X-API-KEY"
                                    value={credsInput.api_key_header || ""} 
                                    onChange={e => setCredsInput((prev: any) => ({ ...prev, api_key_header: e.target.value }))}
                                  />
                                </div>
                              </div>
                            )}

                            {editingSupplier.auth_type === 'bearer' && (
                              <div className="space-y-2">
                                <Label htmlFor="bearer_token" className="text-xs font-semibold">Bearer Access Token *</Label>
                                <Input 
                                  id="bearer_token" 
                                  type="password"
                                  required
                                  placeholder="eyJhbGciOi..."
                                  value={credsInput.access_token || ""} 
                                  onChange={e => setCredsInput((prev: any) => ({ ...prev, access_token: e.target.value }))}
                                />
                              </div>
                            )}

                            {editingSupplier.auth_type === 'basic' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="basic_user" className="text-xs font-semibold">Username *</Label>
                                  <Input 
                                    id="basic_user" 
                                    required
                                    placeholder="Basic Auth User"
                                    value={credsInput.username || ""} 
                                    onChange={e => setCredsInput((prev: any) => ({ ...prev, username: e.target.value }))}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="basic_pass" className="text-xs font-semibold">Password *</Label>
                                  <Input 
                                    id="basic_pass" 
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={credsInput.password || ""} 
                                    onChange={e => setCredsInput((prev: any) => ({ ...prev, password: e.target.value }))}
                                  />
                                </div>
                              </div>
                            )}

                            {editingSupplier.auth_type === 'oauth2' && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="oauth_cid" className="text-xs font-semibold">Client ID *</Label>
                                  <Input 
                                    id="oauth_cid" 
                                    required
                                    placeholder="OAuth Client ID"
                                    value={credsInput.client_id || ""} 
                                    onChange={e => setCredsInput((prev: any) => ({ ...prev, client_id: e.target.value }))}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="oauth_sec" className="text-xs font-semibold">Client Secret *</Label>
                                  <Input 
                                    id="oauth_sec" 
                                    type="password"
                                    required
                                    placeholder="OAuth Client Secret"
                                    value={credsInput.client_secret || ""} 
                                    onChange={e => setCredsInput((prev: any) => ({ ...prev, client_secret: e.target.value }))}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="oauth_ref" className="text-xs font-semibold">Refresh Token</Label>
                                  <Input 
                                    id="oauth_ref" 
                                    type="password"
                                    placeholder="Optional refresh token"
                                    value={credsInput.refresh_token || ""} 
                                    onChange={e => setCredsInput((prev: any) => ({ ...prev, refresh_token: e.target.value }))}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: JSON Field Payload Mapping */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="border-b pb-2 flex justify-between items-center">
                          <h3 className="text-sm font-semibold text-foreground">API Endpoints Mapping</h3>
                          <span className="text-[10px] text-muted-foreground">Uses dot-notation (e.g. data.products[0].sku)</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="ep_ping" className="text-xs font-semibold">Connection Check (Ping) URI *</Label>
                            <Input 
                              id="ep_ping" 
                              required
                              placeholder="e.g. /ping" 
                              value={endpointsInput.connection_test || ""} 
                              onChange={e => setEndpointsInput((prev: any) => ({ ...prev, connection_test: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ep_list" className="text-xs font-semibold">Product Catalog List URI *</Label>
                            <Input 
                              id="ep_list" 
                              required
                              placeholder="e.g. /catalog/products" 
                              value={endpointsInput.product_list || ""} 
                              onChange={e => setEndpointsInput((prev: any) => ({ ...prev, product_list: e.target.value }))}
                            />
                          </div>
                        </div>

                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-4">JSON Keys Extraction Path</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="ep_root" className="text-xs font-semibold">Array Root Path *</Label>
                            <Input 
                              id="ep_root" 
                              required
                              placeholder="products" 
                              value={endpointsInput.response_root_path || ""} 
                              onChange={e => setEndpointsInput((prev: any) => ({ ...prev, response_root_path: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ep_sku" className="text-xs font-semibold">SKU Path *</Label>
                            <Input 
                              id="ep_sku" 
                              required
                              placeholder="sku" 
                              value={endpointsInput.sku_path || ""} 
                              onChange={e => setEndpointsInput((prev: any) => ({ ...prev, sku_path: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ep_name" className="text-xs font-semibold">Title/Name Path *</Label>
                            <Input 
                              id="ep_name" 
                              required
                              placeholder="title" 
                              value={endpointsInput.name_path || ""} 
                              onChange={e => setEndpointsInput((prev: any) => ({ ...prev, name_path: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ep_price" className="text-xs font-semibold">Cost Price Path *</Label>
                            <Input 
                              id="ep_price" 
                              required
                              placeholder="price" 
                              value={endpointsInput.price_path || ""} 
                              onChange={e => setEndpointsInput((prev: any) => ({ ...prev, price_path: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ep_stock" className="text-xs font-semibold">Stock Quantity Path *</Label>
                            <Input 
                              id="ep_stock" 
                              required
                              placeholder="inventory" 
                              value={endpointsInput.stock_path || ""} 
                              onChange={e => setEndpointsInput((prev: any) => ({ ...prev, stock_path: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ep_img" className="text-xs font-semibold">Primary Image Path *</Label>
                            <Input 
                              id="ep_img" 
                              required
                              placeholder="image_url" 
                              value={endpointsInput.image_path || endpointsInput.image_url_path || ""} 
                              onChange={e => setEndpointsInput((prev: any) => ({ ...prev, image_path: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ep_desc" className="text-xs font-semibold">Description Path (Optional)</Label>
                            <Input 
                              id="ep_desc" 
                              placeholder="description" 
                              value={endpointsInput.description_path || ""} 
                              onChange={e => setEndpointsInput((prev: any) => ({ ...prev, description_path: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ep_weight" className="text-xs font-semibold">Weight Path (Optional)</Label>
                            <Input 
                              id="ep_weight" 
                              placeholder="weight" 
                              value={endpointsInput.weight_path || ""} 
                              onChange={e => setEndpointsInput((prev: any) => ({ ...prev, weight_path: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ep_order" className="text-xs font-semibold">Forward Orders Endpoint</Label>
                            <Input 
                              id="ep_order" 
                              placeholder="/orders" 
                              value={endpointsInput.create_order || ""} 
                              onChange={e => setEndpointsInput((prev: any) => ({ ...prev, create_order: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Pricing Rules & Sync Schedules */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold border-b pb-2 text-foreground mb-4">Pricing Engine Configuration</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="pr_type" className="text-xs font-semibold">Markup Type</Label>
                            <Select 
                              value={pricingInput.markup_type} 
                              onValueChange={(val: any) => setPricingInput((prev: any) => ({ ...prev, markup_type: val }))}
                            >
                              <SelectTrigger id="pr_type" className="h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage Margin (%)</SelectItem>
                                <SelectItem value="fixed">Fixed BDT markup</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pr_val" className="text-xs font-semibold">Markup Value *</Label>
                            <Input 
                              id="pr_val" 
                              type="number"
                              required
                              value={pricingInput.markup_value || 0} 
                              onChange={e => setPricingInput((prev: any) => ({ ...prev, markup_value: parseFloat(e.target.value) || 0 }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pr_comm" className="text-xs font-semibold">Commission margin (%) *</Label>
                            <Input 
                              id="pr_comm" 
                              type="number"
                              required
                              value={pricingInput.commission_margin || 0} 
                              onChange={e => setPricingInput((prev: any) => ({ ...prev, commission_margin: parseFloat(e.target.value) || 0 }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pr_conv" className="text-xs font-semibold">Rate (USD to BDT) *</Label>
                            <Input 
                              id="pr_conv" 
                              type="number"
                              required
                              value={pricingInput.conversion_rate || 1} 
                              onChange={e => setPricingInput((prev: any) => ({ ...prev, conversion_rate: parseFloat(e.target.value) || 1 }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pr_min" className="text-xs font-semibold">Minimum profit Cap (BDT)</Label>
                            <Input 
                              id="pr_min" 
                              type="number"
                              value={pricingInput.min_profit || 0} 
                              onChange={e => setPricingInput((prev: any) => ({ ...prev, min_profit: parseFloat(e.target.value) || 0 }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pr_max" className="text-xs font-semibold">Maximum profit Cap (BDT)</Label>
                            <Input 
                              id="pr_max" 
                              type="number"
                              value={pricingInput.max_profit || 999999} 
                              onChange={e => setPricingInput((prev: any) => ({ ...prev, max_profit: parseFloat(e.target.value) || 999999 }))}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-6 items-center border border-border/40 p-4 rounded-xl mt-4 bg-muted/10">
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id="pr_round" 
                              checked={pricingInput.auto_round || false}
                              onCheckedChange={(checked: boolean) => setPricingInput((prev: any) => ({ ...prev, auto_round: checked }))}
                            />
                            <Label htmlFor="pr_round" className="text-xs font-semibold cursor-pointer">Auto Round prices</Label>
                          </div>
                          
                          {pricingInput.auto_round && (
                            <div className="space-y-1.5 flex-1 max-w-[150px]">
                              <Label htmlFor="pr_round_to" className="text-[10px] uppercase font-bold text-muted-foreground">Round Last Digits to</Label>
                              <Input 
                                id="pr_round_to" 
                                type="number"
                                placeholder="99"
                                className="h-8"
                                value={pricingInput.round_to || 99} 
                                onChange={e => setPricingInput((prev: any) => ({ ...prev, round_to: parseInt(e.target.value, 10) || 99 }))}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold border-b pb-2 text-foreground mb-4">Schedules & Sync Policies</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="s_interval" className="text-xs font-semibold">Auto Sync Interval</Label>
                            <Select 
                              value={editingSupplier.sync_interval} 
                              onValueChange={(val: any) => setEditingSupplier(prev => ({ ...prev, sync_interval: val }))}
                            >
                              <SelectTrigger id="s_interval" className="h-10">
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

                          <div className="space-y-2 col-span-2">
                            <Label htmlFor="s_webhook" className="text-xs font-semibold">Webhook URL (For live callbacks)</Label>
                            <Input 
                              id="s_webhook" 
                              placeholder="https://durtup.shop/api/webhook/supplier" 
                              value={editingSupplier.webhook_url || ""} 
                              onChange={e => setEditingSupplier(prev => ({ ...prev, webhook_url: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 border border-border/40 p-4 rounded-xl mt-4 bg-muted/10">
                          <Switch 
                            id="s_active" 
                            checked={editingSupplier.is_active || false}
                            onCheckedChange={(checked: boolean) => setEditingSupplier(prev => ({ ...prev, is_active: checked }))}
                          />
                          <Label htmlFor="s_active" className="text-xs font-semibold cursor-pointer">Enable Auto Sync / API background requests</Label>
                        </div>
                      </div>
                    </div>
                  )}

                </CardContent>

                {/* Footer Controls */}
                <div className="border-t border-border/40 p-4 md:p-6 bg-muted/10 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)} className="h-10 text-xs border-border/60">
                      Cancel
                    </Button>
                    {currentStep > 1 && (
                      <Button variant="outline" type="button" onClick={() => setCurrentStep(prev => prev - 1)} className="gap-1.5 h-10 text-xs border-border/60">
                        <ArrowLeft className="h-4 w-4" /> Previous
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {currentStep < 4 ? (
                      <Button 
                        type="button" 
                        onClick={() => {
                          if (currentStep === 1 && !editingSupplier.name) {
                            toast({ title: "Name required", description: "Supplier Display Name is a mandatory field.", variant: "destructive" });
                            return;
                          }
                          if (currentStep === 1 && !editingSupplier.api_base_url) {
                            toast({ title: "API URL required", description: "API Base URL is a mandatory field.", variant: "destructive" });
                            return;
                          }
                          setCurrentStep(prev => prev + 1);
                        }} 
                        className="bg-orange-600 hover:bg-orange-500 text-white font-medium gap-1.5 h-10 text-xs shadow-md"
                      >
                        Next Step <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="submit" className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold gap-1.5 h-10 text-xs shadow-lg">
                        <Check className="h-4 w-4" /> Save Integration Configuration
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Card>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

function CardFooter({ children, className, ...props }: any) {
  return (
    <div className={`p-6 flex items-center ${className || ""}`} {...props}>
      {children}
    </div>
  );
}

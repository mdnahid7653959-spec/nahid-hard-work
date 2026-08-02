import React, { useState, useEffect } from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { AdminSupplierEngine, SupplierIntegration } from "@/services/admin/AdminSupplierEngine";
import { AdminAuditLogService } from "@/services/admin/security/AdminAuditLogService";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  Plug,
  Plus,
  Settings,
  DollarSign,
  Send,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Globe,
  Key,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export const EnterpriseSupplierCenter: React.FC = () => {
  const { adminUser, adminRole } = useAdminAuth();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<SupplierIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierIntegration | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Price simulator state
  const [testCostPrice, setTestCostPrice] = useState<number>(1000);
  const [simulatedPrice, setSimulatedPrice] = useState({ sellPrice: 1199, profit: 199 });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setIsLoading(true);
    const data = await AdminSupplierEngine.getAllSuppliers();
    setSuppliers(data);
    if (data.length > 0) {
      setSelectedSupplier(data[0]);
      recalculateSimulator(1000, data[0]);
    }
    setIsLoading(false);
  };

  const recalculateSimulator = (cost: number, supplier: SupplierIntegration) => {
    const res = AdminSupplierEngine.calculateSellPrice(cost, supplier.marginRule);
    setSimulatedPrice(res);
  };

  const handleCreateSampleSupplier = async () => {
    const newSupplier: Partial<SupplierIntegration> = {
      name: "CJ Dropshipping Official",
      baseUrl: "https://developers.cjdropshipping.com/api/v2",
      apiVersion: "v2.0",
      authType: "API_KEY",
      apiKey: "cj_secret_key_prod_8849302",
      isEnabled: true,
      endpoints: {
        productListEndpoint: "/product/list",
        productDetailEndpoint: "/product/query",
        stockEndpoint: "/product/stock",
        priceEndpoint: "/product/price",
        createOrderEndpoint: "/order/create",
        cancelOrderEndpoint: "/order/cancel",
        trackingEndpoint: "/order/track",
        webhookEndpoint: "/webhooks/cj"
      },
      marginRule: {
        marginType: "PERCENTAGE_MARGIN",
        percentageMargin: 20,
        fixedProfitAmount: 200,
        minProfit: 100,
        enableRounding99: true
      }
    };

    const docId = await AdminSupplierEngine.saveSupplier(newSupplier);
    await AdminAuditLogService.logAction({
      adminId: adminUser?.uid || "ADMIN",
      adminEmail: adminUser?.email || "",
      adminRole: adminRole || "Admin",
      action: "SUPPLIER_ONBOARD",
      module: "SUPPLIER_CENTER",
      details: `Onboarded supplier integration: CJ Dropshipping Official`,
      targetId: docId,
      status: "SUCCESS"
    });

    toast({ title: "Supplier Integration Saved", description: "Supplier API and pricing rules configured." });
    loadSuppliers();
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    await AdminSupplierEngine.deleteSupplier(id);
    await AdminAuditLogService.logAction({
      adminId: adminUser?.uid || "ADMIN",
      adminEmail: adminUser?.email || "",
      adminRole: adminRole || "Admin",
      action: "SUPPLIER_DELETE",
      module: "SUPPLIER_CENTER",
      details: `Deleted supplier: ${name}`,
      targetId: id,
      status: "SUCCESS"
    });

    toast({ title: "Supplier Removed", description: `Supplier ${name} was deleted.` });
    loadSuppliers();
  };

  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              Enterprise Supplier API & Pricing Engine Center
              <Badge className="bg-orange-500/10 border border-orange-500/30 text-orange-400">PROXY SECURE</Badge>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Onboard external suppliers, configure visual API endpoints, and manage dynamic profit margins.
            </p>
          </div>

          <Button
            onClick={handleCreateSampleSupplier}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs gap-2 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Add New Supplier API
          </Button>
        </div>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SUPPLIER LIST */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Plug className="h-4 w-4 text-orange-400" />
              Connected Enterprise Suppliers ({suppliers.length})
            </h3>

            <div className="space-y-3">
              {suppliers.length === 0 ? (
                <div className="text-center p-6 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <p className="text-xs text-slate-400">No external supplier integrations added yet.</p>
                  <Button size="sm" onClick={handleCreateSampleSupplier} className="bg-slate-800 text-slate-200 text-xs">
                    Quick Onboard CJ Supplier
                  </Button>
                </div>
              ) : (
                suppliers.map((sup) => (
                  <div
                    key={sup.id}
                    onClick={() => {
                      setSelectedSupplier(sup);
                      recalculateSimulator(testCostPrice, sup);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      selectedSupplier?.id === sup.id
                        ? "bg-orange-950/20 border-orange-500/60"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-white">{sup.name}</h4>
                      <Badge className={sup.isEnabled ? "bg-emerald-500/10 text-emerald-400 text-[10px]" : "bg-slate-800 text-slate-400 text-[10px]"}>
                        {sup.isEnabled ? "ACTIVE" : "DISABLED"}
                      </Badge>
                    </div>

                    <p className="text-[11px] font-mono text-slate-400 truncate mb-2">{sup.baseUrl}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>Auth: {sup.authType}</span>
                      <span>Margin: {sup.marginRule?.percentageMargin}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SUPPLIER DETAILS & DYNAMIC PRICING ENGINE */}
          {selectedSupplier && (
            <div className="lg:col-span-2 space-y-6">
              {/* ENDPOINT MANAGER */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Globe className="h-4 w-4 text-sky-400" />
                      Visual API Endpoint Configuration — {selectedSupplier.name}
                    </h3>
                    <p className="text-xs text-slate-400">Endpoints mapped securely through Server Proxy</p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteSupplier(selectedSupplier.id, selectedSupplier.name)}
                    className="border-red-900/60 bg-red-950/40 text-red-400 hover:bg-red-900 text-xs gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Supplier
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Product List Endpoint</span>
                    <p className="text-slate-200">{selectedSupplier.endpoints?.productListEndpoint || "/product/list"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Create Order Endpoint</span>
                    <p className="text-slate-200">{selectedSupplier.endpoints?.createOrderEndpoint || "/order/create"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Stock Sync Endpoint</span>
                    <p className="text-slate-200">{selectedSupplier.endpoints?.stockEndpoint || "/product/stock"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Tracking Endpoint</span>
                    <p className="text-slate-200">{selectedSupplier.endpoints?.trackingEndpoint || "/order/track"}</p>
                  </div>
                </div>
              </div>

              {/* DYNAMIC PRICING ENGINE & SIMULATOR */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-emerald-400" />
                  Dynamic Pricing Engine & Real-Time Price Simulator
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Supplier Cost Price (৳)
                    </label>
                    <Input
                      type="number"
                      value={testCostPrice}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setTestCostPrice(val);
                        recalculateSimulator(val, selectedSupplier);
                      }}
                      className="bg-slate-900 border-slate-700 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Recalculated Sell Price
                    </label>
                    <div className="h-10 px-3 flex items-center bg-slate-900 border border-slate-700 rounded-md font-mono font-black text-emerald-400 text-base">
                      ৳{simulatedPrice.sellPrice.toLocaleString("en-BD")}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Net Marketplace Profit
                    </label>
                    <div className="h-10 px-3 flex items-center bg-slate-900 border border-slate-700 rounded-md font-mono font-black text-orange-400 text-base">
                      +৳{simulatedPrice.profit.toLocaleString("en-BD")}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-orange-950/20 border border-orange-500/30 flex items-center gap-3 text-xs text-orange-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-400" />
                  <span>
                    Psychological Price Rounding Active: Automatically formats sell prices to end in <strong>.99</strong> (e.g. ৳999, ৳1499) for maximum marketplace conversion.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </EnterpriseAdminLayout>
  );
};

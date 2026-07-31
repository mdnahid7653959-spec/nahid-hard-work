import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { defaultTheme, ThemeConfig, applyThemeToDOM, themePresets } from "@/hooks/useThemeConfig";
import { defaultSections, SectionConfig } from "@/hooks/useLayoutConfig";
import { supabase } from "@/integrations/supabase/client";
import {
  Palette,
  Layout,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Clock,
  Trash2,
  Upload,
  Settings2,
  Smartphone,
  Tablet,
  Monitor,
  Sparkles,
  GripVertical,
  Plus,
  Copy,
  X,
  Image as ImageIcon,
  Type,
  Code,
  Video,
  PanelLeft,
  Pencil,
  Grid,
  History,
  CheckCircle,
  FileText,
  Sliders,
  AlignLeft,
  ChevronRight,
  ExternalLink,
  ChevronLeft,
  HelpCircle,
  FileCode,
  LayoutGrid,
  Layers,
  ZoomIn,
  ZoomOut,
  FolderOpen
} from "lucide-react";

// Predefined device sizes for center responsive canvas
const DEVICE_SIZES = [
  { key: "mobile", label: "Mobile", width: 375, icon: Smartphone },
  { key: "tablet", label: "Tablet", width: 768, icon: Tablet },
  { key: "laptop", label: "Laptop", width: 1024, icon: Monitor },
  { key: "desktop", label: "Desktop", width: 1440, icon: Monitor },
];

const PAGES_TEMPLATES = [
  { key: "homepage", label: "Homepage", icon: Layout },
  { key: "product_page", label: "Product Detail Page", icon: FileText },
  { key: "category_page", label: "Category Page", icon: Grid },
  { key: "cart_page", label: "Cart Page", icon: LayoutGrid },
  { key: "checkout_page", label: "Checkout Page", icon: CheckCircle },
  { key: "seller_store", label: "Seller Storefront", icon: Palette },
];

interface CustomBlock {
  id: string;
  title: string;
  type: string;
  config: any;
}

export default function AdminThemeBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Active builder configurations
  const [activePage, setActivePage] = useState("homepage");
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [customSectionsMap, setCustomSectionsMap] = useState<Record<string, CustomBlock>>({});
  
  // Custom headers/footers configurations
  const [headerConfig, setHeaderConfig] = useState<any>({
    logo_url: "",
    logo_text: "Durtup",
    show_search: true,
    show_categories_bar: true,
    top_bar: { visible: true, text: "Welcome to Durtup Store!" },
    nav_links: [{ label: "Home", href: "/" }]
  });
  const [footerConfig, setFooterConfig] = useState<any>({
    logo_url: "",
    brand_description: "Durtup is your premier destination for visual shopping.",
    copyright: "© 2026 Durtup. All rights reserved.",
    columns: [{ title: "Shop", links: [{ name: "All Products", href: "/products" }] }]
  });

  // UI state variables
  const [activeTab, setActiveTab] = useState("sections");
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "laptop" | "desktop">("desktop");
  const [zoomLevel, setZoomLevel] = useState(100); // Zoom in/out percentage
  const [isModified, setIsModified] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Snapshots & Assets
  const [versions, setVersions] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [uploadingAsset, setUploadingAsset] = useState(false);

  // Drag and drop ordering states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Load configuration from database on mount or page change
  const loadConfig = useCallback(async () => {
    try {
      // 1. Load Layout Config
      const { data: layoutData } = await supabase
        .from("layout_config")
        .select("*")
        .eq("page", activePage)
        .eq("is_active", true)
        .maybeSingle();

      if (layoutData?.sections && Array.isArray(layoutData.sections)) {
        setSections(layoutData.sections as SectionConfig[]);
      } else {
        setSections(defaultSections.map((s, idx) => ({ ...s, order: idx })));
      }

      // 2. Load Theme Config
      const { data: themeData } = await supabase
        .from("theme_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (themeData?.config) {
        setTheme({ ...defaultTheme, ...(themeData.config as Partial<ThemeConfig>) });
      }

      // 3. Load Custom Blocks
      const { data: customData } = await supabase
        .from("custom_sections")
        .select("*")
        .eq("is_active", true);

      if (customData) {
        const mapped = customData.reduce((acc: any, cur: any) => {
          acc[cur.id] = cur;
          return acc;
        }, {});
        setCustomSectionsMap(mapped);
      }

      // 4. Load Header/Footer from site_config
      const { data: headerData } = await supabase
        .from("site_config")
        .select("value")
        .eq("key", "header_config")
        .maybeSingle();
      if (headerData?.value) setHeaderConfig(headerData.value);

      const { data: footerData } = await supabase
        .from("site_config")
        .select("value")
        .eq("key", "footer_config")
        .maybeSingle();
      if (footerData?.value) setFooterConfig(footerData.value);

      setIsModified(false);
    } catch (err: any) {
      console.error("Load config error:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to load layouts." });
    }
  }, [activePage, toast]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Load snapshots version history
  const loadVersions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("theme_versions")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setVersions(data);
    } catch (err) {
      console.error("Error loading versions:", err);
    }
  }, []);

  // Load storage assets list
  const loadAssets = useCallback(async () => {
    try {
      const { data, error } = await supabase.storage.from("product-media").list("", {
        limit: 50,
        sortBy: { column: "created_at", order: "desc" }
      });
      if (!error && data) {
        const mapped = data.map(f => ({
          name: f.name,
          url: supabase.storage.from("product-media").getPublicUrl(f.name).data.publicUrl,
          created_at: f.created_at
        }));
        setAssets(mapped);
      }
    } catch (err) {
      console.error("Error listing assets:", err);
    }
  }, []);

  useEffect(() => {
    loadVersions();
    loadAssets();
  }, [loadVersions, loadAssets]);

  // Handle Asset Upload
  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingAsset(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `asset_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    try {
      const { error } = await supabase.storage.from("product-media").upload(fileName, file);
      if (error) throw error;
      toast({ title: "Upload Succeeded", description: "Asset saved to your media storage." });
      loadAssets();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: err.message });
    } finally {
      setUploadingAsset(false);
    }
  };

  // Add Built-in Section
  const addBuiltInSection = (id: string) => {
    const existing = defaultSections.find(s => s.id === id);
    if (!existing) return;
    const newSection: SectionConfig = {
      ...existing,
      id: `${id}_${Date.now()}`,
      visible: true,
      order: sections.length
    };
    setSections([...sections, newSection]);
    setIsModified(true);
  };

  // Duplicate Section
  const duplicateSection = (index: number) => {
    const section = sections[index];
    const newSection: SectionConfig = {
      ...section,
      id: `${section.id.split('_')[0]}_${Date.now()}`,
      order: sections.length
    };
    const updated = [...sections];
    updated.splice(index + 1, 0, newSection);
    setSections(updated.map((s, idx) => ({ ...s, order: idx })));
    setIsModified(true);
  };

  // Remove Section
  const removeSection = (index: number) => {
    const updated = sections.filter((_, idx) => idx !== index);
    setSections(updated.map((s, idx) => ({ ...s, order: idx })));
    setSelectedSectionIndex(null);
    setIsModified(true);
  };

  // Drag and Drop Handling (Sidebar List)
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...sections];
    const item = updated.splice(draggedIndex, 1)[0];
    updated.splice(index, 0, item);
    setSections(updated.map((s, idx) => ({ ...s, order: idx })));
    setDraggedIndex(index);
    setIsModified(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Save Config as Draft/Publish
  const handlePublish = async () => {
    setSaving(true);
    try {
      // 1. Save Layout
      const { error: layoutErr } = await supabase
        .from("layout_config")
        .upsert([{ page: activePage, page_type: "custom", sections: sections, is_active: true }], { onConflict: "page" });

      // 2. Save Theme
      const { error: themeErr } = await supabase
        .from("theme_config")
        .upsert([{ id: "default", name: "Default Theme", config: theme, is_active: true }], { onConflict: "id" });

      // 3. Save Site Config (Headers/Footers)
      await supabase.from("site_config").upsert([{ key: "header_config", value: headerConfig }], { onConflict: "key" });
      await supabase.from("site_config").upsert([{ key: "footer_config", value: footerConfig }], { onConflict: "key" });

      if (layoutErr || themeErr) throw layoutErr || themeErr;

      applyThemeToDOM(theme);
      setIsModified(false);
      toast({ title: "Publish Successful", description: "Design changes are now live on Durtup.shop!" });
      queryClient.invalidateQueries({ queryKey: ["layout-config"] });
      queryClient.invalidateQueries({ queryKey: ["theme-config"] });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Publish Failed", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Save Version Snapshot
  const handleSaveSnapshot = async () => {
    const name = prompt("Enter a name for this snapshot version:");
    if (!name) return;
    try {
      const { error } = await supabase
        .from("theme_versions")
        .insert([{ name, theme_config: theme, layout_config: { sections } }]);
      if (error) throw error;
      toast({ title: "Snapshot Saved", description: "You can restore this snapshot anytime." });
      loadVersions();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  // Restore Version Snapshot
  const handleRestoreVersion = async (v: any) => {
    if (!confirm(`Are you sure you want to restore snapshot "${v.name}"?`)) return;
    try {
      setTheme(v.theme_config);
      if (v.layout_config?.sections) {
        setSections(v.layout_config.sections);
      }
      setIsModified(true);
      toast({ title: "Snapshot Restored", description: "Click Publish to make it live." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Restore Failed", description: err.message });
    }
  };

  // Color modification handler
  const handleColorChange = (key: string, val: string) => {
    setTheme(prev => ({ ...prev, [key]: val }));
    setIsModified(true);
  };

  const selectedSection = selectedSectionIndex !== null ? sections[selectedSectionIndex] : null;

  return (
    <AdminLayout title="Visual Theme Editor">
      {/* Top Banner Control Panel */}
      <div className="flex items-center justify-between bg-card border rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Palette className="h-6 w-6 text-primary animate-pulse" />
          <div>
            <h2 className="font-semibold text-lg">Visual Drag & Drop Website Builder</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isModified ? "secondary" : "outline"} className="text-xs">
                {isModified ? "Unpublished Draft Changes" : "Live / Synchronized"}
              </Badge>
              <span className="text-[10px] text-muted-foreground">• Configured for Durtup.shop</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSaveSnapshot} className="h-9 gap-1.5 text-xs">
            <History className="h-4 w-4" /> Snapshot
          </Button>
          <Button variant="default" size="sm" onClick={handlePublish} disabled={saving} className="h-9 gap-1.5 text-xs font-semibold px-4 bg-primary hover:bg-primary/95 text-primary-foreground shadow-md transition-all">
            {saving ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Publish Design Live
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr_340px] gap-6 items-start h-[calc(100vh-210px)] min-h-[500px]">
        {/* ================================================================= */}
        {/* COLUMN 1: LEFT SIDEBAR EDITOR CONTROL PANELS                      */}
        {/* ================================================================= */}
        <div className="bg-card border rounded-2xl flex flex-col h-full overflow-hidden shadow-sm">
          <div className="flex border-b text-center text-xs font-medium">
            <button
              onClick={() => setActiveTab("sections")}
              className={`flex-1 py-3 hover:bg-muted/40 border-b-2 transition-all ${
                activeTab === "sections" ? "border-primary text-primary bg-muted/20 font-bold" : "border-transparent text-muted-foreground"
              }`}
            >
              Layout
            </button>
            <button
              onClick={() => setActiveTab("theme")}
              className={`flex-1 py-3 hover:bg-muted/40 border-b-2 transition-all ${
                activeTab === "theme" ? "border-primary text-primary bg-muted/20 font-bold" : "border-transparent text-muted-foreground"
              }`}
            >
              Colors
            </button>
            <button
              onClick={() => setActiveTab("assets")}
              className={`flex-1 py-3 hover:bg-muted/40 border-b-2 transition-all ${
                activeTab === "assets" ? "border-primary text-primary bg-muted/20 font-bold" : "border-transparent text-muted-foreground"
              }`}
            >
              Media
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-3 hover:bg-muted/40 border-b-2 transition-all ${
                activeTab === "history" ? "border-primary text-primary bg-muted/20 font-bold" : "border-transparent text-muted-foreground"
              }`}
            >
              History
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* SECTIONS TAB */}
            {activeTab === "sections" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Select Page Template</Label>
                  <Select value={activePage} onValueChange={setActivePage}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGES_TEMPLATES.map((p) => (
                        <SelectItem key={p.key} value={p.key} className="text-xs">
                          <span className="flex items-center gap-2"><p.icon className="h-3.5 w-3.5" />{p.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Active Page Blocks</span>
                  <Select onValueChange={(id) => addBuiltInSection(id)}>
                    <SelectTrigger className="h-7 w-28 text-[10px] gap-1">
                      <Plus className="h-3 w-3" /> Add Section
                    </SelectTrigger>
                    <SelectContent>
                      {defaultSections.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedSectionIndex(index)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-grab active:cursor-grabbing transition-all ${
                        selectedSectionIndex === index
                          ? "border-primary ring-1 ring-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:bg-muted/30"
                      } ${!section.visible && "opacity-50"}`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">{section.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = [...sections];
                            updated[index] = { ...section, visible: !section.visible };
                            setSections(updated);
                            setIsModified(true);
                          }}
                          className="p-1 hover:bg-muted rounded text-muted-foreground"
                          title="Toggle visibility"
                        >
                          {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateSection(index);
                          }}
                          className="p-1 hover:bg-muted rounded text-muted-foreground"
                          title="Duplicate Section"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSection(index);
                          }}
                          className="p-1 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground"
                          title="Delete Section"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COLOR SCHEMES TAB */}
            {activeTab === "theme" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Select Preset Theme Palette</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.keys(themePresets).map((preset) => (
                      <Button
                        key={preset}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTheme({ ...themePresets[preset] });
                          applyThemeToDOM(themePresets[preset]);
                          setIsModified(true);
                          toast({ title: `${preset} palette loaded.` });
                        }}
                        className="text-[11px] h-8 capitalize justify-start font-medium gap-1"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> {preset}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Brand Colors (HSL)</span>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Primary Branding Color</Label>
                      <div className="flex items-center gap-2">
                        <Input value={theme.primary} onChange={(e) => handleColorChange("primary", e.target.value)} className="h-8 font-mono text-xs" />
                        <div className="w-8 h-8 rounded-lg border border-border shadow-sm flex-shrink-0" style={{ backgroundColor: `hsl(${theme.primary})` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Secondary Accent Color</Label>
                      <div className="flex items-center gap-2">
                        <Input value={theme.secondary} onChange={(e) => handleColorChange("secondary", e.target.value)} className="h-8 font-mono text-xs" />
                        <div className="w-8 h-8 rounded-lg border border-border shadow-sm flex-shrink-0" style={{ backgroundColor: `hsl(${theme.secondary})` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Background Fill Color</Label>
                      <div className="flex items-center gap-2">
                        <Input value={theme.background} onChange={(e) => handleColorChange("background", e.target.value)} className="h-8 font-mono text-xs" />
                        <div className="w-8 h-8 rounded-lg border border-border shadow-sm flex-shrink-0" style={{ backgroundColor: `hsl(${theme.background})` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Default Text Color</Label>
                      <div className="flex items-center gap-2">
                        <Input value={theme.foreground} onChange={(e) => handleColorChange("foreground", e.target.value)} className="h-8 font-mono text-xs" />
                        <div className="w-8 h-8 rounded-lg border border-border shadow-sm flex-shrink-0" style={{ backgroundColor: `hsl(${theme.foreground})` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Card / Section Fill Color</Label>
                      <div className="flex items-center gap-2">
                        <Input value={theme.card} onChange={(e) => handleColorChange("card", e.target.value)} className="h-8 font-mono text-xs" />
                        <div className="w-8 h-8 rounded-lg border border-border shadow-sm flex-shrink-0" style={{ backgroundColor: `hsl(${theme.card})` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MEDIA ASSETS TAB */}
            {activeTab === "assets" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Upload Media Asset</Label>
                  <div className="relative border-2 border-dashed rounded-xl p-4 text-center hover:bg-muted/40 cursor-pointer transition-all">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleAssetUpload}
                      disabled={uploadingAsset}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
                      <Upload className="h-6 w-6 text-primary animate-bounce" />
                      {uploadingAsset ? "Uploading file..." : "Drag & Drop or Click to upload"}
                    </div>
                  </div>
                </div>

                <Separator />

                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Saved Media Assets</span>
                <div className="grid grid-cols-2 gap-2">
                  {assets.map((asset, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        navigator.clipboard.writeText(asset.url);
                        toast({ title: "Copied!", description: "Asset URL copied to clipboard." });
                      }}
                      className="group relative border rounded-xl overflow-hidden aspect-video bg-muted/30 cursor-pointer hover:border-primary transition-all shadow-sm"
                    >
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white transition-all font-semibold">
                        Copy URL
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VERSION HISTORY SNAPSHOTS TAB */}
            {activeTab === "history" && (
              <div className="space-y-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Saved Snapshot Versions</span>
                <div className="space-y-2">
                  {versions.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No snapshots available. Create your first snapshot snapshot above!
                    </div>
                  ) : (
                    versions.map((v) => (
                      <div key={v.id} className="p-3 border rounded-xl bg-card space-y-2 text-xs hover:border-primary transition-all shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground truncate w-2/3">{v.name}</span>
                          <Badge variant="outline" className="text-[9px]">
                            {new Date(v.created_at).toLocaleDateString()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1" onClick={() => handleRestoreVersion(v)}>
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              if (!confirm("Delete this snapshot version?")) return;
                              await supabase.from("theme_versions").delete().eq("id", v.id);
                              loadVersions();
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* COLUMN 2: CENTER DEVICE PREVIEW CANVAS WITH INTERACTIVE CONTROLS  */}
        {/* ================================================================= */}
        <div className="flex flex-col h-full bg-muted/20 border rounded-2xl overflow-hidden shadow-sm">
          {/* Top Bar Switchers */}
          <div className="flex items-center justify-between p-3 border-b bg-card">
            <div className="flex items-center gap-1">
              {DEVICE_SIZES.map((d) => (
                <Button
                  key={d.key}
                  variant={previewDevice === d.key ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewDevice(d.key as any)}
                  title={`${d.label} View`}
                >
                  <d.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))} title="Zoom Out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-semibold w-12 text-center">{zoomLevel}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoomLevel(prev => Math.min(100, prev + 10))} title="Zoom In">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Interactive Canvas Rendering Area */}
          <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-muted/40">
            <div
              className="bg-background border rounded-2xl shadow-xl overflow-hidden transition-all duration-300 relative min-h-[500px]"
              style={{
                width: DEVICE_SIZES.find(d => d.key === previewDevice)?.width || 1440,
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top center",
              }}
            >
              {/* Mock Header Preview */}
              {headerConfig?.top_bar?.visible !== false && (
                <div className="bg-primary text-primary-foreground text-center py-1.5 text-[10px] font-semibold tracking-wide">
                  {headerConfig?.top_bar?.text || "Top Info Promotion Bar"}
                </div>
              )}
              <div className="border-b px-4 py-3 flex items-center justify-between bg-card">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-sm">D</div>
                  <span className="text-xs font-bold">{headerConfig?.logo_text || "Durtup"}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
                  <span>Home</span>
                  <span>Products</span>
                  <span>Categories</span>
                </div>
              </div>

              {/* Dynamic visual blocks listing representing the page design */}
              <div className="p-4 space-y-4 pb-20">
                {sections.length === 0 ? (
                  <div className="py-12 border-2 border-dashed rounded-xl text-center text-xs text-muted-foreground">
                    Your layout is currently empty. Add section blocks from the left sidebar to start building.
                  </div>
                ) : (
                  sections.map((sec, idx) => {
                    const isSelected = selectedSectionIndex === idx;
                    const content = (sec.customSectionId && customSectionsMap[sec.customSectionId])
                      ? { ...customSectionsMap[sec.customSectionId].config, ...sec.content }
                      : sec.content || {};

                    if (!sec.visible) return null;

                    return (
                      <div
                        key={sec.id}
                        onClick={() => setSelectedSectionIndex(idx)}
                        className={`relative rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                          isSelected ? "border-primary ring-2 ring-primary bg-primary/5 shadow-md scale-[1.01]" : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                        }`}
                        style={{
                          backgroundColor: sec.style?.backgroundColor || undefined,
                          color: sec.style?.textColor || undefined,
                          padding: sec.style?.padding || undefined,
                          margin: sec.style?.margin || undefined,
                          borderRadius: sec.style?.borderRadius || undefined,
                          boxShadow: sec.style?.shadow || undefined
                        }}
                      >
                        {isSelected && (
                          <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[9px] font-bold tracking-wider uppercase shadow-sm">
                            Editing Block
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{sec.label}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">#{sec.id.split('_')[0]}</span>
                        </div>

                        {content.imageUrl && (
                          <div className="rounded-lg overflow-hidden border mb-2 bg-muted max-h-32 flex justify-center">
                            <img src={content.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <h4 className="font-bold text-sm">{content.title || sec.label}</h4>
                        {content.subtitle && <p className="text-xs text-muted-foreground mt-1">{content.subtitle}</p>}
                        {content.text && <p className="text-xs mt-2 line-clamp-3 leading-relaxed">{content.text}</p>}
                        {content.buttonText && (
                          <Button size="sm" variant="default" className="mt-3 text-[10px] h-7 px-3 bg-primary text-primary-foreground pointer-events-none">
                            {content.buttonText}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Mock Footer Preview */}
              <div className="border-t bg-card p-4 text-[10px] text-muted-foreground text-center">
                <p className="font-semibold text-foreground mb-1">{footerConfig?.brand_description || "Durtup Shopping Destination"}</p>
                <p>{footerConfig?.copyright || "© 2026 Durtup. All rights reserved."}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* COLUMN 3: RIGHT PANEL PROPERTY EDITORS                            */}
        {/* ================================================================= */}
        <div className="bg-card border rounded-2xl flex flex-col h-full overflow-hidden shadow-sm">
          <div className="p-3 border-b bg-muted/10">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" /> Property Editor
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Customize properties of selected canvas block.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedSection && selectedSectionIndex !== null ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs uppercase tracking-wide py-0.5">
                    {selectedSection.label}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setSelectedSectionIndex(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <Separator />

                {/* Text Content Editor */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Block Content</h4>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Block Title</Label>
                    <Input
                      value={selectedSection.content?.title || ""}
                      onChange={(e) => {
                        const updated = [...sections];
                        updated[selectedSectionIndex] = {
                          ...selectedSection,
                          content: { ...(selectedSection.content || {}), title: e.target.value }
                        };
                        setSections(updated);
                        setIsModified(true);
                      }}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Subtitle</Label>
                    <Input
                      value={selectedSection.content?.subtitle || ""}
                      onChange={(e) => {
                        const updated = [...sections];
                        updated[selectedSectionIndex] = {
                          ...selectedSection,
                          content: { ...(selectedSection.content || {}), subtitle: e.target.value }
                        };
                        setSections(updated);
                        setIsModified(true);
                      }}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Body Text</Label>
                    <Textarea
                      value={selectedSection.content?.text || ""}
                      onChange={(e) => {
                        const updated = [...sections];
                        updated[selectedSectionIndex] = {
                          ...selectedSection,
                          content: { ...(selectedSection.content || {}), text: e.target.value }
                        };
                        setSections(updated);
                        setIsModified(true);
                      }}
                      className="text-xs min-h-[70px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Image Link (URL)</Label>
                    <Input
                      value={selectedSection.content?.imageUrl || ""}
                      onChange={(e) => {
                        const updated = [...sections];
                        updated[selectedSectionIndex] = {
                          ...selectedSection,
                          content: { ...(selectedSection.content || {}), imageUrl: e.target.value }
                        };
                        setSections(updated);
                        setIsModified(true);
                      }}
                      className="h-8 text-xs font-mono"
                      placeholder="Paste image link from Media tab..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Button Text</Label>
                      <Input
                        value={selectedSection.content?.buttonText || ""}
                        onChange={(e) => {
                          const updated = [...sections];
                          updated[selectedSectionIndex] = {
                            ...selectedSection,
                            content: { ...(selectedSection.content || {}), buttonText: e.target.value }
                          };
                          setSections(updated);
                          setIsModified(true);
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Button Link</Label>
                      <Input
                        value={selectedSection.content?.buttonLink || ""}
                        onChange={(e) => {
                          const updated = [...sections];
                          updated[selectedSectionIndex] = {
                            ...selectedSection,
                            content: { ...(selectedSection.content || {}), buttonLink: e.target.value }
                          };
                          setSections(updated);
                          setIsModified(true);
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Spacing & Borders Editor */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Spacing & Style</h4>

                  <div className="space-y-1">
                    <Label className="text-xs">Section Padding (e.g. 1rem or 20px)</Label>
                    <Input
                      value={selectedSection.style?.padding || ""}
                      onChange={(e) => {
                        const updated = [...sections];
                        updated[selectedSectionIndex] = {
                          ...selectedSection,
                          style: { ...(selectedSection.style || {}), padding: e.target.value }
                        };
                        setSections(updated);
                        setIsModified(true);
                      }}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Section Margin</Label>
                    <Input
                      value={selectedSection.style?.margin || ""}
                      onChange={(e) => {
                        const updated = [...sections];
                        updated[selectedSectionIndex] = {
                          ...selectedSection,
                          style: { ...(selectedSection.style || {}), margin: e.target.value }
                        };
                        setSections(updated);
                        setIsModified(true);
                      }}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Background Hex/HSL Color</Label>
                    <Input
                      value={selectedSection.style?.backgroundColor || ""}
                      onChange={(e) => {
                        const updated = [...sections];
                        updated[selectedSectionIndex] = {
                          ...selectedSection,
                          style: { ...(selectedSection.style || {}), backgroundColor: e.target.value }
                        };
                        setSections(updated);
                        setIsModified(true);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Corner Border Radius</Label>
                    <Input
                      value={selectedSection.style?.borderRadius || ""}
                      onChange={(e) => {
                        const updated = [...sections];
                        updated[selectedSectionIndex] = {
                          ...selectedSection,
                          style: { ...(selectedSection.style || {}), borderRadius: e.target.value }
                        };
                        setSections(updated);
                        setIsModified(true);
                      }}
                      className="h-8 text-xs"
                      placeholder="e.g. 0.5rem or 12px"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full text-xs text-muted-foreground py-16">
                <Layout className="h-8 w-8 text-muted-foreground/50 mb-3" />
                No block selected.<br />Click on any section block in the center canvas to edit its layout, colors, and content settings.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

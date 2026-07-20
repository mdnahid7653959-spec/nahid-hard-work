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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { defaultTheme, ThemeConfig, applyThemeToDOM, themePresets } from "@/hooks/useThemeConfig";
import { defaultSections, SectionConfig } from "@/hooks/useLayoutConfig";
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
  Image,
  Type,
  Code,
  Video,
  PanelLeft,
  Pencil,
} from "lucide-react";

function getAdminToken(): string | null {
  try {
    const stored = localStorage.getItem("megamart_admin_session");
    if (stored) return JSON.parse(stored).token || null;
  } catch {
    // ignore
  }
  return null;
}

async function apiCall(action: string, method: string, body?: unknown) {
  const token = getAdminToken();
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = `${baseUrl}/functions/v1/admin-theme?action=${action}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": token || "",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Request failed");
  }

  return res.json();
}

function HSLColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const parts = value.split(" ");
  const h = parseInt(parts[0]) || 0;
  const s = parseInt(parts[1]) || 0;
  const l = parseInt(parts[2]) || 50;

  const hslToHex = (hue: number, sat: number, lig: number) => {
    const sN = sat / 100;
    const lN = lig / 100;
    const c = (1 - Math.abs(2 * lN - 1)) * sN;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = lN - c / 2;
    let r = 0,
      g = 0,
      b = 0;

    if (hue < 60) {
      r = c;
      g = x;
    } else if (hue < 120) {
      r = x;
      g = c;
    } else if (hue < 180) {
      g = c;
      b = x;
    } else if (hue < 240) {
      g = x;
      b = c;
    } else if (hue < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }

    const hex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  };

  const hexToHSL = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, l: 50 };

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;
    let sat = 0;
    const lig = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      sat = lig > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          hue = ((b - r) / d + 2) / 6;
          break;
        case b:
          hue = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return { h: Math.round(hue * 360), s: Math.round(sat * 100), l: Math.round(lig * 100) };
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hslToHex(h, s, l)}
          onChange={(e) => {
            const { h: nh, s: ns, l: nl } = hexToHSL(e.target.value);
            onChange(`${nh} ${ns}% ${nl}%`);
          }}
          className="w-8 h-8 rounded border cursor-pointer"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 text-xs font-mono h-8" placeholder="H S% L%" />
      </div>
    </div>
  );
}

function SectionStyleEditor({
  section,
  onChange,
}: {
  section: SectionConfig;
  onChange: (s: SectionConfig) => void;
}) {
  const style = section.style || {};
  const rg = section.responsiveGrid || { mobile: 2, tablet: 3, desktop: 6 };
  const content = section.content || {};
  const schedule = section.schedule || {};

  const updateStyle = (key: string, value: string) => onChange({ ...section, style: { ...style, [key]: value } });
  const updateGrid = (device: "mobile" | "tablet" | "desktop", value: number) =>
    onChange({ ...section, responsiveGrid: { ...rg, [device]: value } });
  const updateContent = (key: string, value: unknown) =>
    onChange({ ...section, content: { ...content, [key]: value } });
  const updateSchedule = (key: string, value: string) =>
    onChange({ ...section, schedule: { ...schedule, [key]: value || undefined } });

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Content</h4>
        <div>
          <Label className="text-xs">Section Label</Label>
          <Input className="h-8 text-xs" value={section.label} onChange={(e) => onChange({ ...section, label: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input className="h-8 text-xs" value={(content.title as string) || ""} onChange={(e) => updateContent("title", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Subtitle</Label>
            <Input className="h-8 text-xs" value={(content.subtitle as string) || ""} onChange={(e) => updateContent("subtitle", e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Image URL</Label>
          <Input className="h-8 text-xs" value={(content.imageUrl as string) || ""} onChange={(e) => updateContent("imageUrl", e.target.value)} placeholder="https://..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Button Text</Label>
            <Input className="h-8 text-xs" value={(content.buttonText as string) || ""} onChange={(e) => updateContent("buttonText", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Button Link</Label>
            <Input className="h-8 text-xs" value={(content.buttonLink as string) || ""} onChange={(e) => updateContent("buttonLink", e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Text / HTML</Label>
          <Textarea
            className="text-xs min-h-[90px]"
            value={(content.text as string) || (content.html as string) || ""}
            onChange={(e) => {
              updateContent("text", e.target.value);
              updateContent("html", e.target.value);
            }}
            placeholder="Text or HTML content"
          />
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-semibold mb-3">Spacing & Sizing</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Padding</Label>
            <Input className="h-8 text-xs" placeholder="e.g. 1rem" value={style.padding || ""} onChange={(e) => updateStyle("padding", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Margin</Label>
            <Input className="h-8 text-xs" placeholder="e.g. 0.5rem 0" value={style.margin || ""} onChange={(e) => updateStyle("margin", e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <Label className="text-xs">Border Radius</Label>
            <Input className="h-8 text-xs" placeholder="e.g. 12px" value={style.borderRadius || ""} onChange={(e) => updateStyle("borderRadius", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Shadow</Label>
            <Input className="h-8 text-xs" placeholder="e.g. 0 6px 18px rgba(...)" value={style.shadow || ""} onChange={(e) => updateStyle("shadow", e.target.value)} />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-semibold mb-3">Colors</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Background</Label>
            <Input className="h-8 text-xs" placeholder="hsl(0 0% 98%)" value={style.backgroundColor || ""} onChange={(e) => updateStyle("backgroundColor", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Text Color</Label>
            <Input className="h-8 text-xs" placeholder="hsl(0 0% 10%)" value={style.textColor || ""} onChange={(e) => updateStyle("textColor", e.target.value)} />
          </div>
        </div>
      </div>

      {section.gridCols !== undefined && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-3">Responsive Grid</h4>
            <div className="grid grid-cols-3 gap-2">
              {(["mobile", "tablet", "desktop"] as const).map((device) => (
                <div key={device} className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {device === "mobile" ? <Smartphone className="h-3 w-3" /> : device === "tablet" ? <Tablet className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                    {device}
                  </Label>
                  <Select value={String(rg[device])} onValueChange={(v) => updateGrid(device, parseInt(v))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} col{n > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-3">Feed Controls</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Max Items</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min={1}
                  max={50}
                  value={(content.maxItems as number) || ""}
                  onChange={(e) => updateContent("maxItems", parseInt(e.target.value) || undefined)}
                />
              </div>
              <div>
                <Label className="text-xs">Sort By</Label>
                <Select value={(content.sortBy as string) || "default"} onValueChange={(v) => updateContent("sortBy", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="latest">Latest</SelectItem>
                    <SelectItem value="popular">Popular</SelectItem>
                    <SelectItem value="random">Random</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </>
      )}

      <Separator />

      <div>
        <h4 className="text-sm font-semibold mb-3">Schedule</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Visible From</Label>
            <Input className="h-8 text-xs" type="datetime-local" value={schedule.startTime || ""} onChange={(e) => updateSchedule("startTime", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Visible Until</Label>
            <Input className="h-8 text-xs" type="datetime-local" value={schedule.endTime || ""} onChange={(e) => updateSchedule("endTime", e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}

const BLOCK_TYPES = [
  { type: "banner", label: "Banner", icon: Image },
  { type: "text", label: "Text Block", icon: Type },
  { type: "image_cta", label: "Image + CTA", icon: Image },
  { type: "html", label: "HTML Block", icon: Code },
  { type: "video", label: "Video", icon: Video },
] as const;

interface CustomBlockForm {
  type: string;
  title: string;
  config: Record<string, string | boolean>;
}

function CustomBlockEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CustomBlockForm;
  onSave: (b: CustomBlockForm) => void;
  onCancel: () => void;
}) {
  const [block, setBlock] = useState<CustomBlockForm>(initial || { type: "banner", title: "", config: {} });
  const update = (key: string, value: string | boolean) => setBlock((prev) => ({ ...prev, config: { ...prev.config, [key]: value } }));

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Block Type</Label>
        <Select value={block.type} onValueChange={(v) => setBlock((prev) => ({ ...prev, type: v, config: {} }))}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BLOCK_TYPES.map((bt) => (
              <SelectItem key={bt.type} value={bt.type}>
                {bt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Title</Label>
        <Input className="h-9" value={block.title} onChange={(e) => setBlock((prev) => ({ ...prev, title: e.target.value }))} placeholder="Block title" />
      </div>

      <Separator />

      {block.type === "banner" && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Image URL</Label>
            <Input className="h-8 text-xs" value={(block.config.imageUrl as string) || ""} onChange={(e) => update("imageUrl", e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs">Subtitle</Label>
            <Input className="h-8 text-xs" value={(block.config.subtitle as string) || ""} onChange={(e) => update("subtitle", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Button Text</Label>
            <Input className="h-8 text-xs" value={(block.config.buttonText as string) || ""} onChange={(e) => update("buttonText", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Button Link</Label>
            <Input className="h-8 text-xs" value={(block.config.buttonLink as string) || ""} onChange={(e) => update("buttonLink", e.target.value)} />
          </div>
        </div>
      )}

      {block.type === "text" && (
        <div>
          <Label className="text-xs">Content</Label>
          <Textarea className="text-xs min-h-[120px]" value={(block.config.content as string) || ""} onChange={(e) => update("content", e.target.value)} placeholder="Your text content..." />
        </div>
      )}

      {block.type === "image_cta" && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Image URL</Label>
            <Input className="h-8 text-xs" value={(block.config.imageUrl as string) || ""} onChange={(e) => update("imageUrl", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Heading</Label>
            <Input className="h-8 text-xs" value={(block.config.heading as string) || ""} onChange={(e) => update("heading", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea className="text-xs min-h-[80px]" value={(block.config.description as string) || ""} onChange={(e) => update("description", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">CTA Button Text</Label>
            <Input className="h-8 text-xs" value={(block.config.buttonText as string) || ""} onChange={(e) => update("buttonText", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">CTA Link</Label>
            <Input className="h-8 text-xs" value={(block.config.buttonLink as string) || ""} onChange={(e) => update("buttonLink", e.target.value)} />
          </div>
        </div>
      )}

      {block.type === "html" && (
        <div>
          <Label className="text-xs">HTML Content</Label>
          <Textarea className="text-xs font-mono min-h-[120px]" value={(block.config.html as string) || ""} onChange={(e) => update("html", e.target.value)} placeholder="<div>...</div>" />
        </div>
      )}

      {block.type === "video" && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Video URL</Label>
            <Input className="h-8 text-xs" value={(block.config.videoUrl as string) || ""} onChange={(e) => update("videoUrl", e.target.value)} placeholder="https://..." />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={() => block.title.trim() && onSave(block)} disabled={!block.title.trim()} className="flex-1">
          <Save className="h-3 w-3 mr-1" /> Save Block
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

const DEVICE_SIZES = [
  { key: "mobile", label: "Mobile", icon: Smartphone, width: 375 },
  { key: "tablet", label: "Tablet", icon: Tablet, width: 768 },
  { key: "desktop", label: "Desktop", icon: Monitor, width: 1440 },
] as const;

type DropPosition = "top" | "middle" | "bottom";

interface DropTarget {
  index: number;
  position: DropPosition;
}

export default function AdminThemeBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("layout");
  const [saving, setSaving] = useState(false);

  const [theme, setTheme] = useState<ThemeConfig>({ ...defaultTheme });
  const [themeId, setThemeId] = useState<string | null>(null);

  const [sections, setSections] = useState<SectionConfig[]>([...defaultSections]);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);

  const dragIndexRef = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [versions, setVersions] = useState<Array<{ id: string; name: string; created_at: string }>>([]);
  const [versionName, setVersionName] = useState("");

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showBlockEditor, setShowBlockEditor] = useState(false);
  const [editingBlock, setEditingBlock] = useState<CustomBlockForm | undefined>(undefined);

  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [showPreview, setShowPreview] = useState(true);

  const [headerConfig, setHeaderConfig] = useState<any>({
    logo_url: "/lovable-uploads/f37448fb-4b8d-40a2-9709-70766997626f.jpg",
    logo_text: "Darzo",
    top_bar: { visible: true, text: "Free Shipping on ৳999+" },
    show_search: true,
    show_categories_bar: true,
    nav_links: [
      { label: "Home", href: "/" },
      { label: "Flash Sale", href: "/flash-sale" },
      { label: "New Arrivals", href: "/new-arrivals" },
    ],
    trending_searches: ["Wireless earbuds", "Phone case"],
  });

  const [footerConfig, setFooterConfig] = useState<any>({
    logo_url: "/darzo-logo.png",
    brand_description: "Your one-stop destination for millions of products.",
    copyright: "© 2026 Darzo.com",
    columns: [
      { title: "Customer Service", links: [{ name: "Help", href: "/help" }] },
      { title: "Policies", links: [{ name: "Privacy", href: "/privacy" }] },
    ],
    social_links: [{ platform: "facebook", url: "#" }],
    payment_methods: ["Visa", "MC"],
  });

  const [mobileNavConfig, setMobileNavConfig] = useState<any>({
    tabs: [
      { label: "Home", icon: "home", href: "/" },
      { label: "Categories", icon: "grid", href: "/categories" },
      { label: "Cart", icon: "shopping-cart", href: "/cart", badge: "cart" },
      { label: "Account", icon: "user", href: "/account" },
    ],
  });

  const [heroQuickLinks, setHeroQuickLinks] = useState<any[]>([
    { title: "Free Ship", subtitle: "৳999+", icon: "truck", color: "from-blue-500 to-indigo-600", href: "/products?filter=free-shipping" },
    { title: "Flash Sale", subtitle: "Limited", icon: "percent", color: "from-rose-500 to-pink-600", href: "/products?filter=flash-sale" },
    { title: "Premium", subtitle: "VIP", icon: "crown", color: "from-amber-500 to-orange-600", href: "/products?filter=featured" },
  ]);

  const [customSectionsMap, setCustomSectionsMap] = useState<Record<string, { id: string; title: string; type: string; config: Record<string, unknown> }>>({});

  const loadCurrentConfig = useCallback(async () => {
    try {
      const [themeRes, layoutRes] = await Promise.all([apiCall("theme", "GET"), apiCall("layout", "GET")]);
      if (themeRes.data?.config) {
        setTheme({ ...defaultTheme, ...themeRes.data.config });
        setThemeId(themeRes.data.id);
      }
      if (layoutRes.data?.sections && Array.isArray(layoutRes.data.sections) && layoutRes.data.sections.length > 0) {
        setSections(layoutRes.data.sections);
      }
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  }, []);

  const loadVersions = useCallback(async () => {
    try {
      const res = await apiCall("versions", "GET");
      if (res.data) setVersions(res.data);
    } catch (err) {
      console.error("Failed to load versions:", err);
    }
  }, []);

  const loadSiteConfigs = useCallback(async () => {
    try {
      const [headerRes, footerRes, navRes, quickLinksRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-theme?action=site-config&key=header`, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        }).then((r) => r.json()),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-theme?action=site-config&key=footer`, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        }).then((r) => r.json()),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-theme?action=site-config&key=mobile_nav`, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        }).then((r) => r.json()),
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-theme?action=site-config&key=hero_quick_links`, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        }).then((r) => r.json()),
      ]);

      if (headerRes?.data?.value) setHeaderConfig(headerRes.data.value);
      if (footerRes?.data?.value) setFooterConfig(footerRes.data.value);
      if (navRes?.data?.value) setMobileNavConfig(navRes.data.value);
      if (quickLinksRes?.data?.value) setHeroQuickLinks(quickLinksRes.data.value);
    } catch (err) {
      console.error("Failed to load site configs:", err);
    }
  }, []);

  const loadCustomSections = useCallback(async () => {
    try {
      const res = await apiCall("custom-sections", "GET");
      const map: Record<string, { id: string; title: string; type: string; config: Record<string, unknown> }> = {};
      for (const item of res.data || []) {
        map[item.id] = {
          id: item.id,
          title: item.title,
          type: item.type,
          config: (item.config || {}) as Record<string, unknown>,
        };
      }
      setCustomSectionsMap(map);
    } catch (err) {
      console.error("Failed to load custom sections:", err);
    }
  }, []);

  useEffect(() => {
    loadCurrentConfig();
    loadVersions();
    loadSiteConfigs();
    loadCustomSections();
  }, [loadCurrentConfig, loadVersions, loadSiteConfigs, loadCustomSections]);

  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const updateTheme = useCallback((key: keyof ThemeConfig, value: string | boolean) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  }, []);

  const getDropPosition = (e: React.DragEvent<HTMLDivElement>): DropPosition => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const third = rect.height / 3;
    if (y < third) return "top";
    if (y > third * 2) return "bottom";
    return "middle";
  };

  const handleDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    dragIndexRef.current = index;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    const position = getDropPosition(e);
    setDropTarget({ index, position });
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  };

  const handleDrop = (targetIndex: number, forcedPosition?: DropPosition) => {
    const sourceIndex = dragIndexRef.current;
    const position = forcedPosition || dropTarget?.position || "bottom";

    if (sourceIndex === null || sourceIndex === targetIndex) {
      setDropTarget(null);
      setIsDragging(false);
      dragIndexRef.current = null;
      return;
    }

    const selectedId = selectedSectionIndex !== null ? sections[selectedSectionIndex]?.id : null;
    const newSections = [...sections];

    if (position === "middle") {
      const temp = newSections[sourceIndex];
      newSections[sourceIndex] = newSections[targetIndex];
      newSections[targetIndex] = temp;
    } else {
      const [moved] = newSections.splice(sourceIndex, 1);
      const insertIndex =
        sourceIndex < targetIndex
          ? position === "top"
            ? targetIndex - 1
            : targetIndex
          : position === "top"
            ? targetIndex
            : targetIndex + 1;

      newSections.splice(Math.max(0, insertIndex), 0, moved);
    }

    newSections.forEach((s, i) => {
      s.order = i;
    });

    setSections(newSections);

    if (selectedId) {
      const nextSelected = newSections.findIndex((s) => s.id === selectedId);
      setSelectedSectionIndex(nextSelected >= 0 ? nextSelected : null);
    }

    setDropTarget(null);
    setIsDragging(false);
    dragIndexRef.current = null;
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDropTarget(null);
    setIsDragging(false);
  };

  const toggleSection = (index: number) => {
    const next = [...sections];
    next[index].visible = !next[index].visible;
    setSections(next);
  };

  const duplicateSection = (index: number) => {
    const original = sections[index];
    const clone: SectionConfig = {
      ...JSON.parse(JSON.stringify(original)),
      id: `${original.id}_copy_${Date.now()}`,
      label: `${original.label} (Copy)`,
      order: sections.length,
    };
    const next = [...sections];
    next.splice(index + 1, 0, clone);
    next.forEach((s, i) => (s.order = i));
    setSections(next);
    toast({ title: "Section duplicated" });
  };

  const removeSection = (index: number) => {
    const section = sections[index];
    const next = [...sections];
    next.splice(index, 1);
    next.forEach((s, i) => (s.order = i));
    setSections(next);
    if (selectedSectionIndex === index) setSelectedSectionIndex(null);
    toast({ title: `Deleted: ${section.label}` });
  };

  const updateSectionConfig = (index: number, updated: SectionConfig) => {
    const next = [...sections];
    next[index] = updated;
    setSections(next);
  };

  const addBuiltInSection = (sectionId: string) => {
    const existingIndex = sections.findIndex((s) => s.id === sectionId);
    if (existingIndex >= 0) {
      const next = [...sections];
      next[existingIndex] = { ...next[existingIndex], visible: true };
      setSections(next);
      toast({ title: `"${next[existingIndex].label}" is now visible` });
      setShowAddSheet(false);
      return;
    }

    const base = defaultSections.find((s) => s.id === sectionId);
    if (!base) return;

    const next = [...sections, { ...base, order: sections.length }];
    setSections(next);
    setShowAddSheet(false);
    toast({ title: `Added: ${base.label}` });
  };

  const addCustomBlock = async (block: CustomBlockForm) => {
    try {
      const res = await apiCall("create-custom-section", "POST", block);
      const newSection: SectionConfig = {
        id: `custom_${res.data.id}`,
        label: block.title,
        visible: true,
        order: sections.length,
        customSectionId: res.data.id,
      };

      setCustomSectionsMap((prev) => ({
        ...prev,
        [res.data.id]: {
          id: res.data.id,
          title: block.title,
          type: block.type,
          config: block.config,
        },
      }));

      setSections((prev) => [...prev, newSection]);
      setShowBlockEditor(false);
      setShowAddSheet(false);
      queryClient.invalidateQueries({ queryKey: ["custom-sections"] });
      toast({ title: "Custom block added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const saveSiteConfig = async (key: string, value: any) => {
    setSaving(true);
    try {
      await apiCall("save-site-config", "POST", { key, value });
      queryClient.invalidateQueries({ queryKey: ["site-config", key] });
      toast({ title: `${key} saved` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const saveTheme = async () => {
    setSaving(true);
    try {
      await apiCall("theme", "POST", { id: themeId, config: theme });
      queryClient.invalidateQueries({ queryKey: ["theme-config"] });
      toast({ title: "Theme saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const saveLayout = async () => {
    setSaving(true);
    try {
      await apiCall("layout", "POST", { page: "homepage", sections });
      queryClient.invalidateQueries({ queryKey: ["layout-config"] });
      toast({ title: "Layout saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const saveVersion = async () => {
    if (!versionName.trim()) {
      toast({ title: "Enter a version name", variant: "destructive" });
      return;
    }

    try {
      await apiCall("save-version", "POST", {
        name: versionName,
        theme_config: theme,
        layout_config: { sections },
      });
      setVersionName("");
      loadVersions();
      toast({ title: "Version saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const restoreVersion = async (id: string) => {
    try {
      await apiCall("restore-version", "POST", { id });
      await loadCurrentConfig();
      queryClient.invalidateQueries({ queryKey: ["theme-config"] });
      queryClient.invalidateQueries({ queryKey: ["layout-config"] });
      toast({ title: "Version restored" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteVersion = async (id: string) => {
    try {
      await apiCall("delete-version", "POST", { id });
      loadVersions();
      toast({ title: "Version deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const applyPreset = (presetName: string) => {
    const preset = themePresets[presetName];
    if (!preset) return;
    setTheme({ ...preset });
    toast({ title: `${presetName} preset applied` });
  };

  const previewWidth = DEVICE_SIZES.find((d) => d.key === previewDevice)?.width || 375;
  const hiddenBuiltIns = defaultSections.filter((ds) => !sections.some((s) => s.id === ds.id));

  const selectedSection = selectedSectionIndex !== null ? sections[selectedSectionIndex] : null;

  const getPreviewContent = (section: SectionConfig) => {
    if (section.customSectionId && customSectionsMap[section.customSectionId]) {
      return {
        ...customSectionsMap[section.customSectionId].config,
        ...section.content,
      };
    }
    return section.content || {};
  };

  const getDropClasses = (index: number) => {
    if (!dropTarget || dropTarget.index !== index) return "";
    if (dropTarget.position === "top") return "ring-2 ring-primary/40 before:absolute before:-top-0.5 before:left-2 before:right-2 before:h-0.5 before:bg-primary before:rounded-full";
    if (dropTarget.position === "middle") return "ring-2 ring-primary/50 bg-primary/5";
    return "ring-2 ring-primary/40 after:absolute after:-bottom-0.5 after:left-2 after:right-2 after:h-0.5 after:bg-primary after:rounded-full";
  };

  const sectionPreviewCard = (section: SectionConfig, index: number) => {
    const content = getPreviewContent(section) as Record<string, unknown>;
    const isSelected = selectedSectionIndex === index;
    const isDragged = dragIndexRef.current === index && isDragging;

    return (
      <div
        key={`${section.id}-${index}`}
        draggable
        onDragStart={(e) => handleDragStart(index, e)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop(index)}
        onDragEnd={handleDragEnd}
        onClick={() => setSelectedSectionIndex(index)}
        className={`relative rounded-xl border transition-all p-3 cursor-grab active:cursor-grabbing ${
          section.visible ? "bg-card" : "bg-muted/40 opacity-60"
        } ${isSelected ? "ring-2 ring-primary border-primary" : "border-border"} ${isDragged ? "opacity-50 scale-[0.99]" : ""} ${getDropClasses(index)}`}
        style={{
          backgroundColor: section.style?.backgroundColor || undefined,
          color: section.style?.textColor || undefined,
          padding: section.style?.padding || undefined,
          margin: section.style?.margin || undefined,
          borderRadius: section.style?.borderRadius || undefined,
          boxShadow: section.style?.shadow || undefined,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wide">{section.label}</p>
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {section.id}
          </Badge>
        </div>

        {(content.imageUrl as string) && (
          <div className="rounded-lg overflow-hidden border mb-2 bg-muted">
            <img src={content.imageUrl as string} alt={(content.title as string) || section.label} className="w-full h-24 object-cover" />
          </div>
        )}

        <h4 className="text-sm font-semibold">{(content.title as string) || section.label}</h4>
        {(content.subtitle as string) && <p className="text-xs text-muted-foreground mt-1">{content.subtitle as string}</p>}
        {(content.text as string) && <p className="text-xs mt-2 line-clamp-3">{content.text as string}</p>}

        <div className="flex items-center gap-1 mt-3">
          <Button size="icon" variant="outline" className="h-7 w-7" title="Edit" onClick={(e) => { e.stopPropagation(); setSelectedSectionIndex(index); }}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" title="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateSection(index); }}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" title="Toggle visibility" onClick={(e) => { e.stopPropagation(); toggleSection(index); }}>
            {section.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
          <Button size="icon" variant="destructive" className="h-7 w-7" title="Delete section" onClick={(e) => { e.stopPropagation(); removeSection(index); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout title="Visual Builder">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground">Visual Builder</h1>
            <Badge variant="secondary" className="text-[10px]">True Drag & Drop</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1 border-primary/40 text-primary hover:bg-primary/10">
              <Link to="/admin/home-bento">
                <Layout className="h-4 w-4" />
                <span className="hidden md:inline">Home Bento Manager</span>
                <span className="md:hidden">Bento</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-1">
              <PanelLeft className="h-4 w-4" />
              <span className="hidden md:inline">{showPreview ? "Hide" : "Show"} Preview</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (activeTab === "theme") saveTheme();
                else if (activeTab === "layout") saveLayout();
                else if (activeTab === "header") saveSiteConfig("header", headerConfig || {});
                else if (activeTab === "footer") saveSiteConfig("footer", footerConfig || {});
                else if (activeTab === "navigation") saveSiteConfig("mobile_nav", mobileNavConfig || {});
              }}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-full md:w-[420px] lg:w-[480px] shrink-0 overflow-y-auto border-r bg-background">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6 rounded-none border-b">
                <TabsTrigger value="layout" className="gap-1 rounded-none text-[10px]"><Layout className="h-3 w-3" />Layout</TabsTrigger>
                <TabsTrigger value="theme" className="gap-1 rounded-none text-[10px]"><Palette className="h-3 w-3" />Theme</TabsTrigger>
                <TabsTrigger value="header" className="gap-1 rounded-none text-[10px]"><Settings2 className="h-3 w-3" />Header</TabsTrigger>
                <TabsTrigger value="footer" className="gap-1 rounded-none text-[10px]"><Settings2 className="h-3 w-3" />Footer</TabsTrigger>
                <TabsTrigger value="navigation" className="gap-1 rounded-none text-[10px]"><Smartphone className="h-3 w-3" />Nav</TabsTrigger>
                <TabsTrigger value="versions" className="gap-1 rounded-none text-[10px]"><Clock className="h-3 w-3" />History</TabsTrigger>
              </TabsList>

              <TabsContent value="layout" className="mt-0 p-0">
                <div className="p-3 border-b flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Drag handle + drop zones (top / middle / bottom)</p>
                    <p className="text-[10px] text-muted-foreground">Middle zone swaps, top/bottom inserts</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddSheet(true)}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSections([...defaultSections]);
                        setSelectedSectionIndex(null);
                        toast({ title: "Layout reset" });
                      }}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="p-2 space-y-2">
                  {sections.map((section, index) => {
                    const isSelected = selectedSectionIndex === index;
                    const isDragged = dragIndexRef.current === index && isDragging;
                    return (
                      <div
                        key={`${section.id}-${index}`}
                        draggable
                        onDragStart={(e) => handleDragStart(index, e)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(index)}
                        onDragEnd={handleDragEnd}
                        className={`group relative rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                          section.visible ? "bg-card" : "bg-muted/40 opacity-60"
                        } ${isSelected ? "ring-2 ring-primary border-primary" : "border-border"} ${isDragged ? "opacity-50" : ""} ${getDropClasses(index)}`}
                      >
                        <div className="flex items-center gap-2 p-2.5">
                          <div className="h-7 w-7 rounded-md border bg-background flex items-center justify-center">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>

                          <span className="w-5 text-center text-[10px] font-mono text-muted-foreground">{index + 1}</span>

                          <button className="flex-1 min-w-0 text-left" onClick={() => setSelectedSectionIndex(index)}>
                            <p className="text-sm font-medium truncate">{section.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{section.id}</p>
                          </button>

                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setSelectedSectionIndex(index)} title="Edit">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => duplicateSection(index)} title="Duplicate">
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => toggleSection(index)} title="Toggle visibility">
                              {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </Button>
                            <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeSection(index)} title="Delete section">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="theme" className="mt-0 p-4 space-y-6">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Quick Presets</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(themePresets).map((name) => (
                      <Button key={name} variant="outline" size="sm" onClick={() => applyPreset(name)} className="capitalize h-7 text-xs">
                        <Sparkles className="h-3 w-3 mr-1" /> {name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Colors</h4>
                  <HSLColorPicker label="Primary" value={theme.primary} onChange={(v) => updateTheme("primary", v)} />
                  <HSLColorPicker label="Primary Text" value={theme.primaryForeground} onChange={(v) => updateTheme("primaryForeground", v)} />
                  <HSLColorPicker label="Background" value={theme.background} onChange={(v) => updateTheme("background", v)} />
                  <HSLColorPicker label="Text" value={theme.foreground} onChange={(v) => updateTheme("foreground", v)} />
                  <HSLColorPicker label="Card" value={theme.card} onChange={(v) => updateTheme("card", v)} />
                  <HSLColorPicker label="Card Text" value={theme.cardForeground} onChange={(v) => updateTheme("cardForeground", v)} />
                  <HSLColorPicker label="Muted" value={theme.muted} onChange={(v) => updateTheme("muted", v)} />
                  <HSLColorPicker label="Muted Text" value={theme.mutedForeground} onChange={(v) => updateTheme("mutedForeground", v)} />
                  <HSLColorPicker label="Accent" value={theme.accent} onChange={(v) => updateTheme("accent", v)} />
                  <HSLColorPicker label="Border" value={theme.border} onChange={(v) => updateTheme("border", v)} />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Typography & Style</h4>
                  <div>
                    <Label className="text-xs">Font Family</Label>
                    <Select value={theme.fontFamily} onValueChange={(v) => updateTheme("fontFamily", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Inter", "Poppins", "Roboto", "Open Sans", "Nunito", "Lato"].map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Font Size: {theme.fontSize}px</Label>
                    <Slider value={[parseInt(theme.fontSize) || 16]} min={12} max={20} step={1} onValueChange={([v]) => updateTheme("fontSize", String(v))} />
                  </div>
                  <div>
                    <Label className="text-xs">Border Radius: {theme.radius}</Label>
                    <Select value={theme.radius} onValueChange={(v) => updateTheme("radius", v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["0rem", "0.25rem", "0.5rem", "0.75rem", "1rem", "1.5rem"].map((val) => (
                          <SelectItem key={val} value={val}>{val}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTheme({ ...defaultTheme });
                      applyThemeToDOM(defaultTheme);
                      toast({ title: "Theme reset" });
                    }}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="header" className="mt-0 p-4 space-y-5">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Logo</h4>
                  <div className="space-y-3">
                    <div><Label className="text-xs">Logo Image URL</Label><Input className="h-8 text-xs" value={headerConfig?.logo_url || ""} onChange={(e) => setHeaderConfig((p: any) => ({ ...p, logo_url: e.target.value }))} /></div>
                    <div><Label className="text-xs">Logo Alt Text</Label><Input className="h-8 text-xs" value={headerConfig?.logo_text || ""} onChange={(e) => setHeaderConfig((p: any) => ({ ...p, logo_text: e.target.value }))} /></div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3">Top Bar</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={headerConfig?.top_bar?.visible !== false} onChange={(e) => setHeaderConfig((p: any) => ({ ...p, top_bar: { ...p?.top_bar, visible: e.target.checked } }))} />
                      <Label className="text-xs">Show Top Bar</Label>
                    </div>
                    <div><Label className="text-xs">Top Bar Text</Label><Input className="h-8 text-xs" value={headerConfig?.top_bar?.text || ""} onChange={(e) => setHeaderConfig((p: any) => ({ ...p, top_bar: { ...p?.top_bar, text: e.target.value } }))} /></div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3">Toggles</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={headerConfig?.show_search !== false} onChange={(e) => setHeaderConfig((p: any) => ({ ...p, show_search: e.target.checked }))} />
                      <Label className="text-xs">Show Search Bar</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={headerConfig?.show_categories_bar !== false} onChange={(e) => setHeaderConfig((p: any) => ({ ...p, show_categories_bar: e.target.checked }))} />
                      <Label className="text-xs">Show Categories Navigation Bar</Label>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3">Navigation Links</h4>
                  <div className="space-y-2">
                    {(headerConfig?.nav_links || []).map((link: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-2 border rounded-lg">
                        <Input className="h-7 text-xs flex-1" placeholder="Label" value={link.label} onChange={(e) => {
                          const links = [...(headerConfig?.nav_links || [])];
                          links[i] = { ...links[i], label: e.target.value };
                          setHeaderConfig((p: any) => ({ ...p, nav_links: links }));
                        }} />
                        <Input className="h-7 text-xs flex-1" placeholder="/path" value={link.href} onChange={(e) => {
                          const links = [...(headerConfig?.nav_links || [])];
                          links[i] = { ...links[i], href: e.target.value };
                          setHeaderConfig((p: any) => ({ ...p, nav_links: links }));
                        }} />
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                          const links = [...(headerConfig?.nav_links || [])];
                          links.splice(i, 1);
                          setHeaderConfig((p: any) => ({ ...p, nav_links: links }));
                        }}><X className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => {
                      setHeaderConfig((p: any) => ({ ...p, nav_links: [...(p?.nav_links || []), { label: "", href: "/" }] }));
                    }}><Plus className="h-3 w-3 mr-1" /> Add Link</Button>
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Hero Quick Links</h4>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => saveSiteConfig("hero_quick_links", heroQuickLinks)}>
                      <Save className="h-3 w-3 mr-1" /> Save
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">Homepage banner এর নিচে যে ৩টি বাটন আছে (Free Ship, Flash Sale, Premium) সেগুলো এখান থেকে কন্ট্রোল করুন।</p>
                  <div className="space-y-3">
                    {heroQuickLinks.map((link: any, i: number) => (
                      <div key={i} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-5">{i + 1}.</span>
                          <Input className="h-7 text-xs flex-1" placeholder="Title" value={link.title} onChange={(e) => {
                            const links = [...heroQuickLinks];
                            links[i] = { ...links[i], title: e.target.value };
                            setHeroQuickLinks(links);
                          }} />
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                            const links = [...heroQuickLinks];
                            links.splice(i, 1);
                            setHeroQuickLinks(links);
                          }}><X className="h-3 w-3 text-destructive" /></Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label className="text-[10px]">Subtitle</Label><Input className="h-6 text-[10px]" value={link.subtitle} onChange={(e) => {
                            const links = [...heroQuickLinks];
                            links[i] = { ...links[i], subtitle: e.target.value };
                            setHeroQuickLinks(links);
                          }} /></div>
                          <div><Label className="text-[10px]">Link Path</Label><Input className="h-6 text-[10px]" placeholder="/products" value={link.href} onChange={(e) => {
                            const links = [...heroQuickLinks];
                            links[i] = { ...links[i], href: e.target.value };
                            setHeroQuickLinks(links);
                          }} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">Icon</Label>
                            <Select value={link.icon} onValueChange={(v) => {
                              const links = [...heroQuickLinks];
                              links[i] = { ...links[i], icon: v };
                              setHeroQuickLinks(links);
                            }}>
                              <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["truck", "percent", "crown", "gift", "star", "zap", "tag", "shopping-bag", "heart", "award", "sparkles"].map(ic => (
                                  <SelectItem key={ic} value={ic} className="text-xs">{ic}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px]">Gradient</Label>
                            <Select value={link.color} onValueChange={(v) => {
                              const links = [...heroQuickLinks];
                              links[i] = { ...links[i], color: v };
                              setHeroQuickLinks(links);
                            }}>
                              <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="from-blue-500 to-indigo-600" className="text-xs">Blue</SelectItem>
                                <SelectItem value="from-rose-500 to-pink-600" className="text-xs">Rose</SelectItem>
                                <SelectItem value="from-amber-500 to-orange-600" className="text-xs">Amber</SelectItem>
                                <SelectItem value="from-emerald-500 to-teal-600" className="text-xs">Green</SelectItem>
                                <SelectItem value="from-violet-500 to-purple-600" className="text-xs">Violet</SelectItem>
                                <SelectItem value="from-cyan-500 to-blue-600" className="text-xs">Cyan</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => {
                      setHeroQuickLinks([...heroQuickLinks, { title: "", subtitle: "", icon: "star", color: "from-blue-500 to-indigo-600", href: "/products" }]);
                    }}><Plus className="h-3 w-3 mr-1" /> Add Quick Link</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="footer" className="mt-0 p-4 space-y-5">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Brand</h4>
                  <div className="space-y-3">
                    <div><Label className="text-xs">Footer Logo URL</Label><Input className="h-8 text-xs" value={footerConfig?.logo_url || ""} onChange={(e) => setFooterConfig((p: any) => ({ ...p, logo_url: e.target.value }))} /></div>
                    <div><Label className="text-xs">Brand Description</Label><Textarea className="text-xs min-h-[60px]" value={footerConfig?.brand_description || ""} onChange={(e) => setFooterConfig((p: any) => ({ ...p, brand_description: e.target.value }))} /></div>
                    <div><Label className="text-xs">Copyright Text</Label><Input className="h-8 text-xs" value={footerConfig?.copyright || ""} onChange={(e) => setFooterConfig((p: any) => ({ ...p, copyright: e.target.value }))} /></div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3">Link Columns</h4>
                  {(footerConfig?.columns || []).map((col: any, ci: number) => (
                    <div key={ci} className="mb-4 p-3 border rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <Input className="h-7 text-xs flex-1 font-semibold" value={col.title} onChange={(e) => {
                          const cols = [...(footerConfig?.columns || [])];
                          cols[ci] = { ...cols[ci], title: e.target.value };
                          setFooterConfig((p: any) => ({ ...p, columns: cols }));
                        }} />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          const cols = [...(footerConfig?.columns || [])];
                          cols.splice(ci, 1);
                          setFooterConfig((p: any) => ({ ...p, columns: cols }));
                        }}><X className="h-3 w-3 text-destructive" /></Button>
                      </div>
                      {(col.links || []).map((link: any, li: number) => (
                        <div key={li} className="flex items-center gap-1 ml-2">
                          <Input className="h-6 text-[10px] flex-1" placeholder="Name" value={link.name} onChange={(e) => {
                            const cols = [...(footerConfig?.columns || [])];
                            cols[ci].links[li] = { ...cols[ci].links[li], name: e.target.value };
                            setFooterConfig((p: any) => ({ ...p, columns: cols }));
                          }} />
                          <Input className="h-6 text-[10px] flex-1" placeholder="/path" value={link.href} onChange={(e) => {
                            const cols = [...(footerConfig?.columns || [])];
                            cols[ci].links[li] = { ...cols[ci].links[li], href: e.target.value };
                            setFooterConfig((p: any) => ({ ...p, columns: cols }));
                          }} />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                            const cols = [...(footerConfig?.columns || [])];
                            cols[ci].links.splice(li, 1);
                            setFooterConfig((p: any) => ({ ...p, columns: cols }));
                          }}><X className="h-2.5 w-2.5 text-destructive" /></Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] ml-2" onClick={() => {
                        const cols = [...(footerConfig?.columns || [])];
                        cols[ci].links = [...(cols[ci].links || []), { name: "", href: "/" }];
                        setFooterConfig((p: any) => ({ ...p, columns: cols }));
                      }}><Plus className="h-2.5 w-2.5 mr-1" /> Add Link</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => {
                    setFooterConfig((p: any) => ({ ...p, columns: [...(p?.columns || []), { title: "New Column", links: [] }] }));
                  }}><Plus className="h-3 w-3 mr-1" /> Add Column</Button>
                </div>

                {/* Trust Badges */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Trust Badges</h4>
                  {(footerConfig?.trust_badges || []).map((badge: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 mb-2 p-2 border rounded-lg">
                      <Select value={badge.icon} onValueChange={(v) => {
                        const badges = [...(footerConfig?.trust_badges || [])];
                        badges[i] = { ...badges[i], icon: v };
                        setFooterConfig((p: any) => ({ ...p, trust_badges: badges }));
                      }}>
                        <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["truck", "shield", "headphones", "credit-card"].map((ic) => (
                            <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input className="h-7 text-xs flex-1" placeholder="Title" value={badge.title} onChange={(e) => {
                        const badges = [...(footerConfig?.trust_badges || [])];
                        badges[i] = { ...badges[i], title: e.target.value };
                        setFooterConfig((p: any) => ({ ...p, trust_badges: badges }));
                      }} />
                      <Input className="h-7 text-xs w-20" placeholder="Desc" value={badge.desc} onChange={(e) => {
                        const badges = [...(footerConfig?.trust_badges || [])];
                        badges[i] = { ...badges[i], desc: e.target.value };
                        setFooterConfig((p: any) => ({ ...p, trust_badges: badges }));
                      }} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                        const badges = [...(footerConfig?.trust_badges || [])];
                        badges.splice(i, 1);
                        setFooterConfig((p: any) => ({ ...p, trust_badges: badges }));
                      }}><X className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => {
                    setFooterConfig((p: any) => ({ ...p, trust_badges: [...(p?.trust_badges || []), { icon: "shield", title: "", desc: "" }] }));
                  }}><Plus className="h-3 w-3 mr-1" /> Add Badge</Button>
                </div>

                {/* Social Links */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Social Links</h4>
                  {(footerConfig?.social_links || []).map((social: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 mb-2">
                      <Select value={social.platform} onValueChange={(v) => {
                        const links = [...(footerConfig?.social_links || [])];
                        links[i] = { ...links[i], platform: v };
                        setFooterConfig((p: any) => ({ ...p, social_links: links }));
                      }}>
                        <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["facebook", "twitter", "instagram", "youtube"].map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input className="h-7 text-xs flex-1" placeholder="URL" value={social.url} onChange={(e) => {
                        const links = [...(footerConfig?.social_links || [])];
                        links[i] = { ...links[i], url: e.target.value };
                        setFooterConfig((p: any) => ({ ...p, social_links: links }));
                      }} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                        const links = [...(footerConfig?.social_links || [])];
                        links.splice(i, 1);
                        setFooterConfig((p: any) => ({ ...p, social_links: links }));
                      }}><X className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => {
                    setFooterConfig((p: any) => ({ ...p, social_links: [...(p?.social_links || []), { platform: "facebook", url: "#" }] }));
                  }}><Plus className="h-3 w-3 mr-1" /> Add Social Link</Button>
                </div>

                {/* Payment Methods */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Payment Methods</h4>
                  {(footerConfig?.payment_methods || []).map((method: string, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 mb-2">
                      <Input className="h-7 text-xs flex-1" placeholder="e.g. Visa" value={method} onChange={(e) => {
                        const methods = [...(footerConfig?.payment_methods || [])];
                        methods[i] = e.target.value;
                        setFooterConfig((p: any) => ({ ...p, payment_methods: methods }));
                      }} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                        const methods = [...(footerConfig?.payment_methods || [])];
                        methods.splice(i, 1);
                        setFooterConfig((p: any) => ({ ...p, payment_methods: methods }));
                      }}><X className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => {
                    setFooterConfig((p: any) => ({ ...p, payment_methods: [...(p?.payment_methods || []), ""] }));
                  }}><Plus className="h-3 w-3 mr-1" /> Add Payment Method</Button>
                </div>
              </TabsContent>

              <TabsContent value="navigation" className="mt-0 p-4 space-y-5">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Mobile Bottom Navigation</h4>
                  <div className="space-y-2">
                    {(mobileNavConfig?.tabs || []).map((tab: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 border rounded-lg">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input className="h-7 text-xs w-20" placeholder="Label" value={tab.label} onChange={(e) => {
                          const tabs = [...(mobileNavConfig?.tabs || [])];
                          tabs[i] = { ...tabs[i], label: e.target.value };
                          setMobileNavConfig((p: any) => ({ ...p, tabs }));
                        }} />
                        <Select value={tab.icon} onValueChange={(v) => {
                          const tabs = [...(mobileNavConfig?.tabs || [])];
                          tabs[i] = { ...tabs[i], icon: v };
                          setMobileNavConfig((p: any) => ({ ...p, tabs }));
                        }}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["home", "grid", "shopping-cart", "package", "user", "heart", "search", "bell", "store"].map((icon) => (
                              <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input className="h-7 text-xs flex-1" placeholder="/path" value={tab.href} onChange={(e) => {
                          const tabs = [...(mobileNavConfig?.tabs || [])];
                          tabs[i] = { ...tabs[i], href: e.target.value };
                          setMobileNavConfig((p: any) => ({ ...p, tabs }));
                        }} />
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => {
                          const tabs = [...(mobileNavConfig?.tabs || [])];
                          tabs.splice(i, 1);
                          setMobileNavConfig((p: any) => ({ ...p, tabs }));
                        }}><X className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => {
                      setMobileNavConfig((p: any) => ({ ...p, tabs: [...(p?.tabs || []), { label: "New", icon: "home", href: "/" }] }));
                    }}><Plus className="h-3 w-3 mr-1" /> Add Tab</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="versions" className="mt-0 p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Save Current Snapshot</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Version name" value={versionName} onChange={(e) => setVersionName(e.target.value)} className="flex-1 h-9" />
                    <Button size="sm" onClick={saveVersion}><Save className="h-3 w-3 mr-1" /> Save</Button>
                  </div>
                </div>

                <Separator />

                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No saved versions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v) => (
                      <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium text-sm">{v.name}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(v.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => restoreVersion(v.id)}>
                            <Upload className="h-3 w-3 mr-1" /> Restore
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => deleteVersion(v.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {showPreview && (
            <div className="hidden md:flex flex-1 flex-col bg-muted/30 overflow-hidden">
              <div className="flex items-center justify-center gap-2 p-3 border-b bg-card shrink-0">
                {DEVICE_SIZES.map((d) => (
                  <Button
                    key={d.key}
                    variant={previewDevice === d.key ? "default" : "ghost"}
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setPreviewDevice(d.key as typeof previewDevice)}
                  >
                    <d.icon className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">{d.label}</span>
                  </Button>
                ))}
              </div>

              <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
                <div className="bg-background rounded-xl border shadow-lg overflow-hidden transition-all duration-300 min-h-full" style={{ width: Math.min(previewWidth, 1440) }}>
                  {headerConfig?.top_bar?.visible !== false && (
                    <div className="bg-primary text-primary-foreground px-4 py-1 text-xs">{headerConfig?.top_bar?.text || "Top bar text"}</div>
                  )}

                  <div className="px-4 py-3 border-b bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={headerConfig?.logo_url || "/darzo-logo.png"} alt={headerConfig?.logo_text || "Logo"} className="h-8 w-auto rounded" />
                        <span className="text-sm font-semibold">{headerConfig?.logo_text || "Brand"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {(headerConfig?.nav_links || []).slice(0, 3).map((link: any, i: number) => (
                          <span key={i}>{link.label || "Link"}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 space-y-3 pb-20">
                    {sections.length === 0 ? (
                      <div className="p-8 rounded-xl border border-dashed text-center text-sm text-muted-foreground">
                        No sections. Add your first block.
                      </div>
                    ) : (
                      sections.map((section, index) => sectionPreviewCard(section, index))
                    )}
                  </div>

                  <div className="border-t bg-card px-4 py-4">
                    <p className="text-xs text-muted-foreground mb-2">Footer preview</p>
                    <div className="grid grid-cols-2 gap-3">
                      {(footerConfig?.columns || []).slice(0, 2).map((col: any, i: number) => (
                        <div key={i}>
                          <p className="text-xs font-semibold">{col.title || "Column"}</p>
                          <p className="text-[11px] text-muted-foreground">{col.links?.[0]?.name || "Link"}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {previewDevice === "mobile" && (
                    <div className="fixed bottom-0 left-0 right-0 bg-card border-t px-4 py-2">
                      <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(1, (mobileNavConfig?.tabs || []).length)}, 1fr)` }}>
                        {(mobileNavConfig?.tabs || []).map((tab: any, i: number) => (
                          <div key={i} className="text-center text-[10px] text-muted-foreground">{tab.label || "Tab"}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="left" className="w-[360px] sm:w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Section</SheetTitle>
            <SheetDescription>Add built-in sections or create custom blocks.</SheetDescription>
          </SheetHeader>

          {showBlockEditor ? (
            <div className="mt-4">
              <CustomBlockEditor
                initial={editingBlock}
                onSave={addCustomBlock}
                onCancel={() => {
                  setShowBlockEditor(false);
                  setEditingBlock(undefined);
                }}
              />
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              {hiddenBuiltIns.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Built-in Sections</h4>
                  <div className="space-y-1">
                    {hiddenBuiltIns.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => addBuiltInSection(s.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
                      >
                        <Layout className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{s.label}</p>
                          <p className="text-[10px] text-muted-foreground">{s.id}</p>
                        </div>
                        <Plus className="h-4 w-4 ml-auto text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Create Custom Block</h4>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_TYPES.map((bt) => (
                    <button
                      key={bt.type}
                      onClick={() => {
                        setEditingBlock({ type: bt.type, title: "", config: {} });
                        setShowBlockEditor(true);
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <bt.icon className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium">{bt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={selectedSection !== null} onOpenChange={(open) => !open && setSelectedSectionIndex(null)}>
        <SheetContent side="right" className="w-[420px] sm:w-[460px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Section</SheetTitle>
            <SheetDescription>
              Click, edit text/image/design, and see instant preview updates.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            {selectedSection && selectedSectionIndex !== null && (
              <SectionStyleEditor section={selectedSection} onChange={(updated) => updateSectionConfig(selectedSectionIndex, updated)} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}

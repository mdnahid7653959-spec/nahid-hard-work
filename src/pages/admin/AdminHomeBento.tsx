import { useEffect, useRef, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X, ExternalLink } from "lucide-react";

interface BentoTile {
  id: string;
  label: string;
  visible: boolean;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  link?: string;
}

const DEFAULT_TILES: BentoTile[] = [
  { id: "hero", label: "Main Hero (large gradient)", visible: true, title: "The New Standard", subtitle: "Bangladesh's curated multi-vendor destination for the bold.", link: "/products" },
  { id: "flash", label: "Flash Deals card", visible: true, title: "Flash Deals", subtitle: "Up to 70% Off", link: "/products?filter=flash-sale" },
  { id: "cat_tech", label: "Category: Tech / Gadgets", visible: true, title: "Tech", subtitle: "Gadgets", link: "/categories?c=electronics" },
  { id: "cat_lifestyle", label: "Category: Lifestyle / Fashion", visible: true, title: "Lifestyle", subtitle: "Fashion", link: "/categories?c=fashion" },
  { id: "cat_home", label: "Category: Home / Living", visible: true, title: "Home", subtitle: "Living", link: "/categories?c=home" },
  { id: "cat_beauty", label: "Category: Beauty / Skincare", visible: true, title: "Beauty", subtitle: "Skincare", link: "/categories?c=beauty" },
  { id: "foryou", label: '"For You" personalized panel', visible: true, title: "For You" },
  { id: "trending", label: "Trending spotlight", visible: true },
  { id: "vendors", label: "Multi-Vendor Power banner", visible: true, title: "Multi-Vendor Power", subtitle: "Supporting 1,200+ local artisans and premium global brands across Bangladesh." },
];

function getAdminToken(): string | null {
  try {
    const raw = localStorage.getItem("megamart_admin_session");
    if (raw) return JSON.parse(raw).token || null;
  } catch {}
  return null;
}
function getAdminId(): string | null {
  try {
    const raw = localStorage.getItem("megamart_admin_session");
    if (raw) return JSON.parse(raw).admin?.id || null;
  } catch {}
  return null;
}

async function saveConfig(tiles: BentoTile[]) {
  const token = getAdminToken();
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${baseUrl}/functions/v1/admin-theme?action=save-site-config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": token || "",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ key: "home_bento", value: { tiles } }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Save failed");
}

async function loadConfig(): Promise<BentoTile[] | null> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${baseUrl}/functions/v1/admin-theme?action=site-config&key=home_bento`, {
    headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.value?.tiles ?? null;
}

async function uploadImage(file: File): Promise<string> {
  const adminId = getAdminId();
  if (!adminId) throw new Error("Not authenticated");
  const fd = new FormData();
  fd.append("action", "upload");
  fd.append("adminId", adminId);
  fd.append("file", file);
  const { data, error } = await supabase.functions.invoke("admin-banners", { body: fd });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error || "Upload failed");
  return data.url as string;
}

export default function AdminHomeBento() {
  const [tiles, setTiles] = useState<BentoTile[]>(DEFAULT_TILES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    loadConfig()
      .then((saved) => {
        if (saved && saved.length) {
          // Merge: keep defaults for any missing id
          const merged = DEFAULT_TILES.map((d) => saved.find((s) => s.id === d.id) ?? d);
          setTiles(merged);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const update = (id: string, patch: Partial<BentoTile>) => {
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const handleFile = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      const url = await uploadImage(file);
      update(id, { imageUrl: url });
      toast({ title: "Image uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveConfig(tiles);
      toast({ title: "Home page saved", description: "Changes are live on the storefront." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setTiles(DEFAULT_TILES);
    toast({ title: "Reset to defaults", description: "Click Save to apply." });
  };

  if (loading) {
    return (
      <AdminLayout title="Home Bento Manager">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Home Bento Manager">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Home Page Bento Tiles</h1>
            <p className="text-sm text-muted-foreground">
              Upload banners, edit text, or hide any tile you don't need. Changes apply to the storefront home hero.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetAll}>Reset</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {tiles.map((tile) => (
            <Card key={tile.id} className={!tile.visible ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">{tile.label}</CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`vis-${tile.id}`} className="text-xs text-muted-foreground">
                    {tile.visible ? "Visible" : "Hidden"}
                  </Label>
                  <Switch
                    id={`vis-${tile.id}`}
                    checked={tile.visible}
                    onCheckedChange={(v) => update(tile.id, { visible: v })}
                  />
                </div>
              </CardHeader>
              <CardContent className="grid md:grid-cols-[160px_1fr] gap-4">
                {/* Image preview + upload */}
                <div className="space-y-2">
                  <div className="aspect-square w-full rounded-xl bg-muted overflow-hidden border relative">
                    {tile.imageUrl ? (
                      <>
                        <img src={tile.imageUrl} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => update(tile.id, { imageUrl: undefined })}
                          className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-background"
                          title="Remove image"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center px-2">
                        No banner<br />(default style)
                      </div>
                    )}
                  </div>
                  <input
                    ref={(el) => (fileRefs.current[tile.id] = el)}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(tile.id, f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={uploadingId === tile.id}
                    onClick={() => fileRefs.current[tile.id]?.click()}
                  >
                    {uploadingId === tile.id ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Upload Banner
                  </Button>
                </div>

                {/* Text + link fields */}
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={tile.title ?? ""}
                        onChange={(e) => update(tile.id, { title: e.target.value })}
                        placeholder="Leave blank for default"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Subtitle</Label>
                      <Input
                        value={tile.subtitle ?? ""}
                        onChange={(e) => update(tile.id, { subtitle: e.target.value })}
                        placeholder="Leave blank for default"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      Link URL <ExternalLink className="h-3 w-3" />
                    </Label>
                    <Input
                      value={tile.link ?? ""}
                      onChange={(e) => update(tile.id, { link: e.target.value })}
                      placeholder="/products or full URL"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="sticky bottom-4 flex justify-end">
          <Button size="lg" onClick={handleSave} disabled={saving} className="shadow-lg">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

import { useEffect, useRef, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Upload, Pencil, Eye, EyeOff, Trash2, RotateCcw, Save, Check, Cpu, Shirt,
  Home as HomeIcon, Sparkles, ImagePlus,
} from "lucide-react";

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
  { id: "hero", label: "Main Hero", visible: true, title: "The New Standard", subtitle: "Bangladesh's curated multi-vendor destination for the bold.", link: "/products" },
  { id: "flash", label: "Flash Deals", visible: true, title: "Flash Deals", subtitle: "Up to 70% Off", link: "/products?filter=flash-sale" },
  { id: "cat_tech", label: "Tech", visible: true, title: "Tech", subtitle: "Gadgets", link: "/categories?c=electronics" },
  { id: "cat_lifestyle", label: "Lifestyle", visible: true, title: "Lifestyle", subtitle: "Fashion", link: "/categories?c=fashion" },
  { id: "cat_home", label: "Home", visible: true, title: "Home", subtitle: "Living", link: "/categories?c=home" },
  { id: "cat_beauty", label: "Beauty", visible: true, title: "Beauty", subtitle: "Skincare", link: "/categories?c=beauty" },
  { id: "foryou", label: "For You", visible: true, title: "For You", subtitle: "Personalize Feed" },
  { id: "trending", label: "Trending", visible: true },
  { id: "vendors", label: "Vendors Banner", visible: true, title: "Multi-Vendor Power", subtitle: "Supporting 1,200+ local artisans and premium global brands across Bangladesh." },
];

const CATEGORY_META: Record<string, { bg: string; icon: any }> = {
  cat_tech: { bg: "bg-[#f7931e]", icon: Cpu },
  cat_lifestyle: { bg: "bg-neutral-900", icon: Shirt },
  cat_home: { bg: "bg-[#e84393]", icon: HomeIcon },
  cat_beauty: { bg: "bg-[#6c5ce7]", icon: Sparkles },
};

function getAdminToken() {
  try { return JSON.parse(localStorage.getItem("megamart_admin_session") || "{}").token || null; } catch { return null; }
}
function getAdminId() {
  try { return JSON.parse(localStorage.getItem("megamart_admin_session") || "{}").admin?.id || null; } catch { return null; }
}

async function saveConfig(tiles: BentoTile[]) {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-theme?action=save-site-config`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": getAdminToken() || "",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ key: "home_bento", value: { tiles } }),
    }
  );
  if (!res.ok) throw new Error((await res.json()).error || "Save failed");
}

async function loadConfig(): Promise<BentoTile[] | null> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-theme?action=site-config&key=home_bento`,
    { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
  );
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

/* ---------- Visual editor tile ---------- */

interface TileProps {
  tile: BentoTile;
  className: string;
  onEdit: () => void;
  onUpload: (file: File) => void;
  onToggleVisible: () => void;
  onRemoveImage: () => void;
  uploading: boolean;
  children: React.ReactNode;
}

function EditableTile({ tile, className, onEdit, onUpload, onToggleVisible, onRemoveImage, uploading, children }: TileProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const hidden = !tile.visible;

  return (
    <div className={`group relative ${className} ${hidden ? "opacity-30 grayscale" : ""}`}>
      {children}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-[inherit] z-30 p-2">
        <div className="flex flex-wrap gap-1.5 justify-center">
          <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span className="text-[11px]">Image</span>
          </Button>
          <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            <span className="text-[11px]">Edit</span>
          </Button>
          <Button size="sm" variant={hidden ? "default" : "destructive"} className="h-8 gap-1" onClick={onToggleVisible}>
            {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span className="text-[11px]">{hidden ? "Show" : "Hide"}</span>
          </Button>
        </div>
        {tile.imageUrl && (
          <Button size="sm" variant="ghost" className="h-7 text-white/90 hover:text-white hover:bg-white/10 gap-1" onClick={onRemoveImage}>
            <Trash2 className="h-3 w-3" />
            <span className="text-[10px]">Remove banner</span>
          </Button>
        )}
        <span className="text-[10px] text-white/70 mt-1">{tile.label}</span>
      </div>

      {/* Persistent status dot */}
      {hidden && (
        <div className="absolute top-2 right-2 z-20 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <EyeOff className="h-2.5 w-2.5" /> Hidden
        </div>
      )}
      {tile.imageUrl && !hidden && (
        <div className="absolute top-2 right-2 z-20 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <Check className="h-2.5 w-2.5" /> Banner
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ---------- Main page ---------- */

export default function AdminHomeBento() {
  const [tiles, setTiles] = useState<BentoTile[]>(DEFAULT_TILES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BentoTile | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadConfig()
      .then((saved) => {
        if (saved?.length) {
          setTiles(DEFAULT_TILES.map((d) => saved.find((s) => s.id === d.id) ?? d));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const get = (id: string) => tiles.find((t) => t.id === id)!;
  const update = (id: string, patch: Partial<BentoTile>) => {
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    setDirty(true);
  };
  const handleUpload = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      const url = await uploadImage(file);
      update(id, { imageUrl: url });
      toast({ title: "Banner uploaded" });
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
      setDirty(false);
      toast({ title: "Saved", description: "Home page updated." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };
  const resetAll = () => {
    setTiles(DEFAULT_TILES);
    setDirty(true);
    toast({ title: "Reset to defaults" });
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

  const hero = get("hero");
  const flash = get("flash");
  const foryou = get("foryou");
  const trending = get("trending");
  const vendors = get("vendors");

  return (
    <AdminLayout title="Home Bento Manager">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border rounded-2xl p-4 sticky top-0 z-40">
          <div>
            <h1 className="text-xl font-bold">Visual Bento Editor</h1>
            <p className="text-xs text-muted-foreground">Hover any tile to upload, edit or hide it. Click Save when done.</p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>}
            <Button variant="outline" size="sm" onClick={resetAll}><RotateCcw className="h-4 w-4 mr-1.5" />Reset</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Live bento preview grid — mirrors HeroBento */}
        <div className="bg-muted/30 border rounded-3xl p-4 md:p-6">
          <div className="grid grid-cols-4 auto-rows-[180px] gap-4 font-['Barlow',sans-serif]">
            {/* Hero */}
            <EditableTile
              tile={hero}
              className="col-span-2 row-span-2 rounded-3xl overflow-hidden shadow-lg"
              onEdit={() => setEditing(hero)}
              onUpload={(f) => handleUpload("hero", f)}
              onToggleVisible={() => update("hero", { visible: !hero.visible })}
              onRemoveImage={() => update("hero", { imageUrl: undefined })}
              uploading={uploadingId === "hero"}
            >
              {hero.imageUrl ? (
                <img src={hero.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#6c5ce7] via-[#e84393] to-[#ff6b35]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="relative z-10 h-full flex flex-col justify-end p-5 text-white">
                <p className="text-[10px] uppercase tracking-widest opacity-80 mb-2">Darzo Marketplace</p>
                <h2 className="font-['Bebas_Neue'] text-4xl leading-none">{hero.title}</h2>
                <p className="text-sm mt-2 opacity-90 line-clamp-2">{hero.subtitle}</p>
              </div>
            </EditableTile>

            {/* Flash */}
            <EditableTile
              tile={flash}
              className="col-span-2 row-span-1 rounded-2xl overflow-hidden shadow bg-card border"
              onEdit={() => setEditing(flash)}
              onUpload={(f) => handleUpload("flash", f)}
              onToggleVisible={() => update("flash", { visible: !flash.visible })}
              onRemoveImage={() => update("flash", { imageUrl: undefined })}
              uploading={uploadingId === "flash"}
            >
              {flash.imageUrl && <img src={flash.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />}
              <div className="relative z-10 h-full flex items-center justify-between p-5">
                <div>
                  <p className="text-[10px] text-[#e84393] font-bold uppercase tracking-widest">Ends in 03:59:58</p>
                  <h3 className="font-['Bebas_Neue'] text-3xl mt-1">{flash.title}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{flash.subtitle}</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#ff6b35] to-[#e84393]" />
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#6c5ce7] to-[#e84393]" />
                </div>
              </div>
            </EditableTile>

            {/* Category tiles */}
            {(["cat_tech", "cat_lifestyle", "cat_home", "cat_beauty"] as const).map((id) => {
              const t = get(id);
              const meta = CATEGORY_META[id];
              const Icon = meta.icon;
              return (
                <EditableTile
                  key={id}
                  tile={t}
                  className={`col-span-1 row-span-1 rounded-2xl overflow-hidden shadow ${t.imageUrl ? "" : meta.bg}`}
                  onEdit={() => setEditing(t)}
                  onUpload={(f) => handleUpload(id, f)}
                  onToggleVisible={() => update(id, { visible: !t.visible })}
                  onRemoveImage={() => update(id, { imageUrl: undefined })}
                  uploading={uploadingId === id}
                >
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="relative z-10 h-full flex flex-col justify-between p-4 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="font-['Bebas_Neue'] text-xl leading-none">
                      {t.title}<br />{t.subtitle}
                    </h4>
                  </div>
                </EditableTile>
              );
            })}

            {/* For You */}
            <EditableTile
              tile={foryou}
              className="col-span-1 row-span-2 rounded-3xl overflow-hidden shadow bg-card border"
              onEdit={() => setEditing(foryou)}
              onUpload={(f) => handleUpload("foryou", f)}
              onToggleVisible={() => update("foryou", { visible: !foryou.visible })}
              onRemoveImage={() => update("foryou", { imageUrl: undefined })}
              uploading={uploadingId === "foryou"}
            >
              <div className="relative z-10 h-full p-5">
                <h4 className="font-['Bebas_Neue'] text-2xl">{foryou.title}</h4>
                <div className="space-y-3 mt-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-muted" />
                      <div className="flex-1 space-y-1"><div className="h-2.5 bg-muted rounded w-3/4" /><div className="h-2 bg-muted rounded w-1/3" /></div>
                    </div>
                  ))}
                </div>
              </div>
            </EditableTile>

            {/* Trending */}
            <EditableTile
              tile={trending}
              className="col-span-1 row-span-2 rounded-3xl overflow-hidden shadow bg-neutral-200"
              onEdit={() => setEditing(trending)}
              onUpload={(f) => handleUpload("trending", f)}
              onToggleVisible={() => update("trending", { visible: !trending.visible })}
              onRemoveImage={() => update("trending", { imageUrl: undefined })}
              uploading={uploadingId === "trending"}
            >
              {trending.imageUrl ? (
                <img src={trending.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35] via-[#e84393] to-[#6c5ce7]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <span className="text-[9px] font-bold bg-[#ff6b35] px-2 py-0.5 rounded-full uppercase tracking-widest">Trending</span>
                <h4 className="font-['Bebas_Neue'] text-2xl mt-2 leading-none">{trending.title || "Auto: top product"}</h4>
              </div>
            </EditableTile>

            {/* Vendors */}
            <EditableTile
              tile={vendors}
              className="col-span-2 row-span-1 rounded-3xl overflow-hidden shadow bg-muted/50 border"
              onEdit={() => setEditing(vendors)}
              onUpload={(f) => handleUpload("vendors", f)}
              onToggleVisible={() => update("vendors", { visible: !vendors.visible })}
              onRemoveImage={() => update("vendors", { imageUrl: undefined })}
              uploading={uploadingId === "vendors"}
            >
              {vendors.imageUrl && <img src={vendors.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
              <div className="relative z-10 h-full flex items-center justify-between p-5">
                <div>
                  <h4 className="font-['Bebas_Neue'] text-2xl">{vendors.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-md">{vendors.subtitle}</p>
                </div>
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-4 border-background bg-card" />
                  <div className="w-10 h-10 rounded-full border-4 border-background bg-[#6c5ce7]" />
                  <div className="w-10 h-10 rounded-full border-4 border-background bg-[#e84393]" />
                </div>
              </div>
            </EditableTile>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
          <ImagePlus className="h-3.5 w-3.5" />
          Hover a tile → upload banner, edit text, or hide it. Recommended banner size: 1200×1200 for hero, 800×600 for others.
        </p>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit — {editing?.label}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Leave blank for default"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Subtitle / Description</Label>
                <Textarea
                  value={editing.subtitle ?? ""}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                  rows={2}
                  placeholder="Leave blank for default"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Link URL (when tile is clicked)</Label>
                <Input
                  value={editing.link ?? ""}
                  onChange={(e) => setEditing({ ...editing, link: e.target.value })}
                  placeholder="/products or https://..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (editing) update(editing.id, { title: editing.title, subtitle: editing.subtitle, link: editing.link });
                setEditing(null);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

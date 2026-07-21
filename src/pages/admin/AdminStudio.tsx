import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { defaultSections, type SectionConfig } from "@/hooks/useLayoutConfig";
import {
  Monitor, Tablet, Smartphone, Laptop, Eye, EyeOff, Lock, Unlock,
  GripVertical, Undo2, Redo2, Save, RefreshCw, Pencil, Check, X,
  ChevronUp, ChevronDown, RotateCcw, ExternalLink,
} from "lucide-react";

type Device = "mobile" | "tablet" | "laptop" | "desktop";
const DEVICE_WIDTH: Record<Device, number> = {
  mobile: 390,
  tablet: 768,
  laptop: 1280,
  desktop: 1536,
};
const DEVICE_ICON: Record<Device, typeof Monitor> = {
  mobile: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  desktop: Monitor,
};

interface StudioSection extends SectionConfig {
  locked?: boolean;
}

const MAX_HISTORY = 40;

export default function AdminStudio() {
  const [sections, setSections] = useState<StudioSection[]>([]);
  const [history, setHistory] = useState<StudioSection[][]>([]);
  const [future, setFuture] = useState<StudioSection[][]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [iframeKey, setIframeKey] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);

  const autosaveRef = useRef<number | null>(null);

  // Load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("layout_config")
        .select("sections")
        .eq("page", "homepage")
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load layout");
        setSections(defaultSections);
      } else {
        const arr = (data?.sections as unknown as StudioSection[] | null);
        setSections(arr && arr.length ? [...arr].sort((a, b) => a.order - b.order) : defaultSections);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Warn on unload if dirty
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const commit = useCallback((updater: (prev: StudioSection[]) => StudioSection[]) => {
    setSections(prev => {
      const next = updater(prev).map((s, i) => ({ ...s, order: i }));
      setHistory(h => [...h.slice(-MAX_HISTORY + 1), prev]);
      setFuture([]);
      setDirty(true);
      return next;
    });
  }, []);

  const undo = () => {
    setHistory(h => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture(f => [sections, ...f].slice(0, MAX_HISTORY));
      setSections(prev);
      setDirty(true);
      return h.slice(0, -1);
    });
  };
  const redo = () => {
    setFuture(f => {
      if (!f.length) return f;
      const next = f[0];
      setHistory(h => [...h, sections].slice(-MAX_HISTORY));
      setSections(next);
      setDirty(true);
      return f.slice(1);
    });
  };

  // Autosave (debounced 1.8s)
  useEffect(() => {
    if (!dirty || loading) return;
    if (autosaveRef.current) window.clearTimeout(autosaveRef.current);
    autosaveRef.current = window.setTimeout(() => { void doSave(true); }, 1800);
    return () => { if (autosaveRef.current) window.clearTimeout(autosaveRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, dirty]);

  const doSave = async (isAuto = false) => {
    setSaving(true);
    const payload = sections.map((s, i) => ({ ...s, order: i }));
    const { error } = await supabase
      .from("layout_config")
      .upsert({ page: "homepage", sections: payload as any }, { onConflict: "page" });
    setSaving(false);
    if (error) {
      toast.error(isAuto ? "Autosave failed" : "Save failed", { description: error.message });
      return;
    }
    setLastSaved(new Date());
    setDirty(false);
    if (!isAuto) toast.success("Saved");
    // refresh preview
    setIframeKey(k => k + 1);
  };

  const selected = useMemo(
    () => sections.find(s => s.id === selectedId) ?? null,
    [sections, selectedId]
  );

  const updateSelected = (patch: Partial<StudioSection>) => {
    if (!selectedId) return;
    commit(prev => prev.map(s => s.id === selectedId ? { ...s, ...patch } : s));
  };

  const toggleVisible = (id: string) => commit(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  const toggleLocked = (id: string) => commit(prev => prev.map(s => s.id === id ? { ...s, locked: !s.locked } : s));
  const moveSection = (id: string, dir: -1 | 1) => {
    commit(prev => {
      const i = prev.findIndex(s => s.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    commit(prev => {
      const from = prev.findIndex(s => s.id === dragId);
      const to = prev.findIndex(s => s.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDragId(null);
  };
  const resetSection = (id: string) => {
    const def = defaultSections.find(s => s.id === id);
    if (!def) { toast.info("No default for this section"); return; }
    commit(prev => prev.map(s => s.id === id ? { ...def } : s));
    toast.success("Section reset to defaults");
  };
  const startRename = (s: StudioSection) => { setRenamingId(s.id); setRenameValue(s.label); };
  const commitRename = () => {
    if (!renamingId) return;
    const v = renameValue.trim();
    if (v) commit(prev => prev.map(s => s.id === renamingId ? { ...s, label: v } : s));
    setRenamingId(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void doSave(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  return (
    <AdminLayout title="Theme Studio">
      <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 sm:-m-6">
        {/* Toolbar */}
        <div className="border-b bg-card px-3 py-2 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={undo} disabled={!history.length} title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></Button>
            <Button size="sm" variant="ghost" onClick={redo} disabled={!future.length} title="Redo (Ctrl+Shift+Z)"><Redo2 className="w-4 h-4" /></Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            {(Object.keys(DEVICE_WIDTH) as Device[]).map(d => {
              const Icon = DEVICE_ICON[d];
              return (
                <Button key={d} size="sm" variant={device === d ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => setDevice(d)} title={`${d} (${DEVICE_WIDTH[d]}px)`}>
                  <Icon className="w-4 h-4" />
                </Button>
              );
            })}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">{DEVICE_WIDTH[device]}px</span>
          <div className="flex-1" />
          <div className="text-xs text-muted-foreground">
            {saving ? "Saving…" : dirty ? "Unsaved changes" : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "Ready"}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setIframeKey(k => k + 1)} title="Refresh preview"><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" variant="outline" asChild><a href="/" target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-1" />Open</a></Button>
          <Button size="sm" onClick={() => void doSave(false)} disabled={saving || !dirty}><Save className="w-4 h-4 mr-1" />Save</Button>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-[260px_1fr_320px] min-h-0">
          {/* Layer Panel */}
          <div className="border-r bg-muted/20 overflow-y-auto">
            <div className="p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layers</div>
            {loading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="space-y-0.5 px-2 pb-4">
                {sections.map((s, i) => {
                  const active = s.id === selectedId;
                  return (
                    <div
                      key={s.id}
                      draggable={!s.locked}
                      onDragStart={() => setDragId(s.id)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => dropOn(s.id)}
                      onClick={() => setSelectedId(s.id)}
                      className={`group flex items-center gap-1 rounded-md px-1.5 py-1.5 text-sm cursor-pointer border ${
                        active ? "bg-primary/10 border-primary/40" : "border-transparent hover:bg-accent"
                      } ${!s.visible ? "opacity-60" : ""}`}
                    >
                      <GripVertical className={`w-3.5 h-3.5 text-muted-foreground ${s.locked ? "opacity-30" : "cursor-grab"}`} />
                      {renamingId === s.id ? (
                        <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} className="h-6 text-xs" autoFocus onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingId(null); }} />
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={commitRename}><Check className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setRenamingId(null)}><X className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <span className="flex-1 truncate" onDoubleClick={() => startRename(s)}>{s.label}</span>
                      )}
                      <div className="hidden group-hover:flex items-center gap-0.5">
                        <button className="p-1 hover:bg-background rounded" title="Move up" onClick={e => { e.stopPropagation(); moveSection(s.id, -1); }} disabled={i === 0}><ChevronUp className="w-3 h-3" /></button>
                        <button className="p-1 hover:bg-background rounded" title="Move down" onClick={e => { e.stopPropagation(); moveSection(s.id, 1); }} disabled={i === sections.length - 1}><ChevronDown className="w-3 h-3" /></button>
                        <button className="p-1 hover:bg-background rounded" title="Rename" onClick={e => { e.stopPropagation(); startRename(s); }}><Pencil className="w-3 h-3" /></button>
                      </div>
                      <button className="p-1 hover:bg-background rounded" title={s.visible ? "Hide" : "Show"} onClick={e => { e.stopPropagation(); toggleVisible(s.id); }}>
                        {s.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                      <button className="p-1 hover:bg-background rounded" title={s.locked ? "Unlock" : "Lock"} onClick={e => { e.stopPropagation(); toggleLocked(s.id); }}>
                        {s.locked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-3 py-2 border-t text-[11px] text-muted-foreground">
              Drag to reorder · Double-click to rename
            </div>
          </div>

          {/* Preview */}
          <div className="bg-[hsl(var(--muted))]/40 overflow-auto flex items-start justify-center p-4">
            <div
              className="bg-background shadow-2xl rounded-lg overflow-hidden border transition-all"
              style={{ width: `min(100%, ${DEVICE_WIDTH[device]}px)`, height: "calc(100vh - 10rem)" }}
            >
              <iframe
                key={iframeKey}
                src="/"
                title="Storefront preview"
                className="w-full h-full border-0"
              />
            </div>
          </div>

          {/* Inspector */}
          <div className="border-l bg-card overflow-y-auto">
            <div className="p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b">Inspector</div>
            {!selected ? (
              <div className="p-4 text-sm text-muted-foreground">Select a layer to edit its settings.</div>
            ) : (
              <div className="p-3 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{selected.label}</div>
                      <div className="text-[11px] text-muted-foreground">id: {selected.id}</div>
                    </div>
                    <Badge variant={selected.visible ? "default" : "secondary"}>{selected.visible ? "Visible" : "Hidden"}</Badge>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Label</label>
                  <Input value={selected.label} onChange={e => updateSelected({ label: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleVisible(selected.id)}>
                    {selected.visible ? <><EyeOff className="w-4 h-4 mr-1" />Hide</> : <><Eye className="w-4 h-4 mr-1" />Show</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleLocked(selected.id)}>
                    {selected.locked ? <><Unlock className="w-4 h-4 mr-1" />Unlock</> : <><Lock className="w-4 h-4 mr-1" />Lock</>}
                  </Button>
                </div>
                {selected.responsiveGrid && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Columns per device</div>
                      {(["mobile", "tablet", "desktop"] as const).map(k => (
                        <div key={k} className="flex items-center gap-2">
                          <span className="text-xs w-16 capitalize">{k}</span>
                          <Input
                            type="number" min={1} max={12}
                            value={selected.responsiveGrid?.[k] ?? 2}
                            onChange={e => updateSelected({
                              responsiveGrid: { ...(selected.responsiveGrid ?? { mobile: 2, tablet: 3, desktop: 6 }), [k]: Math.max(1, Math.min(12, Number(e.target.value) || 1)) },
                            })}
                            className="h-8"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <Separator />
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Style</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground">Padding</label>
                      <Input placeholder="1rem" value={selected.style?.padding ?? ""} onChange={e => updateSelected({ style: { ...selected.style, padding: e.target.value } })} className="h-8" />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Margin</label>
                      <Input placeholder="0" value={selected.style?.margin ?? ""} onChange={e => updateSelected({ style: { ...selected.style, margin: e.target.value } })} className="h-8" />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Radius</label>
                      <Input placeholder="0.75rem" value={selected.style?.borderRadius ?? ""} onChange={e => updateSelected({ style: { ...selected.style, borderRadius: e.target.value } })} className="h-8" />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Shadow</label>
                      <Input placeholder="0 2px 8px rgba(0,0,0,.06)" value={selected.style?.shadow ?? ""} onChange={e => updateSelected({ style: { ...selected.style, shadow: e.target.value } })} className="h-8" />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Background</label>
                      <Input type="color" value={selected.style?.backgroundColor ?? "#ffffff"} onChange={e => updateSelected({ style: { ...selected.style, backgroundColor: e.target.value } })} className="h-8 p-1" />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Text</label>
                      <Input type="color" value={selected.style?.textColor ?? "#000000"} onChange={e => updateSelected({ style: { ...selected.style, textColor: e.target.value } })} className="h-8 p-1" />
                    </div>
                  </div>
                </div>
                <Separator />
                <Button size="sm" variant="ghost" className="w-full text-destructive" onClick={() => resetSection(selected.id)}>
                  <RotateCcw className="w-4 h-4 mr-1" />Reset Section to Default
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

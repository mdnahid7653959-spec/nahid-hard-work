import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface SupportTicketRow {
  id: string;
  seller_id: string;
  subject: string;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  seller_unread_count: number;
  staff_unread_count: number;
  shop_name?: string;
  shop_logo?: string;
}

interface Props {
  perspective: "staff" | "admin";
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SupportTicketList({ perspective, selectedId, onSelect }: Props) {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("seller_support_tickets")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    const ids = Array.from(new Set((rows || []).map((r) => r.seller_id)));
    let sellersMap = new Map<string, any>();
    if (ids.length) {
      const { data: sellers } = await supabase.from("sellers").select("id, shop_name, shop_logo").in("id", ids);
      sellersMap = new Map((sellers || []).map((s) => [s.id, s]));
    }
    setTickets((rows || []).map((r) => ({
      ...r,
      shop_name: sellersMap.get(r.seller_id)?.shop_name,
      shop_logo: sellersMap.get(r.seller_id)?.shop_logo,
    })) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("support-tickets-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "seller_support_tickets" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = tickets.filter((t) =>
    !q || (t.shop_name || "").toLowerCase().includes(q.toLowerCase()) || (t.last_message_preview || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <h2 className="font-semibold">Seller Support</h2>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shops…" className="pl-8 h-9" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No support tickets</p>
          </div>
        ) : (
          filtered.map((t) => {
            const unread = perspective === "staff" ? t.staff_unread_count : 0;
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className={cn("w-full p-3 text-left border-b hover:bg-muted/50 transition", selectedId === t.id && "bg-muted")}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    {t.shop_logo ? <img src={t.shop_logo} alt="" className="h-full w-full object-cover" /> : (
                      <AvatarFallback className="bg-primary/10 text-primary">{(t.shop_name || "S")[0].toUpperCase()}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{t.shop_name || "Unknown Shop"}</p>
                      {unread > 0 && <Badge className="h-5 min-w-[20px] text-xs">{unread}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{t.last_message_preview || "No messages yet"}</p>
                    {t.last_message_at && <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(t.last_message_at), "dd MMM, h:mm a")}</p>}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
}

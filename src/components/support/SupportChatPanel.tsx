import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Paperclip, Send, Mic, Square, Loader2, MessageSquare, FileText, Image as ImageIcon, Play, Pause, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface SupportAttachment {
  url: string;
  path: string;
  type: string; // mime
  kind: "image" | "audio" | "file";
  name: string;
  size: number;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: "seller" | "staff" | "admin";
  sender_id: string;
  sender_name: string | null;
  content: string | null;
  attachments: SupportAttachment[];
  created_at: string;
  read_at: string | null;
}

interface Props {
  ticketId: string;
  senderType: "seller" | "staff" | "admin";
  senderId: string;
  senderName: string;
  readOnly?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  onBack?: () => void;
}

async function uploadFile(file: File, ticketId: string): Promise<SupportAttachment> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("seller-support").upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  const { data: signed } = await supabase.storage.from("seller-support").createSignedUrl(path, 60 * 60 * 24 * 365);
  const kind: SupportAttachment["kind"] = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("audio/")
    ? "audio"
    : "file";
  return { url: signed?.signedUrl || "", path, type: file.type, kind, name: file.name, size: file.size };
}

function AttachmentView({ att }: { att: SupportAttachment }) {
  if (att.kind === "image") {
    return (
      <a href={att.url} target="_blank" rel="noreferrer" className="block">
        <img src={att.url} alt={att.name} className="max-h-56 rounded-lg object-cover" />
      </a>
    );
  }
  if (att.kind === "audio") {
    return <audio controls src={att.url} className="max-w-full" />;
  }
  return (
    <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border p-2 bg-background/50 hover:bg-muted transition">
      <FileText className="h-4 w-4 shrink-0" />
      <span className="text-xs truncate">{att.name}</span>
    </a>
  );
}

export function SupportChatPanel({ ticketId, senderType, senderId, senderName, readOnly, headerTitle, headerSubtitle, onBack }: Props) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("seller_support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (!cancel) {
        setMessages((data || []) as any);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [ticketId]);

  useEffect(() => {
    const channel = supabase
      .channel(`support-${ticketId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "seller_support_messages", filter: `ticket_id=eq.${ticketId}` }, (payload) => {
        setMessages((m) => (m.some((x) => x.id === (payload.new as any).id) ? m : [...m, payload.new as any]));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark opposite messages as read
  useEffect(() => {
    if (!messages.length) return;
    const unread = messages.filter((m) => !m.read_at && m.sender_type !== senderType).map((m) => m.id);
    if (unread.length) {
      supabase.from("seller_support_messages").update({ read_at: new Date().toISOString() }).in("id", unread).then();
      // Reset unread counter on ticket
      const patch = senderType === "seller"
        ? { seller_unread_count: 0 }
        : { staff_unread_count: 0 };
      supabase.from("seller_support_tickets").update(patch).eq("id", ticketId).then();
    }
  }, [messages, senderType, ticketId]);

  const send = async () => {
    if (readOnly) return;
    if (!text.trim() && pendingFiles.length === 0) return;
    setSending(true);
    try {
      const uploads: SupportAttachment[] = [];
      for (const f of pendingFiles) uploads.push(await uploadFile(f, ticketId));
      const preview = text.trim() || (uploads[0]?.kind === "image" ? "📷 Photo" : uploads[0]?.kind === "audio" ? "🎤 Voice message" : uploads[0] ? `📎 ${uploads[0].name}` : "");
      const { error } = await supabase.from("seller_support_messages").insert({
        ticket_id: ticketId,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        content: text.trim() || null,
        attachments: uploads as any,
      });
      if (error) throw error;
      const counterPatch = senderType === "seller"
        ? { staff_unread_count: (undefined as any) }
        : { seller_unread_count: (undefined as any) };
      // fetch current and increment
      const { data: t } = await supabase.from("seller_support_tickets").select("staff_unread_count,seller_unread_count").eq("id", ticketId).single();
      const updates: any = { last_message_at: new Date().toISOString(), last_message_preview: preview.slice(0, 120), status: "open" };
      if (senderType === "seller") updates.staff_unread_count = (t?.staff_unread_count || 0) + 1;
      else updates.seller_unread_count = (t?.seller_unread_count || 0) + 1;
      await supabase.from("seller_support_tickets").update(updates).eq("id", ticketId);
      setText("");
      setPendingFiles([]);
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        setPendingFiles((p) => [...p, file]);
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };
  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-3 border-b flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
            <X className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary">{(headerTitle || "S")[0].toUpperCase()}</AvatarFallback></Avatar>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{headerTitle || "Support"}</p>
          {headerSubtitle && <p className="text-xs text-muted-foreground truncate">{headerSubtitle}</p>}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 bg-muted/20">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">Start the conversation</p>
            <p className="text-muted-foreground text-xs">Send text, images, voice notes, or documents.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => {
              const isMine = m.sender_type === senderType;
              return (
                <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 space-y-1.5", isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border rounded-bl-md")}>
                    {!isMine && m.sender_name && <p className="text-[10px] font-semibold opacity-70">{m.sender_name} · {m.sender_type}</p>}
                    {(m.attachments || []).map((a, i) => (<div key={i}><AttachmentView att={a} /></div>))}
                    {m.content && <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>}
                    <p className={cn("text-[10px]", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {format(new Date(m.created_at), "h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>

      {!readOnly && (
        <div className="border-t p-2 space-y-2 bg-card">
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {pendingFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
                  {f.type.startsWith("image/") ? <ImageIcon className="h-3 w-3" /> : f.type.startsWith("audio/") ? <Mic className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <button onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setPendingFiles((p) => [...p, ...files]);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={sending}>
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant={recording ? "destructive" : "ghost"}
              size="icon"
              onClick={recording ? stopRecording : startRecording}
              disabled={sending}
            >
              {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={recording ? "Recording…" : "Type a message"}
              className="flex-1"
              disabled={sending}
            />
            <Button type="submit" size="icon" disabled={sending || (!text.trim() && pendingFiles.length === 0)}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

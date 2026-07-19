import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  last_message_at: string | null;
  buyer_unread_count: number | null;
  seller_unread_count: number | null;
  created_at: string;
  seller_name?: string;
  product_name?: string;
  last_message?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  is_read: boolean | null;
  created_at: string;
}

export default function BuyerMessages() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(conversationId || null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all conversations for buyer
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ["buyer-conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("buyer_id", user.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (conv) => {
          // Get seller shop name
          const { data: sellerData } = await supabase
            .from("sellers")
            .select("shop_name")
            .eq("id", conv.seller_id)
            .single();

          let product_name: string | undefined;
          if (conv.product_id) {
            const { data: prod } = await supabase
              .from("products")
              .select("name")
              .eq("id", conv.product_id)
              .single();
            product_name = prod?.name;
          }

          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            seller_name: sellerData?.shop_name || "Seller",
            product_name,
            last_message: lastMsg?.content,
          } as Conversation;
        })
      );

      return enriched;
    },
    enabled: !!user?.id,
  });

  const selectedConv = conversations.find((c) => c.id === selectedConvId) || null;

  // Fetch messages
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["conversation-messages", selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConvId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConvId,
  });

  // Mark as read
  useEffect(() => {
    if (!selectedConvId || !user?.id) return;
    supabase.from("conversations").update({ buyer_unread_count: 0 }).eq("id", selectedConvId).then();
    supabase.from("messages").update({ is_read: true }).eq("conversation_id", selectedConvId).eq("sender_type", "seller").eq("is_read", false).then();
  }, [selectedConvId, user?.id]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime
  useEffect(() => {
    if (!selectedConvId) return;
    const channel = supabase
      .channel(`buyer-messages-${selectedConvId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConvId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConvId] });
        queryClient.invalidateQueries({ queryKey: ["buyer-conversations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvId, queryClient]);

  // Send message
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConvId || !user?.id) throw new Error("Missing data");
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConvId,
        sender_id: user.id,
        sender_type: "buyer",
        content,
      });
      if (error) throw error;
      // Increment seller's unread count
      const currentSellerUnread = selectedConv?.seller_unread_count ?? 0;
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString(), seller_unread_count: (typeof currentSellerUnread === 'number' ? currentSellerUnread : 0) + 1 }).eq("id", selectedConvId);
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ["buyer-conversations"] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessage.mutate(messageText.trim());
  };

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-4 pb-20 md:pb-4">
        <div className="flex h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-card">
          {/* Conversation List */}
          <div className={cn("w-full md:w-80 border-r flex flex-col", selectedConvId ? "hidden md:flex" : "flex")}>
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg">Messages</h2>
              <p className="text-sm text-muted-foreground">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>
            </div>
            <ScrollArea className="flex-1">
              {loadingConversations ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-8 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">No messages yet</p>
                  <p className="text-muted-foreground text-xs">Start a conversation from a product page</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={cn("w-full p-4 text-left border-b hover:bg-muted/50 transition-colors", selectedConvId === conv.id && "bg-muted")}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary">{(conv.seller_name || "S")[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{conv.seller_name}</p>
                          {(conv.buyer_unread_count || 0) > 0 && (
                            <Badge variant="default" className="ml-2 h-5 min-w-[20px] text-xs">{conv.buyer_unread_count}</Badge>
                          )}
                        </div>
                        {conv.product_name && <p className="text-xs text-primary truncate">Re: {conv.product_name}</p>}
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message || "No messages yet"}</p>
                        {conv.last_message_at && <p className="text-xs text-muted-foreground mt-1">{format(new Date(conv.last_message_at), "dd MMM, h:mm a")}</p>}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={cn("flex-1 flex flex-col", !selectedConvId ? "hidden md:flex" : "flex")}>
            {selectedConv ? (
              <>
                <div className="p-4 border-b flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConvId(null)}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary">{(selectedConv.seller_name || "S")[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{selectedConv.seller_name}</p>
                    {selectedConv.product_name && <p className="text-xs text-muted-foreground">About: {selectedConv.product_name}</p>}
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {loadingMessages ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 p-8 text-center">
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground text-sm">Start the conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => {
                        const isBuyer = msg.sender_type === "buyer";
                        return (
                          <div key={msg.id} className={cn("flex", isBuyer ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5", isBuyer ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md")}>
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              <p className={cn("text-[10px] mt-1", isBuyer ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                {format(new Date(msg.created_at), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
                  <Input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type a message..." className="flex-1" />
                  <Button type="submit" size="icon" disabled={!messageText.trim() || sendMessage.isPending}>
                    {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg">Select a conversation</h3>
                <p className="text-muted-foreground text-sm mt-1">Choose a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

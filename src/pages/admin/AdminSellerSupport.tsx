import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SupportTicketList } from "@/components/support/SupportTicketList";
import { SupportChatPanel } from "@/components/support/SupportChatPanel";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSellerSupport() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <AdminLayout title="Seller Support">
      <div className="flex h-[calc(100vh-160px)] border rounded-lg overflow-hidden bg-card">
        <div className={cn("w-full md:w-80 border-r flex flex-col", selected ? "hidden md:flex" : "flex")}>
          <SupportTicketList perspective="admin" selectedId={selected} onSelect={setSelected} />
        </div>
        <div className={cn("flex-1 flex flex-col", !selected ? "hidden md:flex" : "flex")}>
          {selected && user ? (
            <SupportChatPanel
              ticketId={selected}
              senderType="admin"
              senderId={user.id}
              senderName="Admin"
              headerTitle="Seller ↔ Staff Conversation"
              headerSubtitle="Full read/write monitoring"
              onBack={() => setSelected(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg">Monitor Seller Support</h3>
              <p className="text-muted-foreground text-sm mt-1">See every conversation between sellers and staff. You can also reply directly.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

import { useEffect, useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Card } from "@/components/ui/card";

export default function StaffMessages() {
  const { staff } = useStaff();
  const [msgs, setMsgs] = useState<any[]>([]);
  useEffect(() => {
    if (!staff) return;
    (async () => {
      const { data } = await supabase.from("staff_messages").select("*").eq("to_staff_id", staff.id).order("created_at", { ascending: false });
      setMsgs(data || []);
      const unread = (data || []).filter((m) => !m.read_at).map((m) => m.id);
      if (unread.length) await supabase.from("staff_messages").update({ read_at: new Date().toISOString() }).in("id", unread);
    })();
  }, [staff?.id]);

  return (
    <StaffLayout>
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      {msgs.length === 0 ? <p className="text-muted-foreground">No messages.</p> : (
        <div className="space-y-3">
          {msgs.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{m.subject}</h3>
                <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm mt-2 whitespace-pre-wrap">{m.body}</p>
            </Card>
          ))}
        </div>
      )}
    </StaffLayout>
  );
}

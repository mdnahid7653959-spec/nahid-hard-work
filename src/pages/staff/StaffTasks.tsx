import { useEffect, useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function StaffTasks() {
  const { staff } = useStaff();
  const [tasks, setTasks] = useState<any[]>([]);

  const load = async () => {
    if (!staff) return;
    const { data } = await supabase.from("staff_tasks").select("*").eq("staff_id", staff.id).order("created_at", { ascending: false });
    setTasks(data || []);
  };
  useEffect(() => { load(); }, [staff?.id]);

  const update = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "done") patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("staff_tasks").update(patch).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Updated" });
    load();
  };

  return (
    <StaffLayout>
      <h1 className="text-2xl font-bold mb-4">My Tasks</h1>
      {tasks.length === 0 ? (
        <p className="text-muted-foreground">No tasks assigned yet.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{t.title}</h3>
                    <Badge variant={t.priority === "high" ? "destructive" : "secondary"}>{t.priority}</Badge>
                    <Badge variant="outline">{t.status}</Badge>
                    {t.due_date && <span className="text-xs text-muted-foreground">Due {t.due_date}</span>}
                  </div>
                  {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
                </div>
                <div className="flex gap-2">
                  {t.status !== "in_progress" && t.status !== "done" && (
                    <Button size="sm" variant="outline" onClick={() => update(t.id, "in_progress")}>Start</Button>
                  )}
                  {t.status !== "done" && (
                    <Button size="sm" onClick={() => update(t.id, "done")}>Mark done</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </StaffLayout>
  );
}

import { useState } from "react";
import {
  useListSessions,
  useGetActiveSession,
  useCreateSession,
  useEndSession,
  useDeleteSession,
  useExportSession,
  getListSessionsQueryKey,
  getGetActiveSessionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function ExportButton({ sessionId }: { sessionId: number }) {
  const { toast } = useToast();
  const [showExport, setShowExport] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: exportData, isFetching, refetch } = useExportSession(sessionId, { query: { enabled: false } as any });

  const handleExport = async () => {
    try {
      await refetch();
      setShowExport(true);
    } catch {
      toast({ title: "匯出失敗", variant: "destructive" });
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground"
        onClick={handleExport}
        disabled={isFetching}
        data-testid={`btn-export-session-${sessionId}`}
      >
        {isFetching ? "讀取中..." : "匯出"}
      </Button>
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="glass-card border-border/50 max-w-lg">
          <DialogHeader>
            <DialogTitle>曲目清單匯出</DialogTitle>
          </DialogHeader>
          {exportData && (
            <>
              <p className="text-xs text-muted-foreground">{exportData.songCount} 首歌曲</p>
              <pre className="bg-background/50 rounded-lg p-4 text-sm text-foreground font-mono border border-border/50 whitespace-pre-wrap max-h-72 overflow-y-auto">
                {exportData.text}
              </pre>
              <Button
                variant="outline"
                onClick={() => { navigator.clipboard.writeText(exportData.text); toast({ title: "已複製到剪貼板" }); }}
                data-testid="btn-copy-export"
              >
                複製文字
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function SessionsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessionsData, isLoading } = useListSessions();
  const { data: activeData } = useGetActiveSession();
  const createSession = useCreateSession();
  const endSession = useEndSession();
  const deleteSession = useDeleteSession();

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await createSession.mutateAsync({ data: { title: newTitle.trim(), description: newDesc.trim() || undefined } });
      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
      toast({ title: "歌回已建立", description: newTitle });
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
    } catch {
      toast({ title: "建立失敗", variant: "destructive" });
    }
  };

  const handleEnd = async (id: number) => {
    if (!window.confirm("確定要結束此歌回嗎？")) return;
    try {
      await endSession.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
      toast({ title: "歌回已結束" });
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? "操作失敗";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("確定要刪除此歌回嗎？刪除後無法復原。")) return;
    try {
      await deleteSession.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      toast({ title: "歌回已刪除" });
    } catch {
      toast({ title: "刪除失敗", variant: "destructive" });
    }
  };

  const sessions = sessionsData?.sessions ?? [];

  const formatDate = (d: string) => new Date(d).toLocaleDateString("zh-TW", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">歌回管理</h2>
          <p className="text-muted-foreground text-sm mt-1">管理每次直播歌回的曲目記錄</p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-foreground"
          data-testid="btn-create-session"
        >
          建立新歌回
        </Button>
      </div>

      {activeData?.session && (
        <Card className="glass-card p-4 border-primary/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <div className="pl-3 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs font-bold tracking-widest text-primary uppercase">進行中</span>
              </div>
              <p className="font-semibold text-foreground mt-1">{activeData.session.title}</p>
              {activeData.session.description && (
                <p className="text-xs text-muted-foreground">{activeData.session.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                開始：{formatDate(activeData.session.startedAt ?? "")}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <ExportButton sessionId={activeData.session.id} />
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => handleEnd(activeData.session!.id)}
                data-testid={`btn-end-${activeData.session.id}`}
              >
                結束歌回
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="glass-card p-10 text-center text-muted-foreground border-dashed">
          尚無歌回記錄，點擊「建立新歌回」開始
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id} className="glass-card p-4" data-testid={`session-card-${s.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{s.title}</span>
                    {s.isActive && (
                      <Badge className="text-[10px] px-1.5 h-4 bg-primary/20 text-primary border-primary/30">進行中</Badge>
                    )}
                  </div>
                  {s.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  )}
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>開始：{formatDate(s.startedAt ?? "")}</span>
                    {s.endedAt && <span>結束：{formatDate(s.endedAt)}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <ExportButton sessionId={s.id} />
                  {!s.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(s.id)}
                      data-testid={`btn-delete-session-${s.id}`}
                    >
                      刪除
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle>建立新歌回</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-widest">歌回名稱</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例：2026/06/18 歌回"
                className="bg-background/50 border-border/50"
                data-testid="input-session-title"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-widest">描述（選填）</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="本次歌回的主題或備注"
                className="bg-background/50 border-border/50 resize-none"
                rows={2}
                data-testid="textarea-session-desc"
              />
            </div>
            <Button
              className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-foreground"
              onClick={handleCreate}
              disabled={!newTitle.trim() || createSession.isPending}
              data-testid="btn-confirm-create-session"
            >
              {createSession.isPending ? "建立中..." : "建立並開始"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListQueue,
  getListQueueQueryKey,
  useRemoveFromQueue,
  useCompleteQueueItem,
  useReorderQueue,
  useSetQueueItemPlaying,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, CheckCircle2, Mic2, ArrowUp, ArrowDown, RefreshCw, Music } from "lucide-react";

export default function AdminQueue() {
  const queryClient = useQueryClient();
  const { data: queueData, isLoading } = useListQueue();
  const removeFromQueue = useRemoveFromQueue();
  const completeItem = useCompleteQueueItem();
  const reorderQueue = useReorderQueue();
  const setPlaying = useSetQueueItemPlaying();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getListQueueQueryKey() });
    }, 8000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListQueueQueryKey() });

  const handleSetPlaying = (id: number) => {
    setPlaying.mutate({ id }, {
      onSuccess: () => {
        toast.success("已設為現正演唱");
        invalidate();
      },
      onError: () => toast.error("操作失敗"),
    });
  };

  const handleComplete = (id: number, title?: string) => {
    completeItem.mutate({ id }, {
      onSuccess: () => {
        toast.success(`「${title ?? "歌曲"}」完唱！已記錄至演唱紀錄`);
        invalidate();
      },
      onError: () => toast.error("操作失敗"),
    });
  };

  const handleRemove = (id: number) => {
    if (!confirm("確定要從佇列中移除嗎？")) return;
    removeFromQueue.mutate({ id }, {
      onSuccess: () => { toast.success("已移除"); invalidate(); },
      onError: () => toast.error("移除失敗"),
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!queueData?.items) return;
    const waitingItems = queueData.items.filter(i => i.status === 'waiting');
    const waitingIndex = waitingItems.findIndex(i => i.id === queueData.items[index].id);
    if (waitingIndex === -1) return;

    const newItems = [...waitingItems];
    const targetIndex = direction === 'up' ? waitingIndex - 1 : waitingIndex + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    [newItems[waitingIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[waitingIndex]];
    reorderQueue.mutate({ data: { orderedIds: newItems.map(i => i.id) } }, {
      onSuccess: invalidate,
    });
  };

  const playingItems = queueData?.items?.filter(i => i.status === 'playing') ?? [];
  const waitingItems = queueData?.items?.filter(i => i.status === 'waiting') ?? [];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">點歌管理</h1>
            <p className="text-muted-foreground text-sm">管理等候演唱的佇列。完唱後自動記錄至演唱紀錄。</p>
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-1.5" onClick={invalidate}>
            <RefreshCw className="w-3.5 h-3.5" />
            重整
          </Button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">載入中...</div>
        ) : (!queueData?.items || queueData.items.length === 0) ? (
          <div className="py-16 text-center rounded-xl border border-border/50"
            style={{ background: "rgba(245,247,250,0.80)" }}>
            <Music className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">佇列目前是空的</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">

            {/* Now Playing */}
            {playingItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <h2 className="text-sm font-semibold text-primary tracking-wide">現正演唱</h2>
                </div>
                <div className="flex flex-col gap-2">
                  {playingItems.map(item => (
                    <div key={item.id}
                      className="flex items-center gap-4 px-5 py-4 rounded-xl shadow-sm"
                      style={{ background: "rgba(112,136,163,0.10)", border: "2px solid rgba(112,136,163,0.35)" }}>

                      <div className="flex-shrink-0">
                        <Badge className="bg-primary text-white text-xs px-2 py-0.5 font-medium">
                          ▶ 演唱中
                        </Badge>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground text-base truncate">{item.song?.title}</div>
                        <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>{item.song?.artist}</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
                          <span>點歌人：<span className="text-primary font-medium">{item.requesterName}</span></span>
                        </div>
                        {item.note && (
                          <div className="mt-1.5 text-xs text-muted-foreground italic border-l-2 border-border pl-2">
                            {item.note}
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                        onClick={() => handleComplete(item.id, item.song?.title)}
                        disabled={completeItem.isPending}
                        data-testid={`btn-complete-${item.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        完唱
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Waiting Queue */}
            {waitingItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground tracking-wide">等候佇列</h2>
                  <span className="text-xs text-muted-foreground/60">（{waitingItems.length} 首）</span>
                </div>
                <div className="rounded-xl overflow-hidden border border-border/50"
                  style={{ background: "rgba(255,255,255,0.60)" }}>
                  {waitingItems.map((item, index) => (
                    <div key={item.id}
                      className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${index < waitingItems.length - 1 ? 'border-b border-border/40' : ''} hover:bg-black/[0.02]`}>

                      {/* Reorder controls */}
                      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                        <button
                          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-black/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          disabled={index === 0}
                          onClick={() => handleMove(
                            queueData.items.findIndex(i => i.id === item.id),
                            'up'
                          )}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono text-muted-foreground/60 w-4 text-center">{index + 1}</span>
                        <button
                          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-black/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                          disabled={index === waitingItems.length - 1}
                          onClick={() => handleMove(
                            queueData.items.findIndex(i => i.id === item.id),
                            'down'
                          )}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Song info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground text-sm truncate">{item.song?.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>{item.song?.artist}</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
                          <span>點歌人：<span className="text-primary/80 font-medium">{item.requesterName}</span></span>
                        </div>
                        {item.note && (
                          <div className="mt-1 text-xs text-muted-foreground italic">{item.note}</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/8"
                          onClick={() => handleSetPlaying(item.id)}
                          disabled={setPlaying.isPending}
                          data-testid={`btn-play-${item.id}`}
                        >
                          <Mic2 className="w-3.5 h-3.5" />
                          現正演唱
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/8"
                          onClick={() => handleRemove(item.id)}
                          data-testid={`btn-remove-${item.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </AdminLayout>
  );
}

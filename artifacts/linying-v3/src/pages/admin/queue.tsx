import { useState, useEffect } from "react";
import { 
  useListQueue, 
  useGetActiveSession,
  useStartQueueItem,
  useSkipQueueItem,
  useCompleteQueueItem,
  useRemoveFromQueue
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function QueueAdmin() {
  const { data: queueData, isLoading, refetch } = useListQueue();
  const { data: sessionData } = useGetActiveSession();
  const { toast } = useToast();
  
  const startItem = useStartQueueItem();
  const skipItem = useSkipQueueItem();
  const completeItem = useCompleteQueueItem();
  const removeItem = useRemoveFromQueue();

  // Auto-refresh queue
  useEffect(() => {
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Card className="p-6 glass-card space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </Card>
      </div>
    );
  }

  const items = queueData?.items || [];
  const playingItem = items.find(item => item.status === "playing");
  const waitingItems = items.filter(item => item.status === "waiting");

  const handleStart = async (id: number) => {
    try {
      await startItem.mutateAsync({ id });
      toast({ title: "已開始演唱" });
      refetch();
    } catch (err) {
      toast({ title: "操作失敗", variant: "destructive" });
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await completeItem.mutateAsync({ id, params: { noAutoPromote: true } } as any);
      toast({ title: "已完唱" });
      refetch();
    } catch (err) {
      toast({ title: "操作失敗", variant: "destructive" });
    }
  };

  const handleSkip = async (id: number) => {
    try {
      await skipItem.mutateAsync({ id, params: { noAutoPromote: true } } as any);
      toast({ title: "已跳過" });
      refetch();
    } catch (err) {
      toast({ title: "操作失敗", variant: "destructive" });
    }
  };

  const handleRemove = async (id: number) => {
    if (!window.confirm("確定要移除此點歌嗎？")) return;
    try {
      await removeItem.mutateAsync({ id });
      toast({ title: "已移除" });
      refetch();
    } catch (err) {
      toast({ title: "操作失敗", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">點歌隊列</h2>
        <p className="text-muted-foreground text-sm mt-1">控制當前歌回的演唱進度</p>
      </div>

      {!sessionData?.session ? (
        <Card className="p-8 glass-card border-dashed border-muted text-center">
          <p className="text-muted-foreground">目前沒有進行中的歌回，請先至「歌回管理」建立或開啟歌回。</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Current Playing */}
          <section>
            <h3 className="text-sm font-medium tracking-widest text-primary mb-4 uppercase">現在演唱</h3>
            {playingItem ? (
              <Card className="p-6 glass-card border-primary/30 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h4 className="text-xl font-bold text-foreground">{playingItem.song?.title}</h4>
                    <p className="text-muted-foreground">{playingItem.song?.artist}</p>
                    <div className="mt-4 flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">點歌人：</span>
                      <span className="text-foreground font-medium">{playingItem.requesterName}</span>
                    </div>
                    {playingItem.note && (
                      <div className="mt-2 text-sm bg-background/50 p-3 rounded-md border border-border/50 text-muted-foreground">
                        {playingItem.note}
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleSkip(playingItem.id)}
                      data-testid={`btn-skip-${playingItem.id}`}
                    >
                      跳過
                    </Button>
                    <Button 
                      className="bg-primary/20 text-primary-foreground hover:bg-primary/30"
                      onClick={() => handleComplete(playingItem.id)}
                      data-testid={`btn-complete-${playingItem.id}`}
                    >
                      完唱
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6 glass-card bg-background/30 text-center border-dashed">
                <p className="text-muted-foreground text-sm">目前沒有正在演唱的歌曲</p>
              </Card>
            )}
          </section>

          {/* Waiting Queue */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium tracking-widest text-muted-foreground uppercase">等待中歌曲 ({waitingItems.length})</h3>
            </div>
            
            <div className="space-y-3">
              {waitingItems.length === 0 ? (
                <Card className="p-6 glass-card bg-background/30 text-center border-dashed">
                  <p className="text-muted-foreground text-sm">隊列空空的</p>
                </Card>
              ) : (
                waitingItems.map((item, index) => (
                  <Card key={item.id} className="p-4 glass-card hover:bg-card/90 transition-colors">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-muted-foreground/30 w-8 text-center">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground flex items-center gap-2">
                            {item.song?.title}
                            {item.song?.hasPitchWarning && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Pitch</Badge>}
                          </h4>
                          <p className="text-xs text-muted-foreground">{item.song?.artist}</p>
                          <div className="mt-1 text-xs flex flex-col gap-1">
                            <span className="text-primary/80">由 {item.requesterName} 點播</span>
                            {item.note && <span className="text-muted-foreground italic">「{item.note}」</span>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemove(item.id)}
                          data-testid={`btn-remove-${item.id}`}
                        >
                          移除
                        </Button>
                        <Button 
                          size="sm"
                          className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          onClick={() => handleStart(item.id)}
                          data-testid={`btn-start-${item.id}`}
                        >
                          開始演唱
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

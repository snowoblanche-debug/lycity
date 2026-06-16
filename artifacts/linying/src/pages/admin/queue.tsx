import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListQueue, 
  getListQueueQueryKey, 
  useRemoveFromQueue, 
  useCompleteQueueItem,
  useReorderQueue
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, CheckCircle2, PlayCircle, ArrowUp, ArrowDown } from "lucide-react";

export default function AdminQueue() {
  const queryClient = useQueryClient();
  const { data: queueData, isLoading } = useListQueue();
  const removeFromQueue = useRemoveFromQueue();
  const completeItem = useCompleteQueueItem();
  const reorderQueue = useReorderQueue();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getListQueueQueryKey() });
    }, 10000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const handleComplete = (id: number) => {
    completeItem.mutate({ id }, {
      onSuccess: () => {
        toast.success("標記為已演唱");
        queryClient.invalidateQueries({ queryKey: getListQueueQueryKey() });
      }
    });
  };

  const handleRemove = (id: number) => {
    if (confirm("確定要從佇列中移除嗎？")) {
      removeFromQueue.mutate({ id }, {
        onSuccess: () => {
          toast.success("已移除");
          queryClient.invalidateQueries({ queryKey: getListQueueQueryKey() });
        }
      });
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!queueData?.items) return;
    const newItems = [...queueData.items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    
    // Swap
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    const orderedIds = newItems.map(item => item.id);
    reorderQueue.mutate({ data: { orderedIds } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListQueueQueryKey() });
      }
    });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">點歌管理</h1>
            <p className="text-muted-foreground text-sm">管理等候演唱的佇列順序。</p>
          </div>
          <Button variant="outline" className="border-white/10" onClick={() => queryClient.invalidateQueries({ queryKey: getListQueueQueryKey() })}>
            重整
          </Button>
        </div>

        <div className="backdrop-blur-md bg-card/40 border border-white/10 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">載入中...</div>
          ) : !queueData?.items || queueData.items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">佇列目前是空的</div>
          ) : (
            <div className="flex flex-col divide-y divide-white/5">
              {queueData.items.map((item, index) => (
                <div key={item.id} className={`p-4 flex items-center gap-4 transition-colors ${item.status === 'playing' ? 'bg-primary/10' : 'hover:bg-white/5'}`}>
                  <div className="flex flex-col gap-1 items-center justify-center opacity-50">
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => handleMove(index, 'up')}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <span className="font-mono text-xs font-medium w-6 text-center">{index + 1}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === queueData.items.length - 1} onClick={() => handleMove(index, 'down')}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg text-white truncate">{item.song?.title}</span>
                      {item.status === 'playing' && <Badge className="bg-primary hover:bg-primary">現正演唱</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">{item.song?.artist}</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-white/40">點歌人:</span>
                      <span className="text-accent-foreground font-medium">{item.requesterName}</span>
                    </div>
                    {item.note && (
                      <div className="mt-1 text-sm text-white/60 italic border-l-2 border-white/10 pl-2">
                        "{item.note}"
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => handleComplete(item.id)}
                      className={item.status === 'playing' ? 'bg-green-600 hover:bg-green-700' : ''}
                      data-testid={`btn-complete-${item.id}`}
                    >
                      {item.status === 'playing' ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : <PlayCircle className="w-4 h-4 mr-1.5" />}
                      {item.status === 'playing' ? '完成' : '設為演唱中'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                      onClick={() => handleRemove(item.id)}
                      data-testid={`btn-remove-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      移除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

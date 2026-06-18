import { useState, useEffect } from "react";
import {
  useListSongs,
  useListQueue,
  useAddToQueue,
  useGetSettings,
  getListQueueQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const LANGS = ["全部", "中文", "日文", "韓文", "英文", "其他"];

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [lang, setLang] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: settingsData } = useGetSettings();
  const { data: songsData, isLoading: songsLoading } = useListSongs({
    search: debouncedSearch || undefined,
    language: lang || undefined,
    page,
    limit: 20,
  });
  const { data: queueData, refetch: refetchQueue } = useListQueue();
  const addToQueue = useAddToQueue();

  const [requestSong, setRequestSong] = useState<{ id: number; title: string; artist: string } | null>(null);
  const [requesterName, setRequesterName] = useState("");
  const [requestNote, setRequestNote] = useState("");

  useEffect(() => {
    const interval = setInterval(() => refetchQueue(), 10000);
    return () => clearInterval(interval);
  }, [refetchQueue]);

  const handleOpenRequest = (song: { id: number; title: string; artist: string; cooldownMode?: string; cooldownDays?: number }) => {
    if (song.cooldownMode === "block" && (song.cooldownDays ?? 0) > 0) return;
    setRequestSong(song);
    setRequesterName("");
    setRequestNote("");
  };

  const handleSubmitRequest = async () => {
    if (!requestSong || !requesterName.trim()) return;
    try {
      await addToQueue.mutateAsync({
        data: {
          songId: requestSong.id,
          requesterName: requesterName.trim(),
          note: requestNote.trim() || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListQueueQueryKey() });
      toast({ title: "點歌成功", description: `已將《${requestSong.title}》加入點歌隊列` });
      setRequestSong(null);
    } catch {
      toast({ title: "點歌失敗", description: "請稍後再試", variant: "destructive" });
    }
  };

  const siteName = settingsData?.siteName ?? "LY.city";
  const siteSubtitle = settingsData?.siteSubtitle ?? "";
  const songs = songsData?.songs ?? [];
  const total = songsData?.total ?? 0;
  const totalPages = Math.ceil(total / 20);
  const queueItems = queueData?.items ?? [];
  const playingItem = queueItems.find((i) => i.status === "playing");
  const waitingItems = queueItems.filter((i) => i.status === "waiting");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[20%] w-[60%] h-[300px] rounded-full bg-primary/5 blur-[100px]" />
        </div>
        <header className="border-b border-border/50 px-6 py-6 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold tracking-wide text-foreground">{siteName}</h1>
          {siteSubtitle && <p className="text-muted-foreground mt-1 text-sm">{siteSubtitle}</p>}
        </header>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col lg:flex-row gap-6">
        {/* Song Library */}
        <section className="flex-1 min-w-0">
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <Input
              type="search"
              placeholder="搜尋歌曲、歌手..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-card/50 border-border/50 focus:border-primary/50"
              data-testid="input-search-songs"
            />
            <Select value={lang} onValueChange={(v) => { setLang(v === "全部" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36 bg-card/50 border-border/50" data-testid="select-language">
                <SelectValue placeholder="語言" />
              </SelectTrigger>
              <SelectContent>
                {LANGS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground mb-3">
            共 {total} 首歌曲{debouncedSearch && `（搜尋「${debouncedSearch}」）`}
          </div>

          {songsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : songs.length === 0 ? (
            <Card className="glass-card p-10 text-center text-muted-foreground">
              找不到符合條件的歌曲
            </Card>
          ) : (
            <div className="space-y-2">
              {songs.map((song) => {
                const blocked = song.cooldownMode === "block" && (song.cooldownDays ?? 0) > 0;
                const warned = song.cooldownMode === "warn" && (song.cooldownDays ?? 0) > 0;
                return (
                  <Card
                    key={song.id}
                    className={`glass-card p-4 flex items-center justify-between gap-4 transition-colors hover:bg-card/90 ${blocked ? "opacity-60" : ""}`}
                    data-testid={`card-song-${song.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate">{song.title}</span>
                        {song.isPracticing && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-muted/80">練習中</Badge>
                        )}
                        {song.hasPitchWarning && (
                          <Badge variant="outline" className="text-[10px] px-1.5 h-4 border-yellow-600/50 text-yellow-500">高音</Badge>
                        )}
                        {warned && (
                          <Badge variant="outline" className="text-[10px] px-1.5 h-4 border-amber-600/50 text-amber-400">冷卻中</Badge>
                        )}
                        {blocked && (
                          <Badge variant="outline" className="text-[10px] px-1.5 h-4 border-red-600/50 text-red-400">暫停點播</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{song.artist}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {song.language && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-primary/10 text-primary/80 border-0">
                            {song.language}
                          </Badge>
                        )}
                        {song.primaryTag && (
                          <span className="text-[10px] text-muted-foreground">{song.primaryTag}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={blocked ? "ghost" : "outline"}
                      className={`shrink-0 ${!blocked ? "border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50" : "opacity-40 cursor-not-allowed"}`}
                      disabled={blocked || addToQueue.isPending}
                      onClick={() => handleOpenRequest(song)}
                      data-testid={`btn-request-${song.id}`}
                    >
                      點歌
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="btn-prev-page"
              >
                上一頁
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                data-testid="btn-next-page"
              >
                下一頁
              </Button>
            </div>
          )}
        </section>

        {/* Queue Panel */}
        <aside className="lg:w-80 xl:w-96 shrink-0">
          <div className="sticky top-4">
            <h2 className="text-sm font-medium tracking-widest text-muted-foreground uppercase mb-3">點歌隊列</h2>

            {playingItem && (
              <Card className="glass-card p-4 border-primary/30 mb-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="pl-2">
                  <div className="text-[10px] font-bold tracking-widest text-primary uppercase mb-1">演唱中</div>
                  <div className="font-bold text-foreground">{playingItem.song?.title}</div>
                  <div className="text-xs text-muted-foreground">{playingItem.song?.artist}</div>
                  <div className="mt-2 text-xs text-primary/70">點歌人：{playingItem.requesterName}</div>
                  {playingItem.note && (
                    <div className="mt-1 text-xs text-muted-foreground italic">「{playingItem.note}」</div>
                  )}
                </div>
              </Card>
            )}

            {waitingItems.length === 0 && !playingItem ? (
              <Card className="glass-card p-6 text-center text-muted-foreground text-sm border-dashed">
                隊列目前是空的
              </Card>
            ) : (
              <div className="space-y-2">
                {waitingItems.map((item, i) => (
                  <Card key={item.id} className="glass-card p-3" data-testid={`queue-item-${item.id}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground/30 w-6 text-center shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">{item.song?.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{item.song?.artist}</div>
                        <div className="text-[11px] text-primary/70 mt-0.5">由 {item.requesterName} 點播</div>
                        {item.note && (
                          <div className="text-[11px] text-muted-foreground italic mt-0.5 truncate">「{item.note}」</div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Request Dialog */}
      <Dialog open={!!requestSong} onOpenChange={(open) => { if (!open) setRequestSong(null); }}>
        <DialogContent className="glass-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">點歌</DialogTitle>
          </DialogHeader>
          {requestSong && (
            <div className="space-y-5">
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <div className="font-semibold text-foreground">{requestSong.title}</div>
                <div className="text-sm text-muted-foreground">{requestSong.artist}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-widest" htmlFor="requester-name">
                  你的名字
                </Label>
                <Input
                  id="requester-name"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="輸入名字（Twitch / 實名）"
                  className="bg-background/50 border-border/50 focus:border-primary/50"
                  data-testid="input-requester-name"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-widest" htmlFor="request-note">
                  備註（選填）
                </Label>
                <Input
                  id="request-note"
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value.slice(0, 100))}
                  placeholder="給主播的留言（最多 100 字）"
                  className="bg-background/50 border-border/50 focus:border-primary/50"
                  data-testid="input-request-note"
                  maxLength={100}
                />
                <p className="text-[10px] text-muted-foreground text-right">{requestNote.length}/100</p>
              </div>
              <Button
                className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-foreground transition-all"
                onClick={handleSubmitRequest}
                disabled={!requesterName.trim() || addToQueue.isPending}
                data-testid="btn-submit-request"
              >
                {addToQueue.isPending ? "提交中..." : "確認點歌"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

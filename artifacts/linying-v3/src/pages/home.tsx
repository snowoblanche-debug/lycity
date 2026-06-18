import { useState, useEffect } from "react";
import {
  useListSongs,
  useListCategories,
  useListQueue,
  useAddToQueue,
  useGetSettings,
  getListQueueQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Music, Search, Play, Youtube, ListOrdered, AlertCircle } from "lucide-react";

/* ── Status badge ─────────────────────────────────────────── */
function statusStyle(status: string): React.CSSProperties {
  if (status.includes("修練中"))   return { background: "rgba(234,179,8,0.13)",   color: "#92610a", border: "1px solid rgba(234,179,8,0.30)" };
  if (status.includes("高完成度")) return { background: "rgba(59,130,246,0.11)",  color: "#1e40af", border: "1px solid rgba(59,130,246,0.30)" };
  if (status.includes("招牌曲"))   return { background: "rgba(139,92,246,0.11)",  color: "#6b21a8", border: "1px solid rgba(139,92,246,0.30)" };
  if (status.includes("季節限定")) return { background: "rgba(20,184,166,0.11)",  color: "#0f766e", border: "1px solid rgba(20,184,166,0.28)" };
  return { background: "rgba(107,114,128,0.09)", color: "#374151", border: "1px solid rgba(107,114,128,0.22)" };
}

function StatusBadge({ status, tags }: { status?: string | null; tags?: string[] }) {
  const hasPitch = tags?.some((t) => t.includes("破音"));
  return (
    <span className="flex items-center gap-1 flex-wrap">
      {status && status !== "已解鎖" && (
        <span
          className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded-md font-medium"
          style={statusStyle(status)}
        >
          {status}
        </span>
      )}
      {hasPitch && (
        <span
          className="inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-md font-medium"
          style={{ background: "rgba(239,68,68,0.09)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.22)" }}
        >
          <AlertCircle className="w-2.5 h-2.5" /> 破音警告
        </span>
      )}
    </span>
  );
}

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [lang, setLang] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data: settingsData } = useGetSettings();
  const { data: categoriesData } = useListCategories();
  const { data: songsData, isLoading: songsLoading } = useListSongs({
    search: debouncedSearch || undefined,
    language: lang !== "all" ? lang : undefined,
    category: category !== "all" ? category : undefined,
    page,
    limit: 50,
  });
  const { data: queueData, refetch: refetchQueue } = useListQueue();
  const addToQueue = useAddToQueue();

  const [requestSong, setRequestSong] = useState<{ id: number; title: string; artist: string } | null>(null);
  const [requesterName, setRequesterName] = useState("");
  const [requestNote, setRequestNote] = useState("");

  useEffect(() => {
    const interval = setInterval(() => refetchQueue(), 8000);
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

  const siteName    = settingsData?.siteName    ?? "LY.city";
  const siteSubtitle = settingsData?.siteSubtitle ?? "";
  const bannerImage  = settingsData?.bannerImageUrl;

  const songs      = songsData?.songs ?? [];
  const total      = songsData?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  const queueItems   = queueData?.items ?? [];
  const playingItem  = queueItems.find((i) => i.status === "playing");
  const waitingItems = queueItems.filter((i) => i.status === "waiting");
  const nextItem     = waitingItems[0];
  const restItems    = waitingItems.slice(1);

  const languages = categoriesData?.categories.filter((c) => c.type === "language") ?? [];
  const themes    = categoriesData?.categories.filter((c) => c.type !== "language") ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Hero Banner ────────────────────────────────────── */}
      <div
        className="w-full relative flex items-center justify-center overflow-hidden"
        style={{
          minHeight: "190px",
          backgroundImage: bannerImage
            ? `url(${bannerImage})`
            : "linear-gradient(135deg, #7088A3 0%, #8EA3B9 50%, #a8bed4 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0" style={{ background: "rgba(36,52,71,0.36)", backdropFilter: "blur(1px)" }} />
        <div className="relative z-10 text-center px-6 py-12">
          <h1
            className="text-3xl md:text-5xl font-bold tracking-widest text-white drop-shadow-lg mb-3"
            style={{ textShadow: "0 2px 16px rgba(36,52,71,0.4)" }}
          >
            {siteName}
          </h1>
          {siteSubtitle && (
            <p
              className="text-base md:text-lg text-white/85 tracking-wider font-light"
              style={{ textShadow: "0 1px 8px rgba(36,52,71,0.4)" }}
            >
              {siteSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col lg:flex-row gap-6">

        {/* Left — Song Library */}
        <section className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Search & Filter bar */}
          <div
            className="rounded-xl p-4 flex flex-col sm:flex-row gap-3 shadow-sm"
            style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)", border: "1px solid rgba(112,136,163,0.18)" }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="搜尋歌名、歌手或標籤..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/60 border-border/60 focus-visible:ring-primary/40"
                data-testid="input-search-songs"
              />
            </div>
            <Select value={lang} onValueChange={(v) => { setLang(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40 bg-white/60 border-border/60" data-testid="select-language">
                <SelectValue placeholder="所有語種" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有語種</SelectItem>
                {languages.length > 0
                  ? languages.map((l) => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)
                  : ["中文", "日文", "英文", "韓文", "小語種"].map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40 bg-white/60 border-border/60" data-testid="select-category">
                <SelectValue placeholder="所有分類" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有分類</SelectItem>
                {themes.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {!songsLoading && (
            <p className="text-xs text-muted-foreground px-1">
              共 {total} 首歌曲{debouncedSearch && `（搜尋「${debouncedSearch}」）`}
            </p>
          )}

          {/* Song List */}
          <div className="flex flex-col gap-2">
            {songsLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))
            ) : songs.length === 0 ? (
              <div
                className="py-16 text-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.60)", border: "1px solid rgba(112,136,163,0.18)" }}
              >
                <Music className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">找不到符合的歌曲</p>
              </div>
            ) : (
              songs.map((song) => {
                const blocked = song.cooldownMode === "block" && (song.cooldownDays ?? 0) > 0;
                const warned  = song.cooldownMode === "warn"  && (song.cooldownDays ?? 0) > 0;
                const secondaryTags = (song.categories ?? []).filter((c) => c !== song.primaryTag);

                return (
                  <div
                    key={song.id}
                    className={`rounded-xl px-4 py-3.5 flex items-center justify-between gap-4 transition-all hover:shadow-md group ${blocked ? "opacity-60" : ""}`}
                    style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(10px)", border: "1px solid rgba(112,136,163,0.16)" }}
                    data-testid={`card-song-${song.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Title + status badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-base text-[#243447] truncate leading-snug">
                          {song.youtubeUrl ? (
                            <a
                              href={song.youtubeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-primary transition-colors inline-flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {song.title}
                              <Youtube className="h-3 w-3 opacity-40 flex-shrink-0" />
                            </a>
                          ) : song.title}
                        </h3>
                        <StatusBadge status={song.status} tags={song.categories} />
                        {warned && (
                          <span
                            className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded-md font-medium"
                            style={{ background: "rgba(234,179,8,0.10)", color: "#92610a", border: "1px solid rgba(234,179,8,0.28)" }}
                          >
                            冷卻中
                          </span>
                        )}
                        {blocked && (
                          <span
                            className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded-md font-medium"
                            style={{ background: "rgba(239,68,68,0.09)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.22)" }}
                          >
                            暫停點播
                          </span>
                        )}
                      </div>

                      {/* Row 2: Artist · Language · Primary tag · Secondary tags · Play count */}
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="text-[#4B5563] font-medium">{song.artist}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-[#6B7280]/40 flex-shrink-0" />
                        <span className="text-[#6B7280]">{song.language}</span>

                        {song.primaryTag && (
                          <>
                            <span className="w-0.5 h-0.5 rounded-full bg-[#6B7280]/40 flex-shrink-0" />
                            <span
                              className="text-xs px-1.5 py-0.5 rounded font-semibold"
                              style={{ background: "rgba(112,136,163,0.14)", color: "#243447", border: "1px solid rgba(112,136,163,0.28)" }}
                            >
                              {song.primaryTag}
                            </span>
                          </>
                        )}

                        {secondaryTags.length > 0 && (
                          <>
                            <span className="w-0.5 h-0.5 rounded-full bg-[#6B7280]/40 flex-shrink-0" />
                            <span className="text-[#6B7280] text-xs">{secondaryTags.slice(0, 3).join(" · ")}</span>
                          </>
                        )}

                        {(song.playCount ?? 0) > 0 && (
                          <>
                            <span className="w-0.5 h-0.5 rounded-full bg-[#6B7280]/40 flex-shrink-0" />
                            <span className="text-[#9BA8B3] text-xs">{song.playCount} 次</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className={`flex-shrink-0 h-8 px-4 text-sm ${
                        blocked
                          ? "opacity-40 cursor-not-allowed bg-transparent border-border text-muted-foreground"
                          : "bg-primary hover:bg-primary/90 text-white shadow-sm"
                      }`}
                      disabled={blocked || addToQueue.isPending}
                      onClick={() => handleOpenRequest(song)}
                      data-testid={`btn-request-${song.id}`}
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      點歌
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
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

        {/* Right — Queue Panel */}
        <aside className="lg:w-[25%] shrink-0">
          <div
            className="rounded-2xl overflow-hidden sticky top-4 flex flex-col"
            style={{
              maxHeight: "calc(100vh - 5rem)",
              background: "rgba(255,255,255,0.78)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(112,136,163,0.20)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-border/50 flex items-center gap-2 flex-shrink-0">
              <ListOrdered className="h-4 w-4 text-primary flex-shrink-0" />
              <h2 className="font-semibold text-[#243447] tracking-wide text-sm">等候佇列</h2>
              {waitingItems.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">{waitingItems.length} 首等候</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">

              {/* Now Playing — always shown */}
              <div className="mb-1">
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1.5 px-1">現正演唱</p>
                {playingItem ? (
                  <div
                    className="px-3 py-2.5 rounded-lg"
                    style={{ background: "rgba(112,136,163,0.12)", border: "1px solid rgba(112,136,163,0.35)" }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="text-[10px] font-bold mt-0.5 flex-shrink-0 w-7 text-center py-0.5 rounded bg-primary text-white">▶</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#243447] text-sm truncate leading-snug">{playingItem.song?.title}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{playingItem.song?.artist}</div>
                        <div className="mt-1.5 text-[11px] text-primary/90 font-medium">{playingItem.requesterName}</div>
                        {playingItem.note && (
                          <div className="mt-1 text-[11px] text-muted-foreground italic border-l-2 border-border pl-1.5 leading-relaxed">{playingItem.note}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="px-3 py-3 rounded-lg flex items-center gap-2 text-muted-foreground"
                    style={{ background: "rgba(245,247,250,0.80)", border: "1px dashed rgba(112,136,163,0.25)" }}
                  >
                    <Music className="h-4 w-4 opacity-40 flex-shrink-0" />
                    <span className="text-xs">目前沒有歌曲演唱</span>
                  </div>
                )}
              </div>

              {/* Next Up — always shown */}
              <div className="mb-1">
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1.5 px-1">下一首</p>
                {nextItem ? (
                  <div
                    className="px-3 py-2.5 rounded-lg"
                    style={{ background: "rgba(245,247,250,0.80)", border: "1px solid rgba(112,136,163,0.12)" }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="text-[10px] font-bold mt-0.5 flex-shrink-0 w-7 text-center py-0.5 rounded bg-muted text-muted-foreground">1</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#243447] text-sm truncate leading-snug">{nextItem.song?.title}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{nextItem.song?.artist}</div>
                        <div className="mt-1.5 text-[11px] text-primary/90 font-medium">{nextItem.requesterName}</div>
                        {nextItem.note && (
                          <div className="mt-1 text-[11px] text-muted-foreground italic border-l-2 border-border pl-1.5 leading-relaxed">{nextItem.note}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="px-3 py-3 rounded-lg flex items-center gap-2 text-muted-foreground"
                    style={{ background: "rgba(245,247,250,0.80)", border: "1px dashed rgba(112,136,163,0.25)" }}
                  >
                    <Music className="h-4 w-4 opacity-40 flex-shrink-0" />
                    <span className="text-xs">目前沒有等待歌曲</span>
                  </div>
                )}
              </div>

              {/* Rest of queue */}
              {restItems.length > 0 && (
                <>
                  <div className="border-t border-border/40 pt-2 mt-1">
                    <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1.5 px-1">等候中</p>
                  </div>
                  {restItems.map((item, i) => (
                    <div
                      key={item.id}
                      className="px-3 py-2.5 rounded-lg"
                      style={{ background: "rgba(245,247,250,0.80)", border: "1px solid rgba(112,136,163,0.12)" }}
                      data-testid={`queue-item-${item.id}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="text-[10px] font-bold mt-0.5 flex-shrink-0 w-7 text-center py-0.5 rounded bg-muted text-muted-foreground">
                          {i + 2}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#243447] text-sm truncate leading-snug">{item.song?.title}</div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{item.song?.artist}</div>
                          <div className="mt-1.5 text-[11px] text-primary/90 font-medium">{item.requesterName}</div>
                          {item.note && (
                            <div className="mt-1 text-[11px] text-muted-foreground italic border-l-2 border-border pl-1.5 leading-relaxed">{item.note}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Request Dialog ──────────────────────────────────── */}
      <Dialog open={!!requestSong} onOpenChange={(open) => { if (!open) setRequestSong(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#243447]">
              點播：{requestSong?.title}
            </DialogTitle>
            {requestSong && (
              <p className="text-sm text-muted-foreground mt-0.5">{requestSong.artist}</p>
            )}
          </DialogHeader>
          {requestSong && (
            <div className="grid gap-4 py-3">
              <div className="grid gap-1.5">
                <Label htmlFor="requester-name" className="text-sm font-medium text-[#4B5563]">
                  點歌人名稱 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="requester-name"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="輸入您的暱稱（Twitch / 實名）"
                  autoFocus
                  maxLength={50}
                  data-testid="input-requester-name"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="request-note" className="text-sm font-medium text-[#4B5563]">
                  留言給主播 <span className="text-muted-foreground font-normal text-xs">（選填）</span>
                </Label>
                <Input
                  id="request-note"
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value.slice(0, 100))}
                  placeholder="想說的話..."
                  maxLength={100}
                  data-testid="input-request-note"
                />
                <p className="text-[10px] text-muted-foreground text-right">{requestNote.length}/100</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRequestSong(null)}>取消</Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={!requesterName.trim() || addToQueue.isPending}
              data-testid="btn-submit-request"
            >
              {addToQueue.isPending ? "送出中..." : "確認點播"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSongs,
  getListSongsQueryKey,
  useListCategories,
  useListQueue,
  getListQueueQueryKey,
  useAddToQueue,
  useGetSettings,
  useGetCurrentPlaying,
  getGetCurrentPlayingQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Play, Music, Youtube, AlertCircle, ListOrdered, Mic2 } from "lucide-react";
import { toast } from "sonner";

function statusStyle(status: string): React.CSSProperties {
  if (status.includes("修練中"))   return { background: "rgba(234,179,8,0.13)",   color: "#92610a", border: "1px solid rgba(234,179,8,0.30)" };
  if (status.includes("高完成度")) return { background: "rgba(59,130,246,0.11)",  color: "#1e40af", border: "1px solid rgba(59,130,246,0.30)" };
  if (status.includes("招牌曲"))   return { background: "rgba(139,92,246,0.11)",  color: "#6b21a8", border: "1px solid rgba(139,92,246,0.30)" };
  if (status.includes("季節限定")) return { background: "rgba(20,184,166,0.11)",  color: "#0f766e", border: "1px solid rgba(20,184,166,0.28)" };
  return { background: "rgba(107,114,128,0.09)", color: "#374151", border: "1px solid rgba(107,114,128,0.22)" };
}

function StatusBadge({ status, tags }: { status?: string; tags?: string[] }) {
  const hasPitch = tags?.some(t => t.includes("破音"));
  return (
    <span className="flex items-center gap-1 flex-wrap">
      {status && status !== "已解鎖" && (
        <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded-md font-medium"
          style={statusStyle(status)}>
          {status}
        </span>
      )}
      {hasPitch && (
        <span className="inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-md font-medium"
          style={{ background: "rgba(239,68,68,0.09)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.22)" }}>
          <AlertCircle className="w-2.5 h-2.5" /> 破音警告
        </span>
      )}
    </span>
  );
}

export default function HomePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [requestDialogSongId, setRequestDialogSongId] = useState<number | null>(null);
  const [requesterName, setRequesterName] = useState("");
  const [requestNote, setRequestNote] = useState("");

  const { data: settings } = useGetSettings();
  const { data: categoriesData } = useListCategories();
  const { data: currentPlaying } = useGetCurrentPlaying();
  const languages = categoriesData?.categories.filter(c => c.type === 'language') || [];
  const themes = categoriesData?.categories.filter(c => c.type !== 'language') || [];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: songsData, isLoading: isLoadingSongs } = useListSongs(
    {
      search: debouncedSearch || undefined,
      language: selectedLanguage !== "all" ? selectedLanguage : undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      limit: 100,
    },
    { query: { queryKey: getListSongsQueryKey({ search: debouncedSearch || undefined, language: selectedLanguage !== "all" ? selectedLanguage : undefined, category: selectedCategory !== "all" ? selectedCategory : undefined, limit: 100 }) } }
  );

  const { data: queueData } = useListQueue();
  const addToQueue = useAddToQueue();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getListQueueQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCurrentPlayingQueryKey() });
    }, 8000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const handleRequestSong = () => {
    if (!requestDialogSongId || !requesterName.trim()) {
      toast.error("請輸入點歌人名稱");
      return;
    }
    addToQueue.mutate(
      { data: { songId: requestDialogSongId, requesterName, note: requestNote || undefined } },
      {
        onSuccess: () => {
          toast.success("點歌成功！已加入佇列");
          setRequestDialogSongId(null);
          setRequesterName("");
          setRequestNote("");
          queryClient.invalidateQueries({ queryKey: getListQueueQueryKey() });
        },
        onError: () => toast.error("點歌失敗，請稍後再試"),
      }
    );
  };

  const bannerTitle = settings?.siteName || "聆櫻聖境的點歌旋律";
  const bannerSubtitle = settings?.siteSubtitle || "點播喜歡的歌曲，一起留下今天的旋律";
  const currentSong = currentPlaying?.current;

  return (
    <Layout>
      {/* Banner */}
      <div
        className="w-full relative flex items-center justify-center overflow-hidden"
        style={{
          minHeight: "200px",
          backgroundImage: settings?.bannerImageUrl
            ? `url(${settings.bannerImageUrl})`
            : "linear-gradient(135deg, #7088A3 0%, #8EA3B9 50%, #a8bed4 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0" style={{ background: "rgba(36,52,71,0.36)", backdropFilter: "blur(1px)" }} />
        <div className="relative z-10 text-center px-6 py-14">
          <h2 className="text-3xl md:text-5xl font-bold tracking-widest text-white drop-shadow-lg mb-3" style={{ textShadow: "0 2px 16px rgba(36,52,71,0.4)" }}>
            {bannerTitle}
          </h2>
          <p className="text-base md:text-lg text-white/85 tracking-wider font-light" style={{ textShadow: "0 1px 8px rgba(36,52,71,0.4)" }}>
            {bannerSubtitle}
          </p>
        </div>
      </div>

      {/* Now Playing bar */}
      {currentSong && (
        <div className="w-full border-b border-border/50 px-4 md:px-8 py-3"
          style={{ background: "rgba(112,136,163,0.10)", backdropFilter: "blur(8px)" }}>
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-primary font-semibold text-sm flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              🎵 現正演唱
            </span>
            <span className="text-foreground font-semibold text-sm truncate">{currentSong.song?.title}</span>
            <span className="text-muted-foreground text-sm hidden sm:block">{currentSong.song?.artist}</span>
            <span className="ml-auto text-xs text-primary/80 font-medium flex-shrink-0">
              {currentSong.requesterName}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6 flex flex-col lg:flex-row gap-6">

        {/* Left 75% — Song Library */}
        <div className="w-full lg:w-[75%] flex flex-col gap-4">

          {/* Search & Filters */}
          <div className="rounded-xl p-4 flex flex-col md:flex-row gap-3 shadow-sm"
            style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)", border: "1px solid rgba(112,136,163,0.18)" }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋歌名、歌手或標籤..."
                className="pl-9 bg-white/60 border-border/60 text-foreground placeholder:text-[#6B7280] focus-visible:ring-primary/40"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full md:w-[160px] bg-white/60 border-border/60 text-foreground">
                <SelectValue placeholder="所有語種" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有語種</SelectItem>
                {languages.length > 0 ? languages.map(l => (
                  <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                )) : (
                  <>
                    {["中文", "日文", "英文", "韓文", "小語種"].map(lang => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[160px] bg-white/60 border-border/60 text-foreground">
                <SelectValue placeholder="所有分類" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有分類</SelectItem>
                {themes.map(t => (
                  <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isLoadingSongs && songsData && (
            <p className="text-xs text-[#6B7280] px-1">共 {songsData.total} 首歌曲</p>
          )}

          {/* Song List */}
          <div className="flex flex-col gap-2">
            {isLoadingSongs ? (
              <div className="py-16 text-center text-[#6B7280]">載入中...</div>
            ) : songsData?.songs.length === 0 ? (
              <div className="py-16 text-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.60)", border: "1px solid rgba(112,136,163,0.18)" }}>
                <Music className="h-10 w-10 mx-auto mb-3 text-[#6B7280]/40" />
                <p className="text-[#6B7280]">找不到符合的歌曲</p>
              </div>
            ) : (
              songsData?.songs.map(song => (
                <div
                  key={song.id}
                  className="rounded-xl px-4 py-3.5 flex items-center justify-between gap-4 transition-all hover:shadow-md group"
                  style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(10px)", border: "1px solid rgba(112,136,163,0.16)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-base text-[#243447] truncate leading-snug">
                        {song.youtubeUrl ? (
                          <a href={song.youtubeUrl} target="_blank" rel="noreferrer"
                            className="hover:text-primary transition-colors inline-flex items-center gap-1"
                            data-testid={`link-youtube-${song.id}`}>
                            {song.title}
                            <Youtube className="h-3 w-3 opacity-40 flex-shrink-0" />
                          </a>
                        ) : song.title}
                      </h3>
                      <StatusBadge status={(song as any).status} tags={song.categories} />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#4B5563] font-medium">{song.artist}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-[#6B7280]/40" />
                      <span className="text-[#6B7280]">{song.language}</span>
                      {song.categories && song.categories.length > 0 && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-[#6B7280]/40" />
                          <span className="text-[#6B7280] text-xs">{song.categories.slice(0, 3).join(" · ")}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Dialog open={requestDialogSongId === song.id} onOpenChange={(open) => !open && setRequestDialogSongId(null)}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="flex-shrink-0 bg-primary hover:bg-primary/90 text-white shadow-sm h-8 px-4 text-sm"
                        onClick={() => setRequestDialogSongId(song.id)}
                        data-testid={`btn-request-${song.id}`}
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                        點歌
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[400px]">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-[#243447]">點播：{song.title}</DialogTitle>
                        <p className="text-sm text-[#6B7280] mt-0.5">{song.artist}</p>
                      </DialogHeader>
                      <div className="grid gap-4 py-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="requesterName" className="text-sm font-medium text-[#4B5563]">點歌人名稱 <span className="text-destructive">*</span></Label>
                          <Input
                            id="requesterName"
                            value={requesterName}
                            onChange={e => setRequesterName(e.target.value)}
                            placeholder="輸入您的暱稱"
                            autoFocus
                            data-testid="input-requester"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="note" className="text-sm font-medium text-[#4B5563]">留言給 聆櫻 <span className="text-[#6B7280] font-normal text-xs">（選填）</span></Label>
                          <Input
                            id="note"
                            value={requestNote}
                            onChange={e => setRequestNote(e.target.value)}
                            placeholder="想說的話..."
                            data-testid="input-note"
                          />
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setRequestDialogSongId(null)}>取消</Button>
                        <Button
                          onClick={handleRequestSong}
                          disabled={!requesterName.trim() || addToQueue.isPending}
                          data-testid="btn-submit-request"
                        >
                          {addToQueue.isPending ? "送出中..." : "確認點播"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 25% — Queue */}
        <div className="w-full lg:w-[25%]">
          <div
            className="rounded-2xl shadow-lg overflow-hidden sticky top-20 flex flex-col"
            style={{ maxHeight: "calc(100vh - 6rem)", background: "rgba(255,255,255,0.78)", backdropFilter: "blur(16px)", border: "1px solid rgba(112,136,163,0.20)" }}
          >
            <div className="px-4 py-3.5 border-b border-border/50 flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-primary flex-shrink-0" />
              <h2 className="font-semibold text-[#243447] tracking-wide text-sm">等候佇列</h2>
              {queueData?.items && queueData.items.length > 0 && (
                <span className="ml-auto text-xs text-[#6B7280]">{queueData.items.length} 首</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {!queueData?.items || queueData.items.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-[#6B7280]/60">
                  <Music className="h-8 w-8 mb-2" />
                  <p className="text-sm">目前佇列為空</p>
                  <p className="text-xs mt-0.5">快來點第一首吧！</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {queueData.items.map((item, i) => (
                    <div
                      key={item.id}
                      className="px-3 py-2.5 rounded-lg transition-all"
                      style={item.status === 'playing'
                        ? { background: "rgba(112,136,163,0.12)", border: "1px solid rgba(112,136,163,0.35)" }
                        : { background: "rgba(245,247,250,0.80)", border: "1px solid rgba(112,136,163,0.12)" }
                      }
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`text-[10px] font-bold mt-0.5 flex-shrink-0 w-7 text-center py-0.5 rounded ${
                          item.status === 'playing' ? 'bg-primary text-white' : 'bg-muted text-[#6B7280]'
                        }`}>
                          {item.status === 'playing' ? '▶' : `${i + 1}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#243447] text-sm truncate leading-snug">{item.song?.title}</div>
                          <div className="text-xs text-[#6B7280] truncate mt-0.5">{item.song?.artist}</div>
                          <div className="mt-1.5 text-[11px] text-primary/90 font-medium">{item.requesterName}</div>
                          {item.note && (
                            <div className="mt-1 text-[11px] text-[#6B7280] italic border-l-2 border-border pl-1.5 leading-relaxed">{item.note}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}

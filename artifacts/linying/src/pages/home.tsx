import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListSongs, 
  getListSongsQueryKey, 
  useListCategories, 
  useListQueue, 
  getListQueueQueryKey,
  useAddToQueue,
  useGetSettings
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Play, Music, Youtube, AlertCircle, ListOrdered } from "lucide-react";
import { toast } from "sonner";

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
  const languages = categoriesData?.categories.filter(c => c.type === 'language') || [];
  const themes = categoriesData?.categories.filter(c => c.type !== 'language') || [];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: songsData, isLoading: isLoadingSongs } = useListSongs(
    { 
      search: debouncedSearch || undefined, 
      language: selectedLanguage !== "all" ? selectedLanguage : undefined,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      limit: 100
    },
    { query: { queryKey: getListSongsQueryKey({ search: debouncedSearch || undefined, language: selectedLanguage !== "all" ? selectedLanguage : undefined, category: selectedCategory !== "all" ? selectedCategory : undefined, limit: 100 }) } }
  );

  const { data: queueData } = useListQueue();
  const addToQueue = useAddToQueue();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getListQueueQueryKey() });
    }, 10000);
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
        onError: (err) => {
          toast.error("點歌失敗，請稍後再試");
        }
      }
    );
  };

  return (
    <Layout>
      {/* Banner */}
      <div 
        className="w-full h-[30vh] md:h-[40vh] relative bg-cover bg-center bg-no-repeat flex items-center justify-center border-b border-white/5"
        style={{ 
          backgroundImage: settings?.bannerImageUrl ? `url(${settings.bannerImageUrl})` : 'none',
        }}
      >
        {!settings?.bannerImageUrl && (
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-background opacity-50" />
        )}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className="relative z-10 text-center px-4">
          <h2 className="text-3xl md:text-5xl font-bold tracking-widest text-white drop-shadow-lg mb-4">
            {settings?.bannerText || settings?.siteName || "聆櫻聖境"}
          </h2>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        {/* Left 70% - Song Library */}
        <div className="w-full lg:w-[70%] flex flex-col gap-6">
          <div className="backdrop-blur-md bg-card/40 border border-white/10 rounded-xl p-4 shadow-lg flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="搜尋歌名或歌手..." 
                className="pl-9 bg-black/20 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-primary/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full md:w-[180px] bg-black/20 border-white/10 text-white">
                <SelectValue placeholder="所有語種" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有語種</SelectItem>
                {languages.map(l => (
                  <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[180px] bg-black/20 border-white/10 text-white">
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

          <div className="flex-1 flex flex-col gap-3">
            {isLoadingSongs ? (
              <div className="p-8 text-center text-muted-foreground">載入中...</div>
            ) : songsData?.songs.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground backdrop-blur-sm bg-card/20 border border-white/5 rounded-xl">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>找不到符合的歌曲</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {songsData?.songs.map(song => (
                  <Card key={song.id} className="bg-card/40 backdrop-blur-md border-white/10 hover:bg-card/60 transition-colors group">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-medium text-lg text-white truncate">
                            {song.youtubeUrl ? (
                              <a href={song.youtubeUrl} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors flex items-center gap-1" data-testid={`link-youtube-${song.id}`}>
                                {song.title} <Youtube className="h-3 w-3 inline opacity-70" />
                              </a>
                            ) : (
                              song.title
                            )}
                          </h3>
                          {song.isPracticing && <Badge variant="outline" className="border-orange-500/50 text-orange-400 bg-orange-500/10 text-[10px] px-1.5 py-0">修練中</Badge>}
                          {song.hasPitchWarning && <Badge variant="outline" className="border-red-500/50 text-red-400 bg-red-500/10 text-[10px] px-1.5 py-0 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>破音警告</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="text-white/80">{song.artist}</span>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span>{song.language}</span>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span>演唱 {song.playCount} 次</span>
                        </div>
                      </div>
                      <Dialog open={requestDialogSongId === song.id} onOpenChange={(open) => !open && setRequestDialogSongId(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="bg-primary/20 text-primary-foreground hover:bg-primary/40 border border-primary/30"
                            onClick={() => setRequestDialogSongId(song.id)}
                            data-testid={`btn-request-${song.id}`}
                          >
                            <Play className="h-4 w-4 mr-1.5" />
                            點歌
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-popover/95 backdrop-blur-xl border-white/10 sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle className="text-xl">點播: {song.title}</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="requesterName">點歌人名稱 (必填)</Label>
                              <Input 
                                id="requesterName" 
                                value={requesterName} 
                                onChange={e => setRequesterName(e.target.value)} 
                                className="bg-black/20 border-white/10"
                                placeholder="輸入您的暱稱"
                                autoFocus
                                data-testid="input-requester"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="note">留言給 聆櫻 (選填)</Label>
                              <Input 
                                id="note" 
                                value={requestNote} 
                                onChange={e => setRequestNote(e.target.value)} 
                                className="bg-black/20 border-white/10"
                                placeholder="想說的話..."
                                data-testid="input-note"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="ghost" onClick={() => setRequestDialogSongId(null)}>取消</Button>
                            <Button onClick={handleRequestSong} disabled={!requesterName.trim() || addToQueue.isPending} data-testid="btn-submit-request">
                              {addToQueue.isPending ? "送出中..." : "確認點播"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 30% - Queue */}
        <div className="w-full lg:w-[30%]">
          <div className="backdrop-blur-xl bg-card/60 border border-white/10 rounded-2xl shadow-2xl overflow-hidden sticky top-[5.5rem] flex flex-col h-[calc(100vh-8rem)]">
            <div className="p-5 border-b border-white/5 bg-black/20">
              <h2 className="text-xl font-bold tracking-wider text-white flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-primary" />
                等候佇列
              </h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              {!queueData?.items || queueData.items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                  <Music className="h-10 w-10 mb-2 opacity-50" />
                  <p>目前沒有等候中的歌曲</p>
                  <p className="text-sm">快來點第一首吧！</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {queueData.items.map((item, i) => (
                    <div 
                      key={item.id} 
                      className={`p-3 rounded-lg border transition-all ${
                        item.status === 'playing' 
                          ? 'bg-primary/20 border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.2)]' 
                          : 'bg-black/20 border-white/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`text-xs font-mono font-bold mt-1 ${item.status === 'playing' ? 'text-primary' : 'text-muted-foreground'}`}>
                          {item.status === 'playing' ? 'NOW' : `#${i + 1}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">{item.song?.title}</div>
                          <div className="text-xs text-white/60 truncate mt-0.5">{item.song?.artist}</div>
                          <div className="mt-2 text-xs flex items-center gap-1.5 bg-black/20 w-fit px-2 py-1 rounded">
                            <span className="text-white/40">點歌人</span>
                            <span className="text-primary-foreground font-medium">{item.requesterName}</span>
                          </div>
                          {item.note && (
                            <div className="mt-1.5 text-xs text-white/50 italic border-l-2 border-white/10 pl-2">
                              "{item.note}"
                            </div>
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

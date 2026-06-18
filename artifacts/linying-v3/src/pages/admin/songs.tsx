import { useState, useEffect } from "react";
import {
  useListSongs,
  useCreateSong,
  useUpdateSong,
  useDeleteSong,
  useGetSongLyrics,
  useUpdateSongLyrics,
  useDeleteSongLyrics,
  useSearchSongLyrics,
  usePreviewGoogleSheetSync,
  useImportFromGoogleSheet,
  getListSongsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const LANGS = ["中文", "日文", "韓文", "英文", "其他"];
const COOLDOWN_MODES = [
  { value: "warn", label: "警告" },
  { value: "block", label: "禁止" },
];

type Song = {
  id: number;
  title: string;
  artist: string;
  language: string;
  status?: string;
  primaryTag?: string | null;
  categories?: string[];
  youtubeUrl?: string | null;
  isPracticing?: boolean;
  hasPitchWarning?: boolean;
  cooldownDays?: number;
  cooldownMode?: string;
  playCount?: number;
};

type SongFormData = {
  title: string;
  artist: string;
  language: string;
  primaryTag: string;
  youtubeUrl: string;
  isPracticing: boolean;
  hasPitchWarning: boolean;
  cooldownDays: number;
  cooldownMode: string;
};

const DEFAULT_FORM: SongFormData = {
  title: "",
  artist: "",
  language: "日文",
  primaryTag: "",
  youtubeUrl: "",
  isPracticing: false,
  hasPitchWarning: false,
  cooldownDays: 0,
  cooldownMode: "warn",
};

function songToForm(s: Song): SongFormData {
  return {
    title: s.title,
    artist: s.artist,
    language: s.language,
    primaryTag: s.primaryTag ?? "",
    youtubeUrl: s.youtubeUrl ?? "",
    isPracticing: s.isPracticing ?? false,
    hasPitchWarning: s.hasPitchWarning ?? false,
    cooldownDays: s.cooldownDays ?? 0,
    cooldownMode: s.cooldownMode ?? "warn",
  };
}

function SongFormFields({ form, onChange }: { form: SongFormData; onChange: (f: SongFormData) => void }) {
  const set = (k: keyof SongFormData) => (v: unknown) => onChange({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest">歌名 *</Label>
          <Input value={form.title} onChange={(e) => set("title")(e.target.value)} className="bg-background/50 border-border/50" data-testid="input-song-title" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest">歌手 *</Label>
          <Input value={form.artist} onChange={(e) => set("artist")(e.target.value)} className="bg-background/50 border-border/50" data-testid="input-song-artist" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest">語言 *</Label>
          <Select value={form.language} onValueChange={set("language")}>
            <SelectTrigger className="bg-background/50 border-border/50" data-testid="select-song-lang">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest">主分類標籤</Label>
          <Input value={form.primaryTag} onChange={(e) => set("primaryTag")(e.target.value)} placeholder="選填" className="bg-background/50 border-border/50" data-testid="input-song-tag" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest">YouTube URL</Label>
          <Input value={form.youtubeUrl} onChange={(e) => set("youtubeUrl")(e.target.value)} placeholder="https://..." className="bg-background/50 border-border/50" data-testid="input-song-youtube" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest">冷卻天數</Label>
          <Input type="number" min={0} value={form.cooldownDays} onChange={(e) => set("cooldownDays")(Number(e.target.value))} className="bg-background/50 border-border/50" data-testid="input-song-cooldown" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest">冷卻模式</Label>
          <Select value={form.cooldownMode} onValueChange={set("cooldownMode")}>
            <SelectTrigger className="bg-background/50 border-border/50" data-testid="select-cooldown-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COOLDOWN_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-6 pt-1">
        <div className="flex items-center gap-2">
          <Switch checked={form.isPracticing} onCheckedChange={set("isPracticing")} id="sw-practice" data-testid="switch-practicing" />
          <Label htmlFor="sw-practice" className="text-sm cursor-pointer">練習中</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.hasPitchWarning} onCheckedChange={set("hasPitchWarning")} id="sw-pitch" data-testid="switch-pitch" />
          <Label htmlFor="sw-pitch" className="text-sm cursor-pointer">高音警告</Label>
        </div>
      </div>
    </div>
  );
}

function LyricsPanel({ songId, songTitle, songArtist }: { songId: number; songTitle: string; songArtist: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: lyricsData, isLoading: lyricsLoading } = useGetSongLyrics(songId);
  const updateLyrics = useUpdateSongLyrics();
  const deleteLyrics = useDeleteSongLyrics();
  const searchLyrics = useSearchSongLyrics();

  const [searchTitle, setSearchTitle] = useState(songTitle);
  const [searchArtist, setSearchArtist] = useState(songArtist);
  const [searchResults, setSearchResults] = useState<{ provider: string; lyricsText: string; lyricsFormat: string; previewLines: string[] }[]>([]);
  type LyricsResultItem = { provider: string; lyricsText: string; lyricsFormat: string; previewLines: string[] };
  const [manualLrc, setManualLrc] = useState("");
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    if (lyricsData?.lyricsText) setManualLrc(lyricsData.lyricsText);
  }, [lyricsData]);

  const handleSearch = async () => {
    try {
      const res = await searchLyrics.mutateAsync({ id: songId, data: { provider: "auto", title: searchTitle, artist: searchArtist } });
      const items = (res as unknown as { results: LyricsResultItem[] }).results ?? [];
      setSearchResults(items);
      if (items.length === 0) toast({ title: "未找到歌詞" });
    } catch {
      toast({ title: "搜尋失敗", variant: "destructive" });
    }
  };

  const handleSelectResult = async (r: { lyricsText: string; lyricsFormat: string; provider: string }) => {
    try {
      await updateLyrics.mutateAsync({
        id: songId,
        data: {
          lyricsText: r.lyricsText,
          lyricsFormat: r.lyricsFormat as "lrc" | "krc" | "yrc" | "plain",
          lyricsSource: r.provider as "lrclib" | "netease" | "manual",
        },
      });
      queryClient.invalidateQueries();
      toast({ title: "歌詞已儲存" });
      setSearchResults([]);
    } catch {
      toast({ title: "儲存失敗", variant: "destructive" });
    }
  };

  const handleSaveManual = async () => {
    try {
      await updateLyrics.mutateAsync({
        id: songId,
        data: { lyricsText: manualLrc, lyricsFormat: "lrc", lyricsSource: "manual" },
      });
      queryClient.invalidateQueries();
      toast({ title: "歌詞已儲存" });
      setShowManual(false);
    } catch {
      toast({ title: "儲存失敗", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("確定刪除此歌詞？")) return;
    try {
      await deleteLyrics.mutateAsync({ id: songId });
      queryClient.invalidateQueries();
      toast({ title: "歌詞已刪除" });
    } catch {
      toast({ title: "刪除失敗", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {lyricsLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : lyricsData?.lyricsText ? (
        <div className="bg-background/50 rounded-lg border border-primary/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">已儲存歌詞</span>
              {lyricsData.lyricsFormat && (
                <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1.5">{lyricsData.lyricsFormat}</Badge>
              )}
              {lyricsData.lyricsSource && (
                <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1.5 border-border/50">{lyricsData.lyricsSource}</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setManualLrc(lyricsData.lyricsText ?? ""); setShowManual(true); }}>編輯</Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={handleDelete} data-testid="btn-delete-lyrics">刪除</Button>
            </div>
          </div>
          <pre className="text-[11px] text-muted-foreground font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
            {(lyricsData.lyricsText ?? "").slice(0, 400)}{(lyricsData.lyricsText ?? "").length > 400 ? "\n..." : ""}
          </pre>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">尚無歌詞資料</p>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">搜尋歌詞（LrcLib / NetEase）</p>
        <div className="flex gap-2">
          <Input value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)} placeholder="歌名" className="bg-background/50 border-border/50 text-sm" data-testid="input-lyrics-title" />
          <Input value={searchArtist} onChange={(e) => setSearchArtist(e.target.value)} placeholder="歌手" className="bg-background/50 border-border/50 text-sm" data-testid="input-lyrics-artist" />
          <Button variant="outline" size="sm" className="shrink-0" onClick={handleSearch} disabled={searchLyrics.isPending} data-testid="btn-search-lyrics">
            {searchLyrics.isPending ? "搜尋中..." : "搜尋"}
          </Button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {searchResults.map((r, i) => (
            <div key={i} className="bg-background/50 rounded-lg border border-border/50 p-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {r.previewLines?.slice(0, 2).map((line, li) => (
                  <div key={li} className="text-xs text-muted-foreground truncate">{line}</div>
                ))}
                <Badge variant="secondary" className="text-[10px] mt-1">{r.provider}</Badge>
                <Badge variant="outline" className="ml-1 text-[10px] border-border/50">{r.lyricsFormat}</Badge>
              </div>
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => handleSelectResult(r)} data-testid={`btn-select-lyrics-${i}`}>
                使用
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setManualLrc(lyricsData?.lyricsText ?? ""); setShowManual(!showManual); }} data-testid="btn-manual-lyrics">
          {showManual ? "取消手動輸入" : "手動輸入 LRC"}
        </Button>
      </div>

      {showManual && (
        <div className="space-y-2">
          <Textarea
            value={manualLrc}
            onChange={(e) => setManualLrc(e.target.value)}
            placeholder={"[00:00.00] 歌詞內容\n[00:03.50] 第二行..."}
            className="bg-background/50 border-border/50 font-mono text-xs resize-none"
            rows={8}
            data-testid="textarea-manual-lrc"
          />
          <Button size="sm" className="bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-foreground" onClick={handleSaveManual} disabled={updateLyrics.isPending} data-testid="btn-save-manual-lyrics">
            {updateLyrics.isPending ? "儲存中..." : "儲存歌詞"}
          </Button>
        </div>
      )}
    </div>
  );
}

function SongEditDialog({
  song,
  onClose,
}: {
  song: Song | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateSong = useUpdateSong();
  const [form, setForm] = useState<SongFormData>(song ? songToForm(song) : DEFAULT_FORM);
  const [tab, setTab] = useState("info");

  useEffect(() => {
    if (song) { setForm(songToForm(song)); setTab("info"); }
  }, [song]);

  const handleSave = async () => {
    if (!song) return;
    try {
      await updateSong.mutateAsync({
        id: song.id,
        data: {
          title: form.title.trim(),
          artist: form.artist.trim(),
          language: form.language,
          primaryTag: form.primaryTag.trim() || null,
          youtubeUrl: form.youtubeUrl.trim() || null,
          isPracticing: form.isPracticing,
          hasPitchWarning: form.hasPitchWarning,
          cooldownDays: form.cooldownDays,
          cooldownMode: form.cooldownMode,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
      toast({ title: "歌曲已更新" });
      onClose();
    } catch {
      toast({ title: "更新失敗", variant: "destructive" });
    }
  };

  if (!song) return null;

  return (
    <Dialog open={!!song} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="glass-card border-border/50 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate text-foreground">{song.title}</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-background/50 border border-border/50 w-full">
            <TabsTrigger value="info" className="flex-1 text-xs" data-testid="tab-song-info">基本資訊</TabsTrigger>
            <TabsTrigger value="lyrics" className="flex-1 text-xs" data-testid="tab-song-lyrics">歌詞</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="pt-4">
            <SongFormFields form={form} onChange={setForm} />
            <Button
              className="w-full mt-6 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-foreground"
              onClick={handleSave}
              disabled={!form.title.trim() || !form.artist.trim() || updateSong.isPending}
              data-testid="btn-save-song"
            >
              {updateSong.isPending ? "儲存中..." : "儲存變更"}
            </Button>
          </TabsContent>
          <TabsContent value="lyrics" className="pt-4">
            <LyricsPanel songId={song.id} songTitle={song.title} songArtist={song.artist} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CreateSongDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createSong = useCreateSong();
  const [form, setForm] = useState<SongFormData>(DEFAULT_FORM);

  useEffect(() => { if (open) setForm(DEFAULT_FORM); }, [open]);

  const handleCreate = async () => {
    try {
      await createSong.mutateAsync({
        data: {
          title: form.title.trim(),
          artist: form.artist.trim(),
          language: form.language,
          primaryTag: form.primaryTag.trim() || null,
          youtubeUrl: form.youtubeUrl.trim() || null,
          isPracticing: form.isPracticing,
          hasPitchWarning: form.hasPitchWarning,
          cooldownDays: form.cooldownDays,
          cooldownMode: form.cooldownMode,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
      toast({ title: "歌曲已新增" });
      onClose();
    } catch {
      toast({ title: "新增失敗", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="glass-card border-border/50 max-w-lg">
        <DialogHeader>
          <DialogTitle>新增歌曲</DialogTitle>
        </DialogHeader>
        <SongFormFields form={form} onChange={setForm} />
        <Button
          className="w-full mt-4 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-foreground"
          onClick={handleCreate}
          disabled={!form.title.trim() || !form.artist.trim() || createSong.isPending}
          data-testid="btn-confirm-create-song"
        >
          {createSong.isPending ? "新增中..." : "新增歌曲"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function SheetImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const previewSync = usePreviewGoogleSheetSync();
  const importFromSheet = useImportFromGoogleSheet();

  const [sheetUrl, setSheetUrl] = useState("");
  const [preview, setPreview] = useState<any>(null);

  const handlePreview = async () => {
    try {
      const res = await previewSync.mutateAsync({ data: { sheetUrl } });
      setPreview(res);
    } catch (err: any) {
      toast({ title: "預覽失敗", description: err?.data?.error ?? "無法讀取試算表", variant: "destructive" });
    }
  };

  const handleImport = async () => {
    try {
      const res = await importFromSheet.mutateAsync({ data: { sheetUrl } });
      queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
      toast({ title: "匯入完成", description: `新增 ${(res as any).created ?? 0} 首，更新 ${(res as any).updated ?? 0} 首` });
      onClose();
      setPreview(null);
      setSheetUrl("");
    } catch (err: any) {
      toast({ title: "匯入失敗", description: err?.data?.error ?? "請確認試算表格式", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) { onClose(); setPreview(null); } }}>
      <DialogContent className="glass-card border-border/50 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>從 Google 試算表匯入</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">試算表須公開可讀。欄位：歌名/title、歌手/artist、語種/language、youtube/url、修練/practice、破音/pitch、分類/category</p>
          <div className="flex gap-2">
            <Input
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="貼上 Google 試算表網址"
              className="bg-background/50 border-border/50 flex-1"
              data-testid="input-sheet-url"
            />
            <Button variant="outline" onClick={handlePreview} disabled={!sheetUrl.trim() || previewSync.isPending} data-testid="btn-preview-sheet">
              {previewSync.isPending ? "讀取中..." : "預覽"}
            </Button>
          </div>

          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "新增", value: preview.toCreate?.length ?? 0, color: "text-primary" },
                  { label: "更新", value: preview.toUpdate?.length ?? 0, color: "text-foreground" },
                  { label: "略過", value: preview.toSkip?.length ?? 0, color: "text-muted-foreground" },
                ].map((s) => (
                  <Card key={s.label} className="glass-card p-3">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </Card>
                ))}
              </div>
              {preview.toCreate?.length > 0 && (
                <div className="bg-background/50 rounded-lg border border-border/50 p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-widest">將新增</p>
                  {preview.toCreate.map((s: any, i: number) => (
                    <div key={i} className="text-xs text-foreground truncate">{s.title} — {s.artist}</div>
                  ))}
                </div>
              )}
              <Button
                className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-foreground"
                onClick={handleImport}
                disabled={importFromSheet.isPending}
                data-testid="btn-confirm-import"
              >
                {importFromSheet.isPending ? "匯入中..." : "確認匯入"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SongsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteSong = useDeleteSong();

  const [search, setSearch] = useState("");
  const [lang, setLang] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editTarget, setEditTarget] = useState<Song | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useListSongs({
    search: debouncedSearch || undefined,
    language: lang || undefined,
    page,
    limit: 20,
  });

  const songs = data?.songs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`確定刪除「${title}」？`)) return;
    try {
      await deleteSong.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
      toast({ title: "歌曲已刪除" });
    } catch (err: any) {
      toast({ title: err?.data?.error ?? "刪除失敗", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">歌曲管理</h2>
          <p className="text-muted-foreground text-sm mt-1">共 {total} 首歌曲</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)} data-testid="btn-import-songs">
            試算表匯入
          </Button>
          <Button className="bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-foreground" onClick={() => setShowCreate(true)} data-testid="btn-create-song">
            新增歌曲
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="search"
          placeholder="搜尋歌名、歌手..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-card/50 border-border/50 focus:border-primary/50"
          data-testid="input-search"
        />
        <Select value={lang} onValueChange={(v) => { setLang(v === "全部" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-36 bg-card/50 border-border/50" data-testid="select-filter-lang">
            <SelectValue placeholder="語言" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="全部">全部語言</SelectItem>
            {LANGS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : songs.length === 0 ? (
        <Card className="glass-card p-10 text-center text-muted-foreground border-dashed">
          {debouncedSearch ? "找不到符合條件的歌曲" : "歌曲庫是空的，請先新增歌曲"}
        </Card>
      ) : (
        <div className="space-y-2">
          {songs.map((song) => (
            <Card key={song.id} className="glass-card p-4 hover:bg-card/90 transition-colors" data-testid={`song-row-${song.id}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{song.title}</span>
                    {song.isPracticing && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">練習中</Badge>}
                    {song.hasPitchWarning && <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-yellow-600/50 text-yellow-500">高音</Badge>}
                    {(song.cooldownDays ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary/70">
                        冷卻 {song.cooldownDays}d
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span>{song.artist}</span>
                    <span>·</span>
                    <span>{song.language}</span>
                    {song.primaryTag && <><span>·</span><span>{song.primaryTag}</span></>}
                    <span>·</span>
                    <span>演唱 {song.playCount ?? 0} 次</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => setEditTarget(song)} data-testid={`btn-edit-${song.id}`}>
                    編輯
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(song.id, song.title)} data-testid={`btn-delete-${song.id}`}>
                    刪除
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>上一頁</Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>下一頁</Button>
        </div>
      )}

      <SongEditDialog song={editTarget} onClose={() => setEditTarget(null)} />
      <CreateSongDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <SheetImportDialog open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}

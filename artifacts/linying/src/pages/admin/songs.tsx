import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSongs,
  getListSongsQueryKey,
  useCreateSong,
  useUpdateSong,
  useDeleteSong,
  useImportFromGoogleSheet,
  usePreviewGoogleSheetSync,
  useListCategories,
  useAnalyzeUrl,
  type YouTubeAnalysis,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, DownloadCloud, AlertCircle, RefreshCw, Zap, Sparkles, ArrowLeft, ExternalLink } from "lucide-react";

const LANGUAGES = ["中文", "日文", "英文", "韓文", "小語種"];
const STATUSES = ["已解鎖", "🐣修練中", "👑招牌曲", "🎤高完成度", "❄️季節限定"];

// Client-side title cleaner — strips metadata and extracts clean song title
function cleanTitle(title: string): string {
  let t = title;
  // 1. Remove 「...」 and 【...】 bracketed content entirely
  t = t.replace(/「[^」]*」/g, "");
  t = t.replace(/【[^】]*】/g, "");
  // 2. Remove (...) / （...） containing metadata keywords
  const metaKw = "原唱|Cover|Lyrics|動態歌詞|Official|MV|Full\\s*Ver|中文翻譯|日文翻譯|pinyin|Karaoke|カラオケ|翻唱|伴奏|歌詞|Subtitles?";
  t = t.replace(new RegExp(`（[^）]*(${metaKw})[^）]*）`, "gi"), "");
  t = t.replace(new RegExp(`\\([^)]*(${metaKw})[^)]*\\)`, "gi"), "");
  // 3. Remove trailing suffix metadata after separators
  const suffixes: RegExp[] = [
    /[\s\-–|｜]+(?:Official\s+)?(?:Music\s+Video|Lyric\s*Video|Video|MV|Audio)$/gi,
    /[\s\-–|｜]+Lyrics?$/gi,
    /[\s\-–|｜]+動態歌詞$/g,
    /[\s\-–|｜]+歌詞$/g,
    /[\s\-–|｜]+Cover$/gi,
    /[\s\-–|｜]+Karaoke$/gi,
    /[\s\-–|｜]+カラオケ$/g,
    /[\s\-–|｜]+原唱$/g,
    /[\s\-–|｜]+翻唱$/g,
    /[\s\-–|｜]+伴奏$/g,
    /[\s\-–|｜]+Full\s*(?:Ver(?:sion)?)?$/gi,
    /[\s\-–|｜]+中文(?:翻譯|版)?$/g,
    /[\s\-–|｜]+日文(?:翻譯|版)?$/g,
    /[\s\-–|｜]+pinyin$/gi,
    /[\s\-–|｜]+(?:English\s+)?Subtitles?$/gi,
  ];
  for (const p of suffixes) t = t.replace(p, "");
  // 4. Handle "Artist - Title" format: keep the rightmost segment after " - "
  //    (common YouTube pattern: "不是花火呀 - Ring Ring Ring")
  const dashParts = t.split(/\s+-\s+/);
  if (dashParts.length >= 2) {
    t = dashParts[dashParts.length - 1];
  }
  return t.trim();
}

function TagChips({ selected, available, onChange }: {
  selected: string[];
  available: string[];
  onChange: (tags: string[]) => void;
}) {
  const all = Array.from(new Set([...available, ...selected])).sort();
  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag]);
  };
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {all.map(tag => (
        <button
          key={tag}
          type="button"
          onClick={() => toggle(tag)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
            selected.includes(tag)
              ? 'bg-primary text-white border-primary font-medium'
              : 'bg-transparent border-border text-[#4B5563] hover:border-primary/50'
          }`}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}

type FormData = {
  title: string;
  artist: string;
  language: string;
  status: string;
  youtubeUrl: string;
  isPracticing: boolean;
  hasPitchWarning: boolean;
  categories: string[];
  primaryTag: string;
};

const defaultForm: FormData = {
  title: "", artist: "", language: "日文", status: "已解鎖",
  youtubeUrl: "", isPracticing: false, hasPitchWarning: false, categories: [], primaryTag: "",
};

function SongForm({ data, onChange, availableTags, availablePrimaryTags }: {
  data: FormData;
  onChange: (d: FormData) => void;
  availableTags: string[];
  availablePrimaryTags: string[];
}) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label className="text-sm font-medium text-[#4B5563]">歌名 <span className="text-destructive">*</span></Label>
          <Input value={data.title} onChange={e => onChange({...data, title: e.target.value})} placeholder="歌曲名稱" />
        </div>
        <div className="grid gap-2">
          <Label className="text-sm font-medium text-[#4B5563]">歌手</Label>
          <Input value={data.artist} onChange={e => onChange({...data, artist: e.target.value})} placeholder="演唱者" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label className="text-sm font-medium text-[#4B5563]">語種 <span className="text-destructive">*</span></Label>
          <Select value={data.language} onValueChange={v => onChange({...data, language: v})}>
            <SelectTrigger><SelectValue placeholder="選擇語種" /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label className="text-sm font-medium text-[#4B5563]">狀態</Label>
          <Select value={data.status} onValueChange={v => onChange({...data, status: v})}>
            <SelectTrigger><SelectValue placeholder="選擇狀態" /></SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label className="text-sm font-medium text-[#4B5563]">YouTube 網址 <span className="text-[#6B7280] font-normal text-xs">（選填）</span></Label>
        <Input value={data.youtubeUrl} onChange={e => onChange({...data, youtubeUrl: e.target.value})} placeholder="https://youtube.com/..." />
      </div>
      {availablePrimaryTags.length > 0 && (
        <div className="grid gap-1.5">
          <Label className="text-sm font-medium text-[#4B5563]">
            主要分類 <span className="text-[#6B7280] font-normal text-xs">（單選，顯示於歌曲列表）</span>
          </Label>
          <Select value={data.primaryTag || "__none__"} onValueChange={v => onChange({...data, primaryTag: v === "__none__" ? "" : v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— 不設定 —</SelectItem>
              {availablePrimaryTags.map(tag => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label className="text-sm font-medium text-[#4B5563]">
          附加標籤 <span className="text-[#6B7280] font-normal text-xs">（可複選）</span>
        </Label>
        <TagChips selected={data.categories} available={availableTags} onChange={tags => onChange({...data, categories: tags})} />
        {data.categories.length === 0 && <p className="text-xs text-[#6B7280]">點選標籤加入，或由 Google Sheet 匯入後自動建立</p>}
      </div>
    </div>
  );
}

export default function AdminSongs() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingSongId, setEditingSongId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [importUrl, setImportUrl] = useState("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Quick Add state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [qaStep, setQaStep] = useState<"url" | "form">("url");
  const [qaUrl, setQaUrl] = useState("");
  const [qaResult, setQaResult] = useState<YouTubeAnalysis | null>(null);
  const [qaForm, setQaForm] = useState<FormData>(defaultForm);

  const { data: songsData, isLoading } = useListSongs(
    { search: search || undefined, limit: 200 },
    { query: { queryKey: getListSongsQueryKey({ search: search || undefined, limit: 200 }) } }
  );
  const { data: categoriesData } = useListCategories();

  const availableTags = Array.from(new Set([
    ...(categoriesData?.categories.map(c => c.name) ?? []),
    ...(songsData?.songs.flatMap(s => s.categories ?? []) ?? []),
  ])).filter(Boolean).sort();

  const availablePrimaryTags = (categoriesData?.categories ?? [])
    .filter(c => c.type !== "language")
    .map(c => c.name)
    .sort();

  const createSong = useCreateSong();
  const updateSong = useUpdateSong();
  const deleteSong = useDeleteSong();
  const importSheet = useImportFromGoogleSheet();
  const previewSheet = usePreviewGoogleSheetSync();
  const analyzeUrl = useAnalyzeUrl();

  const invalidateSongs = () => queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });

  const handleCreate = () => {
    createSong.mutate({
      data: {
        ...formData,
        status: formData.status as any,
        youtubeUrl: formData.youtubeUrl || null,
        isPracticing: formData.status.includes("修練"),
        hasPitchWarning: formData.categories.some(t => t.includes("破音")),
        primaryTag: formData.primaryTag || null,
      } as any
    }, {
      onSuccess: () => { toast.success("新增成功"); setIsCreateOpen(false); setFormData(defaultForm); invalidateSongs(); },
      onError: () => toast.error("新增失敗"),
    });
  };

  const handleEdit = (song: any) => {
    setEditingSongId(song.id);
    setFormData({
      title: song.title,
      artist: song.artist,
      language: song.language || "日文",
      status: song.status || "已解鎖",
      youtubeUrl: song.youtubeUrl || "",
      isPracticing: song.isPracticing,
      hasPitchWarning: song.hasPitchWarning,
      categories: song.categories || [],
      primaryTag: song.primaryTag || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingSongId) return;
    updateSong.mutate({
      id: editingSongId,
      data: {
        ...formData,
        status: formData.status as any,
        youtubeUrl: formData.youtubeUrl || null,
        isPracticing: formData.status.includes("修練"),
        hasPitchWarning: formData.categories.some(t => t.includes("破音")),
        primaryTag: formData.primaryTag || null,
      } as any
    }, {
      onSuccess: () => { toast.success("更新成功"); setIsEditOpen(false); setFormData(defaultForm); setEditingSongId(null); invalidateSongs(); },
      onError: () => toast.error("更新失敗"),
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這首歌嗎？")) {
      deleteSong.mutate({ id }, {
        onSuccess: () => { toast.success("刪除成功"); invalidateSongs(); },
        onError: () => toast.error("刪除失敗"),
      });
    }
  };

  const handleInlineUpdate = (id: number, patch: Record<string, unknown>) => {
    updateSong.mutate({ id, data: patch as any }, {
      onSuccess: () => invalidateSongs(),
      onError: () => toast.error("更新失敗"),
    });
  };

  const handlePreview = () => {
    if (!importUrl) return;
    previewSheet.mutate({ data: { sheetUrl: importUrl } }, {
      onSuccess: (data) => { setPreviewData(data); setConfirmed(false); },
      onError: () => toast.error("無法讀取 Google Sheet，請確認網址或分享設定"),
    });
  };

  const handleImport = () => {
    importSheet.mutate({ data: { sheetUrl: importUrl } }, {
      onSuccess: (res: any) => {
        toast.success(`同步完成！新增: ${res.imported}，更新: ${res.updated}，略過: ${res.skipped}`);
        setIsImportOpen(false);
        setImportUrl("");
        setPreviewData(null);
        setConfirmed(false);
        invalidateSongs();
      },
      onError: () => toast.error("同步失敗，請確認網址或權限"),
    });
  };

  // Quick Add handlers
  const openQuickAdd = () => {
    setQaStep("url");
    setQaUrl("");
    setQaResult(null);
    setQaForm(defaultForm);
    setIsQuickAddOpen(true);
  };

  const handleAnalyze = () => {
    if (!qaUrl) return;
    analyzeUrl.mutate({ data: { url: qaUrl } }, {
      onSuccess: (data) => {
        setQaResult(data);
        setQaForm({
          title: data.suggestedTitle,
          artist: data.suggestedArtist,
          language: "日文",
          status: "🐣修練中",
          youtubeUrl: data.youtubeUrl,
          isPracticing: true,
          hasPitchWarning: false,
          categories: [],
          primaryTag: "",
        });
        setQaStep("form");
      },
      onError: (err: any) => {
        const msg = err?.data?.error ?? "分析失敗，請確認網址正確且影片為公開";
        toast.error(msg);
      },
    });
  };

  const handleQuickAddSave = () => {
    createSong.mutate({
      data: {
        ...qaForm,
        status: qaForm.status as any,
        youtubeUrl: qaForm.youtubeUrl || null,
        isPracticing: qaForm.status.includes("修練"),
        hasPitchWarning: qaForm.categories.some(t => t.includes("破音")),
        primaryTag: qaForm.primaryTag || null,
      } as any
    }, {
      onSuccess: () => {
        toast.success(`「${qaForm.title}」新增成功 🎵`);
        setIsQuickAddOpen(false);
        invalidateSongs();
      },
      onError: () => toast.error("新增失敗"),
    });
  };

  function statusChipStyle(status: string): React.CSSProperties {
    if (status.includes("修練中"))   return { background: "rgba(234,179,8,0.13)",  color: "#92610a", border: "1px solid rgba(234,179,8,0.30)" };
    if (status.includes("高完成度")) return { background: "rgba(59,130,246,0.11)", color: "#1e40af", border: "1px solid rgba(59,130,246,0.30)" };
    if (status.includes("招牌曲"))   return { background: "rgba(139,92,246,0.11)", color: "#6b21a8", border: "1px solid rgba(139,92,246,0.30)" };
    if (status.includes("季節限定")) return { background: "rgba(20,184,166,0.11)", color: "#0f766e", border: "1px solid rgba(20,184,166,0.28)" };
    return { background: "rgba(107,114,128,0.09)", color: "#374151", border: "1px solid rgba(107,114,128,0.22)" };
  }

  const StatusCell = ({ song }: { song: any }) => {
    const status = song.status || (song.isPracticing ? "🐣修練中" : "已解鎖");
    const hasPitch = song.categories?.some((t: string) => t.includes("破音")) || song.hasPitchWarning;
    return (
      <div className="flex gap-1 flex-wrap">
        {status !== "已解鎖" && (
          <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded-md font-medium" style={statusChipStyle(status)}>
            {status}
          </span>
        )}
        {hasPitch && (
          <span className="inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-md font-medium"
            style={{ background: "rgba(239,68,68,0.09)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.22)" }}>
            <AlertCircle className="w-2.5 h-2.5" />破音
          </span>
        )}
        {status === "已解鎖" && !hasPitch && (
          <span className="text-xs text-[#6B7280]">已解鎖</span>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">歌曲管理</h1>
            <p className="text-[#4B5563] text-sm">快速新增或管理歌單。</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            {/* Google Sheet Sync */}
            <Dialog open={isImportOpen} onOpenChange={v => { setIsImportOpen(v); if (!v) { setPreviewData(null); setConfirmed(false); }}}>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsImportOpen(true)}>
                <DownloadCloud className="w-4 h-4" />
                Sheet 同步
              </Button>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle className="text-[#243447]">從 Google Sheet 同步歌單</DialogTitle>
                  <p className="text-xs text-[#6B7280] mt-1">
                    欄位對應：A=歌名　B=歌手　C=語種　D=標籤　E=狀態
                  </p>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[#4B5563]">Google Sheet 網址</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={importUrl}
                        onChange={e => { setImportUrl(e.target.value); setPreviewData(null); setConfirmed(false); }}
                        className="flex-1"
                      />
                      <Button variant="outline" size="sm" className="flex-shrink-0 gap-1"
                        onClick={handlePreview} disabled={!importUrl || previewSheet.isPending}>
                        {previewSheet.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "預覽"}
                      </Button>
                    </div>
                    <p className="text-xs text-[#6B7280]">需設定為「知道連結的使用者皆可檢視」</p>
                  </div>
                  {previewData && (
                    <div className="rounded-lg border border-border p-4 space-y-3"
                      style={{ background: "rgba(245,247,250,0.80)" }}>
                      <p className="text-sm font-semibold text-[#243447]">偵測到 {previewData.rowsDetected} 列資料</p>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{previewData.newSongs}</div>
                          <div className="text-xs text-[#6B7280]">新增</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{previewData.updatedSongs}</div>
                          <div className="text-xs text-[#6B7280]">更新</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#6B7280]">{previewData.skippedSongs}</div>
                          <div className="text-xs text-[#6B7280]">略過</div>
                        </div>
                      </div>
                      {previewData.errors?.length > 0 && (
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {previewData.errors.map((e: string, i: number) => (
                            <p key={i} className="text-xs text-amber-700">{e}</p>
                          ))}
                        </div>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="rounded" />
                        <span className="text-sm text-[#4B5563]">確認同步 {previewData.newSongs + previewData.updatedSongs} 首歌曲</span>
                      </label>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsImportOpen(false)}>取消</Button>
                  <Button onClick={handleImport} disabled={!importUrl || !previewData || !confirmed || importSheet.isPending}>
                    {importSheet.isPending ? "同步中..." : "開始同步"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Manual create */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setFormData(defaultForm); setIsCreateOpen(true); }}>
                <Plus className="w-4 h-4" />手動新增
              </Button>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle className="text-[#243447]">手動新增歌曲</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <SongForm data={formData} onChange={setFormData} availableTags={availableTags} availablePrimaryTags={availablePrimaryTags} />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>取消</Button>
                  <Button onClick={handleCreate} disabled={!formData.title || !formData.language || createSong.isPending}>
                    確認新增
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Quick Add — primary */}
            <Button size="sm" className="gap-1.5" onClick={openQuickAdd}>
              <Zap className="w-4 h-4" />快速新增
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <Input
            placeholder="搜尋歌曲..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="border border-border/60 rounded-xl overflow-hidden">
          <Table>
            <TableHeader style={{ background: "rgba(245,247,250,0.80)" }}>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-[#4B5563] font-semibold">歌名</TableHead>
                <TableHead className="text-[#4B5563] font-semibold">歌手</TableHead>
                <TableHead className="text-[#4B5563] font-semibold">語種</TableHead>
                <TableHead className="text-[#4B5563] font-semibold">狀態</TableHead>
                <TableHead className="text-[#4B5563] font-semibold">標籤</TableHead>
                <TableHead className="text-[#4B5563] font-semibold text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#6B7280]">載入中...</TableCell></TableRow>
              ) : songsData?.songs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-[#6B7280]">無資料</TableCell></TableRow>
              ) : (
                songsData?.songs.map(song => (
                  <TableRow key={song.id} className="border-border/40 hover:bg-black/[0.02]">
                    <TableCell className="font-medium text-[#243447] max-w-[160px] truncate">{song.title}</TableCell>
                    <TableCell className="text-[#4B5563]">{song.artist || "—"}</TableCell>
                    <TableCell>
                      <Select value={song.language} onValueChange={v => handleInlineUpdate(song.id, { language: v })}>
                        <SelectTrigger className="h-7 text-xs w-[90px] border-border/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map(l => <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={(song as any).status || "已解鎖"} onValueChange={v => handleInlineUpdate(song.id, { status: v })}>
                        <SelectTrigger className="h-7 text-xs w-[120px] border-border/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(song.categories ?? []).slice(0, 4).map((tag: string) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded text-[#4B5563]"
                            style={{ background: "rgba(112,136,163,0.10)" }}>
                            #{tag}
                          </span>
                        ))}
                        {(song.categories ?? []).length > 4 && (
                          <span className="text-[10px] text-[#6B7280]">+{(song.categories ?? []).length - 4}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(song)} className="h-8 w-8">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(song.id)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[#243447]">編輯歌曲</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <SongForm data={formData} onChange={setFormData} availableTags={availableTags} availablePrimaryTags={availablePrimaryTags} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>取消</Button>
            <Button onClick={handleUpdate} disabled={!formData.title || !formData.language || updateSong.isPending}>
              儲存變更
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Dialog */}
      <Dialog open={isQuickAddOpen} onOpenChange={open => {
        setIsQuickAddOpen(open);
        if (!open) { setQaStep("url"); setQaUrl(""); setQaResult(null); }
      }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-[#243447] flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />快速新增歌曲
            </DialogTitle>
          </DialogHeader>

          {qaStep === "url" ? (
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-[#4B5563] font-medium">YouTube 影片網址</Label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={qaUrl}
                  onChange={e => setQaUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && qaUrl) handleAnalyze(); }}
                  autoFocus
                />
                <p className="text-xs text-[#6B7280]">貼上 YouTube 網址，自動取得歌名與歌手</p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsQuickAddOpen(false)}>取消</Button>
                <Button onClick={handleAnalyze} disabled={!qaUrl || analyzeUrl.isPending}>
                  {analyzeUrl.isPending ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />分析中...</>
                  ) : (
                    <>分析影片 →</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="py-3 space-y-4">
              {/* Thumbnail + original info */}
              {qaResult && (
                <div className="flex gap-3 p-3 rounded-xl border border-border/50" style={{ background: "rgba(245,247,250,0.70)" }}>
                  {qaResult.thumbnailUrl && (
                    <img
                      src={qaResult.thumbnailUrl}
                      alt="thumbnail"
                      className="w-20 h-14 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6B7280] mb-0.5">原始標題</p>
                    <p className="text-sm text-[#243447] font-medium leading-snug line-clamp-2">{qaResult.rawTitle}</p>
                    <p className="text-xs text-[#6B7280] mt-1 truncate">頻道：{qaResult.channelName}</p>
                    {qaResult.youtubeUrl && (
                      <a href={qaResult.youtubeUrl} target="_blank" rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                        <ExternalLink className="w-3 h-3" />在 YouTube 開啟
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Duplicate warning */}
              {qaResult && qaResult.similarSongs.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">找到相似歌曲</p>
                    {qaResult.similarSongs.slice(0, 3).map((s: any) => (
                      <p key={s.id} className="text-xs text-amber-700 mt-0.5">
                        「{s.title}」— {s.artist}
                      </p>
                    ))}
                    <p className="text-xs text-amber-600 mt-1">可繼續新增，系統不會自動合併</p>
                  </div>
                </div>
              )}

              {/* Editable form */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-[#4B5563]">歌名 <span className="text-destructive">*</span></Label>
                    <div className="flex gap-1.5">
                      <Input
                        value={qaForm.title}
                        onChange={e => setQaForm({ ...qaForm, title: e.target.value })}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="flex-shrink-0 h-9 w-9"
                        title="Auto Clean"
                        onClick={() => setQaForm({ ...qaForm, title: cleanTitle(qaForm.title) })}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-[#4B5563]">歌手</Label>
                    <Input
                      value={qaForm.artist}
                      onChange={e => setQaForm({ ...qaForm, artist: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-[#4B5563]">語種</Label>
                    <Select value={qaForm.language} onValueChange={v => setQaForm({ ...qaForm, language: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-[#4B5563]">狀態</Label>
                    <Select value={qaForm.status} onValueChange={v => setQaForm({ ...qaForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#4B5563]">標籤</Label>
                  <TagChips selected={qaForm.categories} available={availableTags} onChange={tags => setQaForm({ ...qaForm, categories: tags })} />
                </div>
              </div>

              <DialogFooter className="pt-1">
                <Button variant="ghost" size="sm" onClick={() => setQaStep("url")} className="gap-1 mr-auto">
                  <ArrowLeft className="w-3.5 h-3.5" />重新輸入
                </Button>
                <Button variant="ghost" onClick={() => setIsQuickAddOpen(false)}>取消</Button>
                <Button onClick={handleQuickAddSave} disabled={!qaForm.title || createSong.isPending}>
                  {createSong.isPending ? "新增中..." : "確認新增"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

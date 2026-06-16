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
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, DownloadCloud, AlertCircle, RefreshCw } from "lucide-react";

const LANGUAGES = ["中文", "日文", "英文", "韓文", "小語種"];
const STATUSES = ["已解鎖", "🐣修練中", "👑招牌曲", "🎤高完成度", "❄️季節限定"];

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

function SongForm({ data, onChange, availableTags }: {
  data: FormData;
  onChange: (d: FormData) => void;
  availableTags: string[];
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
      <div className="grid gap-2">
        <Label className="text-sm font-medium text-[#4B5563]">標籤</Label>
        <TagChips selected={data.categories} available={availableTags} onChange={tags => onChange({...data, categories: tags})} />
        {data.categories.length === 0 && <p className="text-xs text-[#6B7280]">點選標籤加入，或由 Google Sheet 匯入後自動建立</p>}
      </div>
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
};

const defaultForm: FormData = {
  title: "", artist: "", language: "日文", status: "已解鎖",
  youtubeUrl: "", isPracticing: false, hasPitchWarning: false, categories: [],
};

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

  const { data: songsData, isLoading } = useListSongs(
    { search: search || undefined, limit: 200 },
    { query: { queryKey: getListSongsQueryKey({ search: search || undefined, limit: 200 }) } }
  );
  const { data: categoriesData } = useListCategories();

  // Collect all tags used in songs for the chip selector
  const availableTags = Array.from(new Set([
    ...(categoriesData?.categories.map(c => c.name) ?? []),
    ...(songsData?.songs.flatMap(s => s.categories ?? []) ?? []),
  ])).filter(Boolean).sort();

  const createSong = useCreateSong();
  const updateSong = useUpdateSong();
  const deleteSong = useDeleteSong();
  const importSheet = useImportFromGoogleSheet();
  const previewSheet = usePreviewGoogleSheetSync();

  const invalidateSongs = () => queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });

  const handleCreate = () => {
    createSong.mutate({
      data: {
        ...formData,
        status: formData.status as any,
        youtubeUrl: formData.youtubeUrl || null,
        isPracticing: formData.status.includes("修練"),
        hasPitchWarning: formData.categories.some(t => t.includes("破音")),
      }
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
      }
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

  const StatusCell = ({ song }: { song: any }) => {
    const status = song.status || (song.isPracticing ? "🐣修練中" : "已解鎖");
    const hasPitch = song.categories?.some((t: string) => t.includes("破音")) || song.hasPitchWarning;
    return (
      <div className="flex gap-1 flex-wrap">
        {status !== "已解鎖" && (
          <Badge variant="outline" className="text-xs border-amber-400/50 text-amber-700 bg-amber-50">{status}</Badge>
        )}
        {hasPitch && (
          <Badge variant="outline" className="text-xs border-red-400/50 text-red-700 bg-red-50 flex items-center gap-0.5">
            <AlertCircle className="w-2.5 h-2.5" />破音
          </Badge>
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
            <p className="text-[#4B5563] text-sm">管理歌單、或從 Google Sheet 同步。</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {/* Google Sheet Sync */}
            <Dialog open={isImportOpen} onOpenChange={v => { setIsImportOpen(v); if (!v) { setPreviewData(null); setConfirmed(false); }}}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" data-testid="btn-open-import">
                  <DownloadCloud className="w-4 h-4" />
                  Google Sheet 同步
                </Button>
              </DialogTrigger>
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

                  {/* Preview result */}
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
                  <Button
                    onClick={handleImport}
                    disabled={!importUrl || !previewData || !confirmed || importSheet.isPending}
                  >
                    {importSheet.isPending ? "同步中..." : "開始同步"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Create song */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5" onClick={() => setFormData(defaultForm)} data-testid="btn-open-create">
                  <Plus className="w-4 h-4" />新增歌曲
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle className="text-[#243447]">新增歌曲</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <SongForm data={formData} onChange={setFormData} availableTags={availableTags} />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>取消</Button>
                  <Button onClick={handleCreate} disabled={!formData.title || !formData.language || createSong.isPending}>
                    確認新增
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                      <Badge variant="outline" className="text-xs text-[#4B5563] border-border">{song.language}</Badge>
                    </TableCell>
                    <TableCell><StatusCell song={song} /></TableCell>
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
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(song)} className="h-8 w-8" data-testid={`btn-edit-${song.id}`}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(song.id)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" data-testid={`btn-delete-${song.id}`}>
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
            <SongForm data={formData} onChange={setFormData} availableTags={availableTags} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>取消</Button>
            <Button onClick={handleUpdate} disabled={!formData.title || !formData.language || updateSong.isPending}>
              儲存變更
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

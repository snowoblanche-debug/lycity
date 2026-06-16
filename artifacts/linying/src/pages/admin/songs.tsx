import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListSongs, 
  getListSongsQueryKey, 
  useCreateSong, 
  useUpdateSong, 
  useDeleteSong,
  useImportFromGoogleSheet,
  useListCategories
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, DownloadCloud } from "lucide-react";

export default function AdminSongs() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingSongId, setEditingSongId] = useState<number | null>(null);

  const { data: songsData, isLoading } = useListSongs({ search: search || undefined, limit: 100 }, { query: { queryKey: getListSongsQueryKey({ search: search || undefined, limit: 100 }) } });
  const { data: categoriesData } = useListCategories();

  const createSong = useCreateSong();
  const updateSong = useUpdateSong();
  const deleteSong = useDeleteSong();
  const importSheet = useImportFromGoogleSheet();

  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    language: "",
    youtubeUrl: "",
    isPracticing: false,
    hasPitchWarning: false,
    categories: [] as string[]
  });

  const [importUrl, setImportUrl] = useState("");

  const resetForm = () => {
    setFormData({
      title: "",
      artist: "",
      language: "",
      youtubeUrl: "",
      isPracticing: false,
      hasPitchWarning: false,
      categories: []
    });
  };

  const handleCreate = () => {
    createSong.mutate({ data: { ...formData, youtubeUrl: formData.youtubeUrl || null } }, {
      onSuccess: () => {
        toast.success("新增成功");
        setIsCreateOpen(false);
        resetForm();
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
      }
    });
  };

  const handleEdit = (song: any) => {
    setEditingSongId(song.id);
    setFormData({
      title: song.title,
      artist: song.artist,
      language: song.language,
      youtubeUrl: song.youtubeUrl || "",
      isPracticing: song.isPracticing,
      hasPitchWarning: song.hasPitchWarning,
      categories: song.categories || []
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingSongId) return;
    updateSong.mutate({ id: editingSongId, data: { ...formData, youtubeUrl: formData.youtubeUrl || null } }, {
      onSuccess: () => {
        toast.success("更新成功");
        setIsEditOpen(false);
        resetForm();
        setEditingSongId(null);
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除這首歌嗎？")) {
      deleteSong.mutate({ id }, {
        onSuccess: () => {
          toast.success("刪除成功");
          queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
        }
      });
    }
  };

  const handleImport = () => {
    importSheet.mutate({ data: { sheetUrl: importUrl } }, {
      onSuccess: (res) => {
        toast.success(`匯入成功！新增: ${res.imported}, 略過: ${res.skipped}`);
        setIsImportOpen(false);
        setImportUrl("");
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
      },
      onError: () => toast.error("匯入失敗，請確認網址或權限")
    });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">歌曲管理</h1>
            <p className="text-muted-foreground text-sm">管理歌單、編輯歌曲資訊、或從 Google 表單匯入。</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-white/10 bg-card/50 backdrop-blur-sm" data-testid="btn-open-import">
                  <DownloadCloud className="w-4 h-4 mr-2" />
                  批次匯入
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-popover/95 backdrop-blur-xl border-white/10">
                <DialogHeader>
                  <DialogTitle>從 Google 表單匯入</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Google Sheet 網址</Label>
                    <Input 
                      placeholder="https://docs.google.com/spreadsheets/d/..." 
                      value={importUrl}
                      onChange={e => setImportUrl(e.target.value)}
                      className="bg-black/20 border-white/10"
                    />
                    <p className="text-xs text-muted-foreground">需設定為「知道連結的使用者皆可檢視」</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsImportOpen(false)}>取消</Button>
                  <Button onClick={handleImport} disabled={!importUrl || importSheet.isPending}>
                    {importSheet.isPending ? "匯入中..." : "開始匯入"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} data-testid="btn-open-create">
                  <Plus className="w-4 h-4 mr-2" />
                  新增歌曲
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-popover/95 backdrop-blur-xl border-white/10 sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>新增歌曲</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>歌名 *</Label>
                    <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-black/20 border-white/10" />
                  </div>
                  <div className="grid gap-2">
                    <Label>歌手 *</Label>
                    <Input value={formData.artist} onChange={e => setFormData({...formData, artist: e.target.value})} className="bg-black/20 border-white/10" />
                  </div>
                  <div className="grid gap-2">
                    <Label>語種 *</Label>
                    <Input value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})} className="bg-black/20 border-white/10" placeholder="例如: 日文, 中文" />
                  </div>
                  <div className="grid gap-2">
                    <Label>YouTube 網址</Label>
                    <Input value={formData.youtubeUrl} onChange={e => setFormData({...formData, youtubeUrl: e.target.value})} className="bg-black/20 border-white/10" />
                  </div>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="practicing" checked={formData.isPracticing} onCheckedChange={c => setFormData({...formData, isPracticing: c})} />
                      <Label htmlFor="practicing" className="text-orange-400">標示為「修練中」</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="pitch" checked={formData.hasPitchWarning} onCheckedChange={c => setFormData({...formData, hasPitchWarning: c})} />
                      <Label htmlFor="pitch" className="text-red-400">標示為「破音警告」</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>取消</Button>
                  <Button onClick={handleCreate} disabled={!formData.title || !formData.artist || createSong.isPending}>
                    確認新增
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative max-w-sm mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="搜尋歌曲..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-black/20 border-white/10"
          />
        </div>

        <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
          <Table>
            <TableHeader className="bg-black/40">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>歌名</TableHead>
                <TableHead>歌手</TableHead>
                <TableHead>語種</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead className="text-right">點播數</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">載入中...</TableCell></TableRow>
              ) : songsData?.songs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">無資料</TableCell></TableRow>
              ) : (
                songsData?.songs.map(song => (
                  <TableRow key={song.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{song.title}</TableCell>
                    <TableCell>{song.artist}</TableCell>
                    <TableCell><Badge variant="outline" className="border-white/10">{song.language}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {song.isPracticing && <Badge variant="outline" className="border-orange-500/50 text-orange-400 bg-orange-500/10 text-xs">修練中</Badge>}
                        {song.hasPitchWarning && <Badge variant="outline" className="border-red-500/50 text-red-400 bg-red-500/10 text-xs">破音</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{song.playCount}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(song)} className="h-8 w-8 hover:bg-white/10" data-testid={`btn-edit-${song.id}`}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(song.id)} className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive text-muted-foreground" data-testid={`btn-delete-${song.id}`}>
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-popover/95 backdrop-blur-xl border-white/10 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>編輯歌曲</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>歌名 *</Label>
              <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-black/20 border-white/10" />
            </div>
            <div className="grid gap-2">
              <Label>歌手 *</Label>
              <Input value={formData.artist} onChange={e => setFormData({...formData, artist: e.target.value})} className="bg-black/20 border-white/10" />
            </div>
            <div className="grid gap-2">
              <Label>語種 *</Label>
              <Input value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})} className="bg-black/20 border-white/10" />
            </div>
            <div className="grid gap-2">
              <Label>YouTube 網址</Label>
              <Input value={formData.youtubeUrl} onChange={e => setFormData({...formData, youtubeUrl: e.target.value})} className="bg-black/20 border-white/10" />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Switch id="practicing-edit" checked={formData.isPracticing} onCheckedChange={c => setFormData({...formData, isPracticing: c})} />
                <Label htmlFor="practicing-edit" className="text-orange-400">修練中</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="pitch-edit" checked={formData.hasPitchWarning} onCheckedChange={c => setFormData({...formData, hasPitchWarning: c})} />
                <Label htmlFor="pitch-edit" className="text-red-400">破音警告</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>取消</Button>
            <Button onClick={handleUpdate} disabled={!formData.title || !formData.artist || updateSong.isPending}>
              儲存變更
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

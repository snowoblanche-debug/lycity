import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListCategories, 
  getListCategoriesQueryKey, 
  useCreateCategory, 
  useUpdateCategory, 
  useDeleteCategory,
  CategoryType,
  CategoryInputType
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";

const typeLabels: Record<string, string> = {
  language: "語種",
  theme: "主題",
  season: "季節",
  custom: "自訂"
};

const typeBadgeStyle: Record<string, React.CSSProperties> = {
  language: { background: "#EFF6FF", color: "#1e40af", border: "1px solid #BFDBFE" },
  theme:    { background: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB" },
  season:   { background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0" },
  custom:   { background: "#FAF5FF", color: "#6b21a8", border: "1px solid #E9D5FF" },
};

function CategoryForm({
  data,
  onChange,
}: {
  data: { name: string; type: CategoryInputType };
  onChange: (d: { name: string; type: CategoryInputType }) => void;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label className="text-sm font-medium text-[#4B5563]">分類名稱 <span className="text-destructive">*</span></Label>
        <Input
          value={data.name}
          onChange={e => onChange({ ...data, name: e.target.value })}
          placeholder="例：抒情、動漫、冬季"
          autoFocus
        />
      </div>
      <div className="grid gap-2">
        <Label className="text-sm font-medium text-[#4B5563]">類型 <span className="text-destructive">*</span></Label>
        <Select value={data.type} onValueChange={(val: any) => onChange({ ...data, type: val })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="language">語種</SelectItem>
            <SelectItem value="theme">主題</SelectItem>
            <SelectItem value="season">季節</SelectItem>
            <SelectItem value="custom">自訂</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: categoriesData, isLoading } = useListCategories();
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();

  const [formData, setFormData] = useState<{ name: string; type: CategoryInputType }>({
    name: "",
    type: "theme" as CategoryInputType,
  });

  const resetForm = () => setFormData({ name: "", type: "theme" as CategoryInputType });

  const handleCreate = () => {
    createCat.mutate({ data: formData }, {
      onSuccess: () => {
        toast.success("分類新增成功");
        setIsCreateOpen(false);
        resetForm();
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      },
      onError: () => toast.error("新增失敗"),
    });
  };

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, type: cat.type as CategoryInputType });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingId) return;
    updateCat.mutate({ id: editingId, data: formData }, {
      onSuccess: () => {
        toast.success("分類更新成功");
        setIsEditOpen(false);
        resetForm();
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      },
      onError: () => toast.error("更新失敗"),
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除此分類嗎？")) {
      deleteCat.mutate({ id }, {
        onSuccess: () => {
          toast.success("分類已刪除");
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        },
        onError: () => toast.error("刪除失敗"),
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#243447] mb-1">分類管理</h1>
            <p className="text-[#4B5563] text-sm">管理歌曲的語種與主題分類標籤。</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={open => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="btn-add-category">
                <Plus className="w-4 h-4 mr-2" />
                新增分類
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-[#243447]">新增分類</DialogTitle>
              </DialogHeader>
              <CategoryForm data={formData} onChange={setFormData} />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>取消</Button>
                <Button onClick={handleCreate} disabled={!formData.name || createCat.isPending}>
                  新增
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl overflow-hidden border border-border/60 shadow-sm max-w-2xl"
          style={{ background: "rgba(255,255,255,0.80)" }}>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent"
                style={{ background: "rgba(112,136,163,0.06)" }}>
                <TableHead className="font-bold text-[#243447] py-3">名稱</TableHead>
                <TableHead className="font-bold text-[#243447] py-3">類型</TableHead>
                <TableHead className="font-bold text-[#243447] py-3 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-[#6B7280]">載入中...</TableCell>
                </TableRow>
              ) : !categoriesData?.categories?.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-[#6B7280]">尚無分類，點擊右上角新增</TableCell>
                </TableRow>
              ) : (
                categoriesData.categories.map(cat => (
                  <TableRow key={cat.id} className="border-border/40 hover:bg-black/[0.02]">
                    <TableCell className="font-semibold text-[#243447] py-3">{cat.name}</TableCell>
                    <TableCell className="py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={typeBadgeStyle[cat.type] || typeBadgeStyle.custom}>
                        {typeLabels[cat.type] || cat.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}
                        className="h-8 w-8 hover:bg-primary/8 hover:text-primary"
                        data-testid={`btn-edit-cat-${cat.id}`}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}
                        className="h-8 w-8 hover:bg-destructive/8 hover:text-destructive"
                        data-testid={`btn-delete-cat-${cat.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={open => { setIsEditOpen(open); if (!open) { resetForm(); setEditingId(null); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[#243447]">編輯分類</DialogTitle>
          </DialogHeader>
          <CategoryForm data={formData} onChange={setFormData} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>取消</Button>
            <Button onClick={handleUpdate} disabled={!formData.name || updateCat.isPending}>
              儲存變更
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";

const typeLabels: Record<string, string> = {
  language: "語種",
  theme: "主題",
  season: "季節",
  custom: "自訂"
};

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: categoriesData, isLoading } = useListCategories();
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();

  const [formData, setFormData] = useState<{name: string, type: CategoryInputType}>({
    name: "",
    type: "theme" as CategoryInputType
  });

  const resetForm = () => {
    setFormData({ name: "", type: "theme" as CategoryInputType });
  };

  const handleCreate = () => {
    createCat.mutate({ data: formData }, {
      onSuccess: () => {
        toast.success("分類新增成功");
        setIsCreateOpen(false);
        resetForm();
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      }
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
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("確定要刪除此分類嗎？")) {
      deleteCat.mutate({ id }, {
        onSuccess: () => {
          toast.success("分類已刪除");
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">分類管理</h1>
            <p className="text-muted-foreground text-sm">管理歌曲的各種分類標籤。</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} data-testid="btn-add-category">
                <Plus className="w-4 h-4 mr-2" />
                新增分類
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-popover/95 backdrop-blur-xl border-white/10">
              <DialogHeader>
                <DialogTitle>新增分類</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>分類名稱 *</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-black/20 border-white/10" />
                </div>
                <div className="grid gap-2">
                  <Label>類型 *</Label>
                  <Select value={formData.type} onValueChange={(val: any) => setFormData({...formData, type: val})}>
                    <SelectTrigger className="bg-black/20 border-white/10">
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
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>取消</Button>
                <Button onClick={handleCreate} disabled={!formData.name || createCat.isPending}>
                  新增
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20 max-w-3xl">
          <Table>
            <TableHeader className="bg-black/40">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>名稱</TableHead>
                <TableHead>類型</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8">載入中...</TableCell></TableRow>
              ) : !categoriesData?.categories || categoriesData.categories.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">尚無分類</TableCell></TableRow>
              ) : (
                categoriesData.categories.map(cat => (
                  <TableRow key={cat.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium text-white">{cat.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-white/10 hover:bg-white/20">{typeLabels[cat.type] || cat.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)} className="h-8 w-8 hover:bg-white/10" data-testid={`btn-edit-cat-${cat.id}`}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive text-muted-foreground" data-testid={`btn-delete-cat-${cat.id}`}>
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
        <DialogContent className="bg-popover/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle>編輯分類</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>分類名稱 *</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-black/20 border-white/10" />
            </div>
            <div className="grid gap-2">
              <Label>類型 *</Label>
              <Select value={formData.type} onValueChange={(val: any) => setFormData({...formData, type: val})}>
                <SelectTrigger className="bg-black/20 border-white/10">
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

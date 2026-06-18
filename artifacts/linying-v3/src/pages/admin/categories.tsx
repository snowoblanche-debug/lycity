import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
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

type Category = { id: number; name: string; type: string; songCount?: number };

const CATEGORY_TYPES = [
  { value: "language", label: "語言" },
  { value: "style", label: "風格" },
  { value: "tag", label: "標籤" },
];

const TYPE_LABELS: Record<string, string> = {
  language: "語言",
  style: "風格",
  tag: "標籤",
};

function useCategories() {
  return useQuery<{ categories: Category[] }>({
    queryKey: ["categories"],
    queryFn: () => customFetch("/api/categories"),
  });
}

function useCreateCategory() {
  return useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      customFetch("/api/categories", { method: "POST", body: JSON.stringify(data) }),
  });
}

function useUpdateCategory() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; type?: string } }) =>
      customFetch(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  });
}

function useDeleteCategory() {
  return useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/categories/${id}`, { method: "DELETE" }),
  });
}

export default function CategoriesAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useCategories();
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("tag");

  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createCat.mutateAsync({ name: newName.trim(), type: newType });
      invalidate();
      toast({ title: "分類已建立" });
      setShowCreate(false);
      setNewName("");
      setNewType("tag");
    } catch {
      toast({ title: "建立失敗", variant: "destructive" });
    }
  };

  const openEdit = (cat: Category) => {
    setEditTarget(cat);
    setEditName(cat.name);
    setEditType(cat.type);
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    try {
      await updateCat.mutateAsync({ id: editTarget.id, data: { name: editName.trim(), type: editType } });
      invalidate();
      toast({ title: "分類已更新" });
      setEditTarget(null);
    } catch {
      toast({ title: "更新失敗", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("確定刪除此分類？")) return;
    try {
      await deleteCat.mutateAsync(id);
      invalidate();
      toast({ title: "分類已刪除" });
    } catch (err: any) {
      const msg = err?.data?.error ?? "刪除失敗";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const categories = data?.categories ?? [];
  const grouped = CATEGORY_TYPES.map((t) => ({
    ...t,
    items: categories.filter((c) => c.type === t.value),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">分類管理</h2>
          <p className="text-muted-foreground text-sm mt-1">管理歌曲分類與標籤</p>
        </div>
        <Button
          className="bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-foreground"
          onClick={() => setShowCreate(true)}
          data-testid="btn-create-category"
        >
          新增分類
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <Card key={group.value} className="glass-card p-6">
              <h3 className="text-sm font-medium tracking-widest text-muted-foreground uppercase mb-4">
                {group.label}
                <span className="ml-2 text-xs font-normal">({group.items.length})</span>
              </h3>
              {group.items.length === 0 ? (
                <p className="text-sm text-muted-foreground/60">尚無此類別的分類</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {group.items.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-1 bg-background/50 rounded-lg border border-border/50 pl-3 pr-1 py-1"
                      data-testid={`category-item-${cat.id}`}
                    >
                      <span className="text-sm text-foreground">{cat.name}</span>
                      {cat.songCount !== undefined && cat.songCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">{cat.songCount}</Badge>
                      )}
                      <button
                        className="ml-1 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                        onClick={() => openEdit(cat)}
                        data-testid={`btn-edit-cat-${cat.id}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                        onClick={() => handleDelete(cat.id)}
                        data-testid={`btn-delete-cat-${cat.id}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle>新增分類</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-widest">分類名稱</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="輸入分類名稱"
                className="bg-background/50 border-border/50"
                data-testid="input-cat-name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-widest">類型</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="bg-background/50 border-border/50" data-testid="select-cat-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-foreground"
              onClick={handleCreate}
              disabled={!newName.trim() || createCat.isPending}
              data-testid="btn-confirm-create-cat"
            >
              {createCat.isPending ? "建立中..." : "建立分類"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle>編輯分類</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-widest">分類名稱</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-background/50 border-border/50"
                data-testid="input-edit-cat-name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-widest">類型</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger className="bg-background/50 border-border/50" data-testid="select-edit-cat-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-foreground"
              onClick={handleUpdate}
              disabled={!editName.trim() || updateCat.isPending}
              data-testid="btn-confirm-edit-cat"
            >
              {updateCat.isPending ? "更新中..." : "儲存變更"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

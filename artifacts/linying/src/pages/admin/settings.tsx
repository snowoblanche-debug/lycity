import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const [formData, setFormData] = useState({
    siteName: "",
    bannerText: "",
    bannerImageUrl: ""
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        siteName: settings.siteName || "",
        bannerText: settings.bannerText || "",
        bannerImageUrl: settings.bannerImageUrl || ""
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({ 
      data: {
        siteName: formData.siteName || undefined,
        bannerText: formData.bannerText || null,
        bannerImageUrl: formData.bannerImageUrl || null
      }
    }, {
      onSuccess: () => {
        toast.success("設定已儲存");
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      }
    });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">系統設定</h1>
          <p className="text-muted-foreground text-sm">自訂你的點歌頁面外觀與文字。</p>
        </div>

        <Card className="bg-card/40 backdrop-blur-sm border-white/10 mt-4">
          <CardHeader>
            <CardTitle className="text-lg">基本外觀</CardTitle>
            <CardDescription>這些設定會直接影響首頁的顯示。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">載入中...</div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="siteName">網站名稱</Label>
                  <Input 
                    id="siteName" 
                    value={formData.siteName} 
                    onChange={e => setFormData({...formData, siteName: e.target.value})} 
                    className="bg-black/20 border-white/10 max-w-md"
                    placeholder="聆櫻聖境"
                  />
                  <p className="text-xs text-muted-foreground">顯示在左上角與網頁標題</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bannerText">橫幅文字</Label>
                  <Input 
                    id="bannerText" 
                    value={formData.bannerText} 
                    onChange={e => setFormData({...formData, bannerText: e.target.value})} 
                    className="bg-black/20 border-white/10 max-w-md"
                    placeholder="歡迎來到聆櫻聖境"
                  />
                  <p className="text-xs text-muted-foreground">顯示在首頁上方橫幅正中央</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bannerImage">橫幅背景圖片 URL</Label>
                  <Input 
                    id="bannerImage" 
                    value={formData.bannerImageUrl} 
                    onChange={e => setFormData({...formData, bannerImageUrl: e.target.value})} 
                    className="bg-black/20 border-white/10"
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">建議使用 1920x400 以上的深色背景圖片，若留空則使用預設漸層背景</p>
                </div>

                {formData.bannerImageUrl && (
                  <div className="mt-4 border border-white/10 rounded-lg overflow-hidden h-32 relative bg-black/40">
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${formData.bannerImageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative h-full flex items-center justify-center">
                      <span className="text-xl font-bold text-white tracking-widest drop-shadow-lg">
                        {formData.bannerText || formData.siteName || "聆櫻聖境"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-white/5 flex justify-end">
                  <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="btn-save-settings">
                    <Save className="w-4 h-4 mr-2" />
                    {updateSettings.isPending ? "儲存中..." : "儲存設定"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

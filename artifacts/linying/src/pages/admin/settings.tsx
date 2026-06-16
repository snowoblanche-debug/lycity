import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, ExternalLink } from "lucide-react";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const [formData, setFormData] = useState({
    siteName: "",
    siteSubtitle: "",
    bannerImageUrl: ""
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        siteName: settings.siteName || "",
        siteSubtitle: (settings as { siteSubtitle?: string | null }).siteSubtitle || "",
        bannerImageUrl: settings.bannerImageUrl || ""
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      data: {
        siteName: formData.siteName || undefined,
        siteSubtitle: formData.siteSubtitle || null,
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
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">系統設定</h1>
          <p className="text-muted-foreground text-sm">自訂你的點歌頁面外觀與文字。</p>
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-base font-semibold">頁面文字</CardTitle>
            <CardDescription>網站名稱與首頁橫幅顯示的文字內容。</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-5">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">載入中...</div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="siteName" className="text-sm font-medium">網站名稱</Label>
                  <Input
                    id="siteName"
                    value={formData.siteName}
                    onChange={e => setFormData({ ...formData, siteName: e.target.value })}
                    placeholder="聆櫻聖境的點歌旋律"
                  />
                  <p className="text-xs text-muted-foreground">顯示在左上角與瀏覽器標籤</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="siteSubtitle" className="text-sm font-medium">橫幅副標題</Label>
                  <Input
                    id="siteSubtitle"
                    value={formData.siteSubtitle}
                    onChange={e => setFormData({ ...formData, siteSubtitle: e.target.value })}
                    placeholder="點播喜歡的歌曲，一起留下今晚的旋律"
                  />
                  <p className="text-xs text-muted-foreground">顯示在首頁橫幅的網站名稱下方</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-base font-semibold">橫幅背景圖片</CardTitle>
            <CardDescription>上傳圖片至 Discord 後貼上圖片連結，建議尺寸 1920×400 以上。</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-5">
            {isLoading ? null : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="bannerImage" className="text-sm font-medium">圖片 URL</Label>
                  <Input
                    id="bannerImage"
                    value={formData.bannerImageUrl}
                    onChange={e => setFormData({ ...formData, bannerImageUrl: e.target.value })}
                    placeholder="https://cdn.discordapp.com/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    若留空則使用預設漸層背景。在 Discord 上傳圖片後，右鍵點擊圖片 → 複製連結。
                  </p>
                </div>

                {formData.bannerImageUrl && (
                  <div className="rounded-xl overflow-hidden border border-border/60 h-36 relative shadow-sm">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${formData.bannerImageUrl})` }}
                    />
                    <div className="absolute inset-0" style={{ background: "rgba(36,52,71,0.38)" }} />
                    <div className="relative h-full flex flex-col items-center justify-center gap-1">
                      <span className="text-lg font-bold text-white tracking-widest drop-shadow-lg">
                        {formData.siteName || "聆櫻聖境的點歌旋律"}
                      </span>
                      {formData.siteSubtitle && (
                        <span className="text-xs text-white/80 tracking-wider">
                          {formData.siteSubtitle}
                        </span>
                      )}
                    </div>
                    <a
                      href={formData.bannerImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-md transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end pt-1">
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending || isLoading}
            className="px-6"
            data-testid="btn-save-settings"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateSettings.isPending ? "儲存中..." : "儲存設定"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

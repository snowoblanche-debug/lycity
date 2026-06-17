import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey, useRebuildStats } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, ExternalLink, Eye, EyeOff, Copy, RefreshCw, FlaskConical, BarChart3, CheckCircle2 } from "lucide-react";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const rebuildStats = useRebuildStats();

  const [formData, setFormData] = useState({
    siteName: "",
    siteSubtitle: "",
    bannerImageUrl: ""
  });

  const [obsKey, setObsKey] = useState("");
  const [obsKeyLoading, setObsKeyLoading] = useState(false);
  const [obsKeyLoaded, setObsKeyLoaded] = useState(false);
  const [showObsKey, setShowObsKey] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [rebuildResult, setRebuildResult] = useState<{ songsUpdated: number; message: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        siteName: settings.siteName || "",
        siteSubtitle: (settings as { siteSubtitle?: string | null }).siteSubtitle || "",
        bannerImageUrl: settings.bannerImageUrl || ""
      });
      setTestMode(settings.testMode ?? false);
    }
  }, [settings]);

  // Load current OBS key from admin endpoint (requires auth)
  useEffect(() => {
    if (obsKeyLoaded) return;
    setObsKeyLoading(true);
    const token = localStorage.getItem("admin_token");
    fetch("/api/admin/settings", {
      headers: { Authorization: `Bearer ${token ?? ""}` }
    })
      .then(r => r.ok ? r.json() : { obsKey: null })
      .then((data: { obsKey?: string | null }) => {
        setObsKey(data.obsKey ?? "");
        setObsKeyLoaded(true);
      })
      .catch(() => setObsKeyLoaded(true))
      .finally(() => setObsKeyLoading(false));
  }, [obsKeyLoaded]);

  const handleSave = () => {
    updateSettings.mutate({
      data: {
        siteName: formData.siteName || undefined,
        siteSubtitle: formData.siteSubtitle || null,
        bannerImageUrl: formData.bannerImageUrl || null,
        obsKey: obsKey || null,
        testMode,
      } as any
    }, {
      onSuccess: () => {
        toast.success("設定已儲存");
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      }
    });
  };

  const handleTestModeToggle = (val: boolean) => {
    setTestMode(val);
    updateSettings.mutate({
      data: { testMode: val } as any
    }, {
      onSuccess: () => {
        toast.success(val ? "測試模式已開啟 — 演唱將不計入統計" : "測試模式已關閉");
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      }
    });
  };

  const handleRebuildStats = () => {
    setRebuildResult(null);
    rebuildStats.mutate(undefined, {
      onSuccess: (data) => {
        setRebuildResult(data as any);
        toast.success(`統計重建完成：已更新 ${(data as any).songsUpdated} 首歌曲`);
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: () => toast.error("統計重建失敗，請稍後再試"),
    });
  };

  const handleGenerateKey = () => {
    const key = Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    setObsKey(key);
  };

  const obsUrl = obsKey
    ? `${window.location.origin}/obs?key=${obsKey}`
    : `${window.location.origin}/obs`;

  const copyObsUrl = () => {
    navigator.clipboard.writeText(obsUrl);
    toast.success("已複製 OBS 網址");
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">系統設定</h1>
          <p className="text-muted-foreground text-sm">自訂你的點歌頁面外觀與安全設定。</p>
        </div>

        {/* Test Mode */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-amber-500" />
                  測試模式
                </CardTitle>
                <CardDescription className="mt-1">
                  開啟後，標記演唱完成時將<strong>不計入</strong>播放次數與演唱紀錄。適合串流前測試。
                </CardDescription>
              </div>
              <Switch
                checked={testMode}
                onCheckedChange={handleTestModeToggle}
                disabled={updateSettings.isPending}
              />
            </div>
          </CardHeader>
          {testMode && (
            <CardContent className="px-6 pb-5">
              <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                style={{ background: "rgba(245,158,11,0.10)", color: "#92400e", border: "1px solid rgba(245,158,11,0.25)" }}>
                <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" />
                目前處於測試模式，演唱完成不會記錄到統計中。
              </div>
            </CardContent>
          )}
        </Card>

        {/* Rebuild Stats */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              重建播放統計
            </CardTitle>
            <CardDescription>
              從演唱紀錄重新計算所有歌曲的播放次數。適合在資料異常或測試後清理時使用。
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-5 space-y-4">
            {rebuildResult && (
              <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
                style={{ background: "rgba(34,197,94,0.08)", color: "#166534", border: "1px solid rgba(34,197,94,0.20)" }}>
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                {rebuildResult.message}
              </div>
            )}
            <Button
              variant="outline"
              onClick={handleRebuildStats}
              disabled={rebuildStats.isPending}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${rebuildStats.isPending ? 'animate-spin' : ''}`} />
              {rebuildStats.isPending ? "重建中..." : "立即重建統計"}
            </Button>
            <p className="text-xs text-muted-foreground">
              此操作會重設所有歌曲的 play_count 欄位，以演唱紀錄中的資料為準。
            </p>
          </CardContent>
        </Card>

        {/* Page text */}
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

        {/* Banner image */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-base font-semibold">橫幅背景圖片</CardTitle>
            <CardDescription>上傳圖片至 Discord 後貼上圖片連結，建議尺寸 1920×400 以上。</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-5">
            {!isLoading && (
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
                    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${formData.bannerImageUrl})` }} />
                    <div className="absolute inset-0" style={{ background: "rgba(36,52,71,0.38)" }} />
                    <div className="relative h-full flex flex-col items-center justify-center gap-1">
                      <span className="text-lg font-bold text-white tracking-widest drop-shadow-lg">
                        {formData.siteName || "聆櫻聖境的點歌旋律"}
                      </span>
                      {formData.siteSubtitle && (
                        <span className="text-xs text-white/80 tracking-wider">{formData.siteSubtitle}</span>
                      )}
                    </div>
                    <a href={formData.bannerImageUrl} target="_blank" rel="noreferrer"
                      className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-md transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* OBS security */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-base font-semibold">OBS 安全金鑰</CardTitle>
            <CardDescription>
              設定金鑰後，OBS 網址需帶上{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">?key=...</code>{" "}
              才能顯示覆蓋層。留空則 OBS 頁面公開。
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            {obsKeyLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />載入中...
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">存取金鑰</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showObsKey ? "text" : "password"}
                        value={obsKey}
                        onChange={e => setObsKey(e.target.value)}
                        placeholder="留空表示不限制存取"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowObsKey(!showObsKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showObsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleGenerateKey} className="flex-shrink-0">
                      隨機產生
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">OBS 瀏覽器來源網址</Label>
                  <div className="flex gap-2">
                    <Input value={obsUrl} readOnly className="flex-1 text-xs text-muted-foreground bg-muted/50" />
                    <Button variant="outline" size="icon" onClick={copyObsUrl} className="flex-shrink-0">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    在 OBS 新增瀏覽器來源，貼上此網址並勾選「允許透明度」
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end pt-1">
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending || isLoading}
            className="px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateSettings.isPending ? "儲存中..." : "儲存設定"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

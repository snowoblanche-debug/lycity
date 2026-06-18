import { useState, useEffect } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function SettingsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const [siteName, setSiteName] = useState("");
  const [siteSubtitle, setSiteSubtitle] = useState("");
  const [newObsKey, setNewObsKey] = useState("");
  const [testMode, setTestMode] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setSiteName(settings.siteName ?? "");
      setSiteSubtitle(settings.siteSubtitle ?? "");
      setTestMode(settings.testMode ?? false);
      setDirty(false);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        data: {
          siteName: siteName.trim() || undefined,
          siteSubtitle: siteSubtitle.trim() || undefined,
          obsKey: newObsKey.trim() || undefined,
          testMode,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      toast({ title: "設定已儲存" });
      setDirty(false);
      setNewObsKey("");
    } catch {
      toast({ title: "儲存失敗", variant: "destructive" });
    }
  };

  const field = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">系統設定</h2>
        <p className="text-muted-foreground text-sm mt-1">設定網站顯示名稱及 OBS 連動參數</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">網站資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-widest">網站名稱</Label>
            <Input
              value={siteName}
              onChange={(e) => field(setSiteName)(e.target.value)}
              placeholder="例：聆櫻聖境的點歌旋律"
              className="bg-background/50 border-border/50 focus:border-primary/50"
              data-testid="input-site-name"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-widest">副標題</Label>
            <Input
              value={siteSubtitle}
              onChange={(e) => field(setSiteSubtitle)(e.target.value)}
              placeholder="例：歡迎來到聆音時光"
              className="bg-background/50 border-border/50 focus:border-primary/50"
              data-testid="input-site-subtitle"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">OBS 設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-widest">
              OBS 存取金鑰{settings?.obsKeyEnabled && <span className="ml-2 text-primary/70 normal-case text-[10px]">（已啟用）</span>}
            </Label>
            <Input
              type="password"
              value={newObsKey}
              onChange={(e) => { setNewObsKey(e.target.value); setDirty(true); }}
              placeholder={settings?.obsKeyEnabled ? "輸入新金鑰以覆蓋，留空則維持原設定" : "設定金鑰（設定後 OBS URL 需帶入 ?key=...）"}
              className="bg-background/50 border-border/50 focus:border-primary/50"
              data-testid="input-obs-key"
            />
            <p className="text-xs text-muted-foreground">
              OBS 疊加層：
              <code className="ml-1 bg-background/50 px-1.5 py-0.5 rounded text-[11px] border border-border/50">/v3/obs</code>
              <span className="mx-1">·</span>
              歌詞疊加層：
              <code className="bg-background/50 px-1.5 py-0.5 rounded text-[11px] border border-border/50">/v3/obs/lyrics</code>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">其他</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">測試模式</p>
              <p className="text-xs text-muted-foreground mt-0.5">開啟後前台會顯示測試標記</p>
            </div>
            <Switch
              checked={testMode}
              onCheckedChange={field(setTestMode)}
              data-testid="switch-test-mode"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        className="bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-foreground transition-all"
        onClick={handleSave}
        disabled={!dirty || updateSettings.isPending}
        data-testid="btn-save-settings"
      >
        {updateSettings.isPending ? "儲存中..." : dirty ? "儲存設定" : "已儲存"}
      </Button>
    </div>
  );
}

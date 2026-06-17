import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { useGetStats, useGetSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, CheckCircle2, BarChart3, Clock, TrendingUp, Star, ListOrdered, Settings, Users, History, FlaskConical } from "lucide-react";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function AdminOverview() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useGetStats();
  const { data: settings } = useGetSettings();

  const quickActions = [
    { title: "歌曲管理", desc: "新增、編輯或刪除歌曲", icon: Music, href: "/admin/songs", color: "text-primary" },
    { title: "點歌管理", desc: "查看佇列、標記完成", icon: ListOrdered, href: "/admin/queue", color: "text-green-600" },
    { title: "點歌排行", desc: "查看觀眾點歌統計", icon: Users, href: "/admin/requester-stats", color: "text-purple-600" },
    { title: "演唱紀錄", desc: "瀏覽歷史演唱記錄", icon: History, href: "/history", color: "text-orange-500" },
    { title: "系統設定", desc: "橫幅、OBS 金鑰、測試模式", icon: Settings, href: "/admin/settings", color: "text-[#6B7280]" },
  ];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const monthly = (stats as any)?.monthly;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">系統概覽</h1>
            <p className="text-[#4B5563] text-sm">檢視點歌系統的即時狀態與統計數據。</p>
          </div>
          {settings?.testMode && (
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.30)", color: "#92400e" }}>
              <FlaskConical className="w-3.5 h-3.5" />
              測試模式
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-[#4B5563] tracking-wide">快速操作</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {quickActions.map(action => (
              <button
                key={action.href}
                onClick={() => setLocation(action.href)}
                className="rounded-xl p-4 text-left transition-all hover:shadow-md group border border-border/50 hover:border-primary/30"
                style={{ background: "rgba(255,255,255,0.80)" }}
              >
                <action.icon className={`h-5 w-5 mb-2 ${action.color} group-hover:scale-110 transition-transform`} />
                <div className="text-sm font-semibold text-[#243447] leading-snug">{action.title}</div>
                <div className="text-[11px] text-[#6B7280] mt-0.5 leading-snug">{action.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Lifetime stats */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-[#4B5563] tracking-wide">總計數據</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-[#4B5563]">曲庫總數</CardTitle>
                <Music className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="text-3xl font-bold text-[#243447]">{stats?.totalSongs ?? 0}</div>
                <p className="text-xs text-[#6B7280] mt-0.5">首歌曲</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-[#4B5563]">總演唱次數</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="text-3xl font-bold text-[#243447]">{stats?.totalCompleted ?? 0}</div>
                <p className="text-xs text-[#6B7280] mt-0.5">次歌曲演唱</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-[#4B5563]">熱門語種</CardTitle>
                <BarChart3 className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="text-3xl font-bold text-[#243447]">{stats?.languageBreakdown?.[0]?.language ?? "—"}</div>
                <p className="text-xs text-[#6B7280] mt-0.5">{stats?.languageBreakdown?.[0]?.count ?? 0} 首</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Monthly stats */}
        {monthly && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-[#4B5563] tracking-wide">本月數據</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-medium text-[#4B5563]">本月演唱數</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="text-3xl font-bold text-[#243447]">{monthly.totalCompleted}</div>
                  <p className="text-xs text-[#6B7280] mt-0.5">次</p>
                </CardContent>
              </Card>
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-medium text-[#4B5563]">本月新增歌曲</CardTitle>
                  <Music className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="text-3xl font-bold text-[#243447]">{monthly.newSongs}</div>
                  <p className="text-xs text-[#6B7280] mt-0.5">首</p>
                </CardContent>
              </Card>
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-medium text-[#4B5563]">本月熱門語種</CardTitle>
                  <BarChart3 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="text-2xl font-bold text-[#243447]">{monthly.topLanguages?.[0]?.language ?? "—"}</div>
                  <p className="text-xs text-[#6B7280] mt-0.5">{monthly.topLanguages?.[0]?.count ?? 0} 次</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Language breakdown */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-[#243447]">語種分佈</CardTitle>
              <span className="text-xs text-[#6B7280]">共 {stats?.languageBreakdown?.length ?? 0} 種</span>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {stats?.languageBreakdown?.length ? (
                <div className="space-y-3">
                  {stats.languageBreakdown.map((item, i) => {
                    const max = stats.languageBreakdown[0]?.count ?? 1;
                    const pct = Math.round((item.count / max) * 100);
                    return (
                      <div key={item.language}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[#243447]">{i + 1}. {item.language}</span>
                          <span className="text-sm text-[#6B7280]">{item.count} 首</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/50">
                          <div className="h-1.5 rounded-full bg-primary/50 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-[#6B7280] py-4 text-center">尚無數據</p>}
            </CardContent>
          </Card>

          {/* Top songs from play_count */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-[#243447]">歷史最熱門點播</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-[#6B7280] h-7" onClick={() => setLocation("/admin/songs")}>
                全部歌曲 →
              </Button>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {stats?.topSongs?.length ? (
                <div className="space-y-3">
                  {stats.topSongs.map((song, i) => (
                    <div key={song.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-xs w-5 text-right ${i === 0 ? 'text-amber-500 font-bold' : i === 1 ? 'text-zinc-400 font-bold' : i === 2 ? 'text-orange-700 font-bold' : 'text-[#6B7280]'}`}>
                          {i + 1}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-[#243447] block truncate max-w-[160px]">{song.title}</span>
                          <span className="text-xs text-[#6B7280]">{song.artist}</span>
                        </div>
                      </div>
                      <span className="text-sm text-primary font-semibold">{song.playCount}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-[#6B7280] py-4 text-center">尚無數據</p>}
            </CardContent>
          </Card>

          {/* Recent performances */}
          <Card className="border-border/60 shadow-sm md:col-span-2">
            <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center gap-2">
              <Clock className="h-4 w-4 text-[#6B7280]" />
              <CardTitle className="text-base font-semibold text-[#243447]">最近演唱</CardTitle>
              <span className="text-xs text-[#6B7280] ml-1">（最新 10 首）</span>
              <Button variant="ghost" size="sm" className="text-xs text-[#6B7280] h-7 ml-auto" onClick={() => setLocation("/history")}>
                完整記錄 →
              </Button>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {stats?.recentPerformances?.length ? (
                <div className="space-y-2.5">
                  {stats.recentPerformances.map((perf) => (
                    <div key={perf.id} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-[#6B7280] font-mono w-10 flex-shrink-0">{formatTime(perf.performedAt)}</span>
                        <div>
                          <span className="text-sm font-medium text-[#243447]">{perf.songTitle}</span>
                          <span className="text-xs text-[#6B7280] ml-2">{perf.artist}</span>
                          {perf.language && <span className="text-[10px] ml-2 text-[#6B7280]">{perf.language}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-[#6B7280] font-medium">{perf.requester}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-[#6B7280] py-4 text-center">今日尚無演唱紀錄</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

import { AdminLayout } from "@/components/admin-layout";
import { useGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, CheckCircle2, BarChart3, Clock, TrendingUp, Star } from "lucide-react";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function AdminOverview() {
  const { data: stats, isLoading } = useGetStats();

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">系統概覽</h1>
          <p className="text-[#4B5563] text-sm">檢視點歌系統的即時狀態與統計數據。</p>
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
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-[#4B5563]">總演唱次數</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="text-3xl font-bold text-[#243447]">{stats?.totalCompleted ?? 0}</div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-[#4B5563]">熱門語種</CardTitle>
                <BarChart3 className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="text-3xl font-bold text-[#243447]">{stats?.languageBreakdown?.[0]?.language ?? "—"}</div>
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
                </CardContent>
              </Card>
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-medium text-[#4B5563]">本月新增歌曲</CardTitle>
                  <Music className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="text-3xl font-bold text-[#243447]">{monthly.newSongs}</div>
                </CardContent>
              </Card>
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-medium text-[#4B5563]">本月熱門語種</CardTitle>
                  <BarChart3 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <div className="text-2xl font-bold text-[#243447]">{monthly.topLanguages?.[0]?.language ?? "—"}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Language breakdown */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-base font-semibold text-[#243447]">語種分佈</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {stats?.languageBreakdown?.length ? (
                <div className="space-y-3">
                  {stats.languageBreakdown.map((item) => (
                    <div key={item.language} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#243447]">{item.language}</span>
                      <span className="text-sm text-[#6B7280]">{item.count} 首</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-[#6B7280] py-4 text-center">尚無數據</p>}
            </CardContent>
          </Card>

          {/* Top songs from play_count */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-base font-semibold text-[#243447]">歷史最熱門點播</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {stats?.topSongs?.length ? (
                <div className="space-y-3">
                  {stats.topSongs.map((song, i) => (
                    <div key={song.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[#6B7280] font-mono text-xs w-4 text-right">{i + 1}.</span>
                        <span className="text-sm font-medium text-[#243447] truncate max-w-[160px]">{song.title}</span>
                      </div>
                      <span className="text-sm text-primary font-medium">{song.playCount} 次</span>
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
                      <span className="text-xs text-[#6B7280]">{perf.requester}</span>
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

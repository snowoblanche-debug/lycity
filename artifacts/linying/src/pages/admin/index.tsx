import { AdminLayout } from "@/components/admin-layout";
import { useGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, CheckCircle2, BarChart3, Clock } from "lucide-react";

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
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">系統概覽</h1>
          <p className="text-muted-foreground text-sm">檢視點歌系統的即時狀態與統計數據。</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">曲庫總數</CardTitle>
              <Music className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-3xl font-bold text-foreground">{stats?.totalSongs ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">完唱次數</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-3xl font-bold text-foreground">{stats?.totalCompleted ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-muted-foreground">熱門語種</CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-3xl font-bold text-foreground">
                {stats?.languageBreakdown?.[0]?.language ?? "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Language breakdown */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-base font-semibold text-foreground">語種分佈</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {stats?.languageBreakdown?.length ? (
                <div className="space-y-3">
                  {stats.languageBreakdown.map((item) => (
                    <div key={item.language} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{item.language}</span>
                      <span className="text-sm text-muted-foreground">{item.count} 首</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">尚無數據</p>
              )}
            </CardContent>
          </Card>

          {/* Top songs */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-base font-semibold text-foreground">熱門點播</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {stats?.topSongs?.length ? (
                <div className="space-y-3">
                  {stats.topSongs.map((song, i) => (
                    <div key={song.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-mono text-xs w-4 text-right">{i + 1}.</span>
                        <span className="text-sm font-medium text-foreground truncate max-w-[160px]">{song.title}</span>
                      </div>
                      <span className="text-sm text-primary font-medium">{song.playCount} 次</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">尚無數據</p>
              )}
            </CardContent>
          </Card>

          {/* Recent performances */}
          <Card className="border-border/60 shadow-sm md:col-span-2">
            <CardHeader className="px-5 pt-5 pb-3 flex flex-row items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold text-foreground">最近演唱</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {stats?.recentPerformances?.length ? (
                <div className="space-y-3">
                  {stats.recentPerformances.map((perf) => (
                    <div key={perf.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground font-mono w-10 flex-shrink-0">
                          {formatTime(perf.performedAt)}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-foreground">{perf.songTitle}</span>
                          <span className="text-xs text-muted-foreground ml-2">{perf.artist}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{perf.requester}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">今日尚無演唱紀錄</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

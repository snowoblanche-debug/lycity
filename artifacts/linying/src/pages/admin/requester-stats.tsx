import { useListRequesters } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Crown, Trophy } from "lucide-react";

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-4 h-4 text-amber-500" />;
  if (rank === 2) return <Trophy className="w-4 h-4 text-zinc-400" />;
  if (rank === 3) return <Trophy className="w-4 h-4 text-orange-700" />;
  return <span className="text-xs font-mono text-[#6B7280] w-4 text-right inline-block">{rank}</span>;
}

export default function RequesterStatsPage() {
  const { data, isLoading } = useListRequesters({ limit: 100 });

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">點歌排行</h1>
          <p className="text-[#4B5563] text-sm">觀眾歷史點歌次數統計，以點歌數從多到少排列。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-[#4B5563]">參與觀眾</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-3xl font-bold text-[#243447]">{data?.total ?? 0}</div>
              <p className="text-xs text-[#6B7280] mt-0.5">位不重複觀眾</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-[#4B5563]">最高紀錄</CardTitle>
              <Crown className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-3xl font-bold text-[#243447]">{data?.items?.[0]?.requestCount ?? 0}</div>
              <p className="text-xs text-[#6B7280] mt-0.5">{data?.items?.[0]?.requesterName ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-[#4B5563]">總點歌次數</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="text-3xl font-bold text-[#243447]">
                {data?.items?.reduce((s, i) => s + i.requestCount, 0) ?? 0}
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">次合計</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="px-5 pt-5 pb-4">
            <CardTitle className="text-base font-semibold text-[#243447]">完整排行榜</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : !data?.items?.length ? (
              <div className="py-16 text-center text-[#6B7280]">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>尚無點歌記錄</p>
                <p className="text-xs mt-1">有觀眾點歌後就會出現在這裡</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.items.map((item, i) => {
                  const max = data.items[0]?.requestCount ?? 1;
                  const pct = Math.round((item.requestCount / max) * 100);
                  return (
                    <div key={item.id}
                      className="flex items-center gap-4 px-3 py-2.5 rounded-lg transition-colors hover:bg-muted/30"
                      style={i < 3 ? { background: i === 0 ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.60)" } : undefined}
                    >
                      <div className="w-5 flex items-center justify-center flex-shrink-0">
                        <RankIcon rank={i + 1} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-[#243447] truncate">{item.requesterName}</span>
                          <span className="text-sm font-bold text-primary ml-3 flex-shrink-0">{item.requestCount} 次</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted/50">
                          <div className="h-1 rounded-full bg-primary/40 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-[10px] text-[#6B7280] flex-shrink-0 w-20 text-right">
                        {new Date(item.lastRequestAt).toLocaleDateString("zh-TW")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

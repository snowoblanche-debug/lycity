import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Music, Hash, Clock } from "lucide-react";
import { useListHistory, SongHistory } from "@workspace/api-client-react";

interface RequesterDetailProps {
  params: { name: string };
}

export default function RequesterDetailPage({ params }: RequesterDetailProps) {
  const [, setLocation] = useLocation();
  const requesterName = decodeURIComponent(params.name);

  const { data: historyData, isLoading } = useListHistory({ limit: 500 });

  const history: SongHistory[] = ((historyData as any)?.items ?? []).filter(
    (h: SongHistory) => h.requester === requesterName
  );

  const uniqueSongs = Array.from(
    new Map(history.map((h: SongHistory) => [h.songTitle + h.artist, h])).values()
  );

  const songCounts = history.reduce<Record<string, number>>((acc: Record<string, number>, h: SongHistory) => {
    const key = h.songTitle;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const topSongs = Object.entries(songCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const lastPerformed = history[0]?.performedAt;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/requester-stats")}
            className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#243447] flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {requesterName}
            </h1>
            <p className="text-[#4B5563] text-sm">點歌者詳細記錄</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-[#6B7280] flex items-center gap-1">
                    <Hash className="h-3 w-3" />總點歌數
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold text-[#243447]">{history.length}</div>
                  <p className="text-xs text-[#6B7280]">次</p>
                </CardContent>
              </Card>
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-[#6B7280] flex items-center gap-1">
                    <Music className="h-3 w-3" />不同歌曲數
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold text-[#243447]">{uniqueSongs.length}</div>
                  <p className="text-xs text-[#6B7280]">首</p>
                </CardContent>
              </Card>
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-[#6B7280] flex items-center gap-1">
                    <Clock className="h-3 w-3" />最近點歌
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-sm font-bold text-[#243447]">
                    {lastPerformed ? new Date(lastPerformed).toLocaleDateString("zh-TW") : "—"}
                  </div>
                  <p className="text-xs text-[#6B7280]">{history[0]?.songTitle ?? "尚無紀錄"}</p>
                </CardContent>
              </Card>
            </div>

            {/* Most requested songs */}
            {topSongs.length > 0 && (
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="px-5 pt-5 pb-3">
                  <CardTitle className="text-base font-semibold text-[#243447]">最常點播</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="space-y-2">
                    {topSongs.map(([title, count], i) => {
                      const entry = history.find((h: SongHistory) => h.songTitle === title);
                      return (
                        <div key={title} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-[#6B7280] w-4">{i + 1}</span>
                            <div>
                              <span className="text-sm font-medium text-[#243447]">{title}</span>
                              {entry?.artist && (
                                <span className="text-xs text-[#6B7280] ml-2">{entry.artist}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-primary">{count} 次</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Full history */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-base font-semibold text-[#243447]">點歌歷史</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {history.length === 0 ? (
                  <p className="text-sm text-[#6B7280] py-4 text-center">尚無點歌記錄</p>
                ) : (
                  <div className="space-y-1.5">
                    {history.map((h: SongHistory) => (
                      <div key={h.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                        <div>
                          <span className="text-sm font-medium text-[#243447]">{h.songTitle}</span>
                          <span className="text-xs text-[#6B7280] ml-2">{h.artist}</span>
                        </div>
                        <span className="text-xs text-[#6B7280] font-mono">
                          {new Date(h.performedAt).toLocaleDateString("zh-TW")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

import { useState } from "react";
import { useGetStats, useRebuildStats } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function StatsAdmin() {
  const { data: stats, isLoading, refetch } = useGetStats();
  const rebuildStats = useRebuildStats();
  const { toast } = useToast();

  const handleRebuild = async () => {
    if (!window.confirm("確定要重新計算所有統計數據嗎？這可能需要幾秒鐘。")) return;
    try {
      const res = await rebuildStats.mutateAsync();
      toast({ title: "計算完成", description: res.message });
      refetch();
    } catch (err) {
      toast({ title: "操作失敗", variant: "destructive" });
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-foreground">統計概覽</h2>
          <p className="text-muted-foreground text-sm mt-1">查看點歌系統的整體數據</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRebuild}
          disabled={rebuildStats.isPending}
          data-testid="btn-rebuild-stats"
        >
          {rebuildStats.isPending ? "計算中..." : "重新計算"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">總歌曲數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.totalSongs}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">總演唱次數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{stats.totalCompleted}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">總點播次數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{stats.totalPlayed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">語言分佈</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.languageBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="language" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                  contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))'}}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">熱門歌曲 Top 10</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topSongs.slice(0, 10).map((song, i) => (
                <div key={song.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-muted-foreground font-mono text-sm w-4">{i + 1}</span>
                    <div className="truncate">
                      <div className="font-medium text-foreground truncate">{song.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{song.artist}</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-primary pl-4">{song.playCount} 次</div>
                </div>
              ))}
              {stats.topSongs.length === 0 && (
                <div className="text-center text-muted-foreground py-8">無數據</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

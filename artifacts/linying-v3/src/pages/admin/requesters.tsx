import { useState } from "react";
import { useListRequesters } from "@workspace/api-client-react";
import type { RequesterStat } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function RequestersAdmin() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListRequesters({ limit: 100 });

  const requesters = data?.items ?? [];
  const filtered = search.trim()
    ? requesters.filter((r: RequesterStat) =>
        r.requesterName.toLowerCase().includes(search.toLowerCase())
      )
    : requesters;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">聽眾排行</h2>
          <p className="text-muted-foreground text-sm mt-1">點歌次數最多的聽眾</p>
        </div>
        <Input
          type="search"
          placeholder="搜尋聽眾名稱..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 bg-card/50 border-border/50 focus:border-primary/50"
          data-testid="input-search-requesters"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card p-10 text-center text-muted-foreground border-dashed">
          {search ? "找不到符合條件的聽眾" : "尚無點歌記錄"}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((requester: RequesterStat, i: number) => {
            const originalIndex = requesters.findIndex((r: RequesterStat) => r.requesterName === requester.requesterName);
            const rank = originalIndex + 1;
            const isTop3 = rank <= 3;
            return (
              <Card
                key={requester.requesterName}
                className={`glass-card p-4 ${isTop3 ? "border-primary/20" : ""}`}
                data-testid={`requester-card-${i}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`text-2xl font-bold w-10 text-center shrink-0 ${
                    rank === 1 ? "text-yellow-400" :
                    rank === 2 ? "text-slate-300" :
                    rank === 3 ? "text-amber-600" :
                    "text-muted-foreground/30"
                  }`}>
                    {rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{requester.requesterName}</p>
                    <p className="text-xs text-muted-foreground">
                      共點播 {requester.requestCount} 次
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-primary">{requester.requestCount}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">次點播</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {data?.items && data.items.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">共 {data.items.length} 位聽眾</p>
      )}
    </div>
  );
}

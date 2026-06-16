import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListHistory, getListHistoryQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Music, Clock } from "lucide-react";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListHistory({ limit: 200 });

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getListHistoryQueryKey({ limit: 200 }) });
    }, 30000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const grouped = useMemo(() => {
    if (!data?.items) return [];
    const map = new Map<string, typeof data.items>();
    for (const item of data.items) {
      const key = dateKey(item.performedAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  return (
    <Layout>
      {/* Page header */}
      <div className="border-b border-border/50 px-6 md:px-10 py-8"
        style={{ background: "rgba(255,255,255,0.60)", backdropFilter: "blur(8px)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-[#6B7280] text-sm mb-1">
            <Clock className="w-4 h-4" />
            <span>演唱紀錄</span>
          </div>
          <h1 className="text-2xl font-bold text-[#243447] tracking-tight">今晚的旋律</h1>
          {data && <p className="text-sm text-[#6B7280] mt-1">共 {data.total} 首演唱紀錄</p>}
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-10 py-8">
        {isLoading ? (
          <div className="py-20 text-center text-[#6B7280] text-sm">載入中...</div>
        ) : grouped.length === 0 ? (
          <div className="py-20 text-center rounded-2xl"
            style={{ background: "rgba(255,255,255,0.60)", border: "1px solid rgba(112,136,163,0.16)" }}>
            <Music className="h-12 w-12 mx-auto mb-4 text-[#6B7280]/30" />
            <p className="text-[#4B5563] font-medium">尚無演唱紀錄</p>
            <p className="text-sm text-[#6B7280] mt-1">完唱第一首歌後，紀錄會顯示在這裡</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {grouped.map(([dateStr, items]) => (
              <div key={dateStr}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-sm font-semibold text-[#243447] tracking-wide">
                    {formatDate(items[0].performedAt)}
                  </div>
                  <div className="flex-1 h-px bg-border/60" />
                  <span className="text-xs text-[#6B7280]">{items.length} 首</span>
                </div>

                <div className="flex flex-col gap-0 rounded-2xl overflow-hidden border border-border/50"
                  style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(10px)" }}>
                  {items.map((item, idx) => (
                    <div key={item.id}
                      className={`flex items-start gap-5 px-5 py-4 ${idx < items.length - 1 ? 'border-b border-border/40' : ''}`}>
                      {/* Time */}
                      <span className="text-xs font-mono text-[#6B7280] flex-shrink-0 w-10 pt-0.5">
                        {formatTime(item.performedAt)}
                      </span>

                      {/* Song info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-[#243447] text-sm">{item.songTitle}</span>
                          <span className="text-xs text-[#6B7280]">{item.artist}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.language && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded text-[#6B7280] font-medium"
                              style={{ background: "rgba(112,136,163,0.10)" }}>
                              {item.language}
                            </span>
                          )}
                          {(item.tags as string[])?.filter(Boolean).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded text-[#4B5563]"
                              style={{ background: "rgba(112,136,163,0.08)", border: "1px solid rgba(112,136,163,0.18)" }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Requester */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-[10px] text-[#6B7280]">點歌人</div>
                        <div className="text-sm font-medium text-primary">{item.requester}</div>
                      </div>

                      {item.vodUrl && (
                        <a href={item.vodUrl} target="_blank" rel="noreferrer"
                          className="text-xs text-primary underline flex-shrink-0 pt-0.5">
                          {item.timestampText ?? "VOD"}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

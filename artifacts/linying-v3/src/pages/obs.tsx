import { useEffect } from "react";
import { useGetCurrentPlaying } from "@workspace/api-client-react";

export default function ObsQueue() {
  const { data, refetch } = useGetCurrentPlaying();

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.setProperty("background", "transparent", "important");
    document.body.style.setProperty("background", "transparent", "important");

    const interval = setInterval(() => refetch(), 5000);

    return () => {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.removeProperty("background");
      document.body.style.removeProperty("background");
      clearInterval(interval);
    };
  }, [refetch]);

  if (!data?.current && !data?.next) {
    return null;
  }

  return (
    <div className="w-full h-full p-8 font-sans">
      {data.current && (
        <div
          className="backdrop-blur-md border-l-4 border-l-primary p-6 rounded-2xl shadow-2xl mb-6 flex flex-col gap-2 max-w-2xl animate-in slide-in-from-left"
          style={{
            background: "rgba(30,38,50,0.85)",
            border: "1px solid rgba(112,136,163,0.35)",
            borderLeftWidth: "4px",
            borderLeftColor: "hsl(var(--primary))",
          }}
        >
          <div className="text-[11px] font-bold tracking-widest text-primary/80 uppercase">現在演唱</div>
          <div className="text-4xl font-bold text-white leading-tight">{data.current.song?.title}</div>
          {data.current.song?.artist && (
            <div className="text-xl text-white/60">{data.current.song.artist}</div>
          )}
          <div className="mt-2 text-sm flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded-md text-xs font-medium"
              style={{ background: "rgba(112,136,163,0.25)", color: "rgba(255,255,255,0.85)" }}
            >
              點歌人：{data.current.requesterName}
            </span>
            {data.current.note && (
              <span className="text-white/50 text-xs italic">「{data.current.note}」</span>
            )}
          </div>
        </div>
      )}

      {data.next && (
        <div
          className="backdrop-blur-sm p-4 rounded-xl shadow-xl max-w-xl animate-in slide-in-from-bottom"
          style={{
            background: "rgba(30,38,50,0.65)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1">下一首準備</div>
          <div className="text-2xl font-bold text-white/90">{data.next.song?.title}</div>
          {data.next.song?.artist && (
            <div className="text-base text-white/50">{data.next.song.artist}</div>
          )}
          <div className="mt-1.5 text-xs text-white/40">{data.next.requesterName}</div>
        </div>
      )}
    </div>
  );
}

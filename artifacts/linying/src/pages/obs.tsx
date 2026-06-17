import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentPlayingQueryKey, useGetCurrentPlaying, useVerifyObsKey } from "@workspace/api-client-react";
import { useSearch } from "wouter";

export default function ObsPage() {
  const queryClient = useQueryClient();
  const search = useSearch();
  const urlKey = new URLSearchParams(search).get("key") ?? undefined;
  const { data: verifyData, isLoading: verifying } = useVerifyObsKey({ key: urlKey });
  const { data: currentPlaying } = useGetCurrentPlaying();

  useEffect(() => {
    // Auto refresh every 5 seconds
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetCurrentPlayingQueryKey() });
    }, 5000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // Make body transparent specifically for OBS
  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  if (verifying) return null;

  if (verifyData?.valid === false) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-transparent">
        <div className="backdrop-blur-md bg-black/60 border border-white/10 rounded-2xl px-8 py-6 text-center">
          <p className="text-white/80 text-lg font-medium">🔒 存取遭拒</p>
          <p className="text-white/50 text-sm mt-1">OBS 存取金鑰無效</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col p-8 gap-8 overflow-hidden bg-transparent">
      {/* Now Playing */}
      {currentPlaying?.current ? (
        <div className="backdrop-blur-md bg-card/60 border border-white/10 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="flex flex-col gap-2">
            <span className="text-primary font-medium tracking-widest text-sm uppercase drop-shadow-md">現正演唱 NOW PLAYING</span>
            <h1 className="text-4xl font-bold text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">
              {currentPlaying.current.song?.title || "未知歌曲"}
            </h1>
            <div className="flex items-center gap-4 text-xl text-muted-foreground mt-2">
              <span>{currentPlaying.current.song?.artist || "未知歌手"}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              <span className="flex items-center gap-2">
                <span className="text-sm opacity-70">點歌人</span>
                <span className="text-white/90 font-medium">{currentPlaying.current.requesterName}</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="backdrop-blur-md bg-card/40 border border-white/5 rounded-2xl p-6 shadow-xl animate-in fade-in duration-1000">
          <h1 className="text-2xl font-medium text-white/70 drop-shadow-md tracking-wider">等待中...</h1>
        </div>
      )}

      {/* Next Up */}
      {currentPlaying?.next && (
        <div className="backdrop-blur-md bg-card/40 border border-white/5 rounded-xl p-5 shadow-xl w-3/4 animate-in fade-in slide-in-from-left-8 duration-700 delay-150">
          <div className="flex flex-col gap-1">
            <span className="text-accent font-medium tracking-wider text-xs uppercase drop-shadow-md">下一首 NEXT UP</span>
            <h2 className="text-2xl font-semibold text-white/90 drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]">
              {currentPlaying.next.song?.title || "未知歌曲"}
            </h2>
            <div className="flex items-center gap-3 text-lg text-muted-foreground mt-1">
              <span>{currentPlaying.next.song?.artist || "未知歌手"}</span>
              <span className="w-1 h-1 rounded-full bg-accent/50" />
              <span className="flex items-center gap-2 text-sm">
                <span className="opacity-70">點歌人</span>
                <span className="text-white/80">{currentPlaying.next.requesterName}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

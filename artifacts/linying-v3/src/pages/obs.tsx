import { useState, useEffect } from "react";
import { 
  useGetCurrentPlaying
} from "@workspace/api-client-react";

export default function ObsQueue() {
  const { data, refetch } = useGetCurrentPlaying();

  useEffect(() => {
    // Add transparent class to html and body
    document.documentElement.style.setProperty("background", "transparent", "important");
    document.body.style.setProperty("background", "transparent", "important");
    
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    
    return () => {
      document.documentElement.style.removeProperty("background");
      document.body.style.removeProperty("background");
      clearInterval(interval);
    };
  }, [refetch]);

  if (!data?.current && !data?.next) {
    return null;
  }

  return (
    <div className="w-full h-full p-8 font-sans text-white">
      {data.current && (
        <div className="bg-background/80 backdrop-blur-md border border-primary/30 p-6 rounded-2xl shadow-2xl mb-6 flex flex-col gap-2 max-w-2xl border-l-4 border-l-primary animate-in slide-in-from-left">
          <div className="text-primary text-sm font-bold tracking-widest uppercase">現在演唱</div>
          <div className="text-4xl font-bold">{data.current.song?.title}</div>
          <div className="text-xl text-muted-foreground">{data.current.song?.artist}</div>
          <div className="mt-2 text-sm flex items-center gap-2">
            <span className="bg-primary/20 text-primary px-2 py-1 rounded">點歌人: {data.current.requesterName}</span>
          </div>
        </div>
      )}

      {data.next && (
        <div className="bg-background/60 backdrop-blur-sm border border-border/50 p-4 rounded-xl shadow-xl max-w-xl animate-in slide-in-from-bottom">
          <div className="text-muted-foreground text-xs font-bold tracking-widest uppercase mb-1">下一首準備</div>
          <div className="text-2xl font-bold text-foreground/90">{data.next.song?.title}</div>
          <div className="text-md text-muted-foreground/80">{data.next.song?.artist}</div>
        </div>
      )}
    </div>
  );
}

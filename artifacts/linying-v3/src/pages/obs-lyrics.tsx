import { useState, useEffect, useRef } from "react";
import { useGetObsLyricsCurrent } from "@workspace/api-client-react";

interface ParsedLine {
  time: number;
  text: string;
}

export default function ObsLyrics() {
  const { data, refetch } = useGetObsLyricsCurrent();
  const [elapsed, setElapsed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("background", "transparent", "important");
    document.body.style.setProperty("background", "transparent", "important");
    
    const fetchInterval = setInterval(() => {
      refetch();
    }, 2000);
    
    return () => {
      document.documentElement.style.removeProperty("background");
      document.body.style.removeProperty("background");
      clearInterval(fetchInterval);
    };
  }, [refetch]);

  useEffect(() => {
    let animationFrame: number;
    const updateElapsed = () => {
      if (data?.startedAt) {
        const start = new Date(data.startedAt).getTime();
        setElapsed(Date.now() - start);
      }
      animationFrame = requestAnimationFrame(updateElapsed);
    };
    if (data?.startedAt) {
      animationFrame = requestAnimationFrame(updateElapsed);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [data?.startedAt]);

  if (!data?.hasCurrentSong || !data.lyricsText) {
    return null;
  }

  // Parse LRC if format is lrc/krc
  const isLrc = data.lyricsFormat === "lrc" || data.lyricsFormat === "krc";
  let parsedLines: ParsedLine[] = [];
  
  if (isLrc) {
    const lines = data.lyricsText.split("\n");
    for (const line of lines) {
      const match = line.match(/\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\](.*)/);
      if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseFloat(match[2]);
        const text = match[3].trim();
        parsedLines.push({ time: (mins * 60 + secs) * 1000, text });
      }
    }
  } else {
    // Plain text just split into pseudo-lines but without timing
    parsedLines = data.lyricsText.split("\n").map((text, i) => ({ time: i * 5000, text: text.trim() })).filter(l => l.text);
  }

  let currentIndex = -1;
  if (isLrc) {
    for (let i = 0; i < parsedLines.length; i++) {
      if (parsedLines[i].time <= elapsed) {
        currentIndex = i;
      } else {
        break;
      }
    }
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-end p-8 pb-16 font-sans">
      <div className="mb-4 bg-background/60 backdrop-blur-md px-6 py-2 rounded-full border border-border/50 text-center animate-in fade-in">
        <div className="text-xl font-bold text-white shadow-sm">{data.song?.title}</div>
        <div className="text-sm text-muted-foreground">{data.song?.artist}</div>
      </div>
      
      <div 
        ref={containerRef}
        className="w-full max-w-4xl h-[200px] relative overflow-hidden flex flex-col items-center justify-center mask-image-y"
        style={{
          maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)"
        }}
      >
        <div 
          className="absolute w-full transition-transform duration-500 ease-out flex flex-col items-center"
          style={{
            transform: `translateY(calc(50% - ${currentIndex * 40 + 20}px))`
          }}
        >
          {parsedLines.map((line, idx) => {
            const isCurrent = idx === currentIndex;
            const isPast = idx < currentIndex;
            
            return (
              <div 
                key={idx} 
                className={`h-[40px] flex items-center justify-center text-center transition-all duration-300 ${
                  isCurrent 
                    ? "text-4xl font-bold text-primary text-shadow-glow scale-110" 
                    : isPast 
                      ? "text-2xl text-white/50" 
                      : "text-2xl text-white/30"
                }`}
                style={{
                  textShadow: isCurrent ? "0 0 10px hsl(var(--primary) / 0.5)" : "0 2px 4px rgba(0,0,0,0.8)"
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

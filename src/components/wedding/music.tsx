"use client";
import { useRef, useState } from "react";
import { Music2, Pause } from "lucide-react";
export function Music({ url }: { url: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <audio ref={audio} src={url} preload="none" loop />
      <button
        className="music-button"
        aria-label={playing ? "Tắt nhạc nền" : "Bật nhạc nền"}
        title={error || (playing ? "Tắt nhạc" : "Bật nhạc")}
        onClick={async () => {
          if (!audio.current) return;
          if (playing) {
            audio.current.pause();
            setPlaying(false);
          } else {
            try {
              await audio.current.play();
              setPlaying(true);
              setError("");
            } catch {
              setError("Không phát được nhạc");
            }
          }
        }}
      >
        {playing ? <Pause size={18} /> : <Music2 size={18} />}
      </button>
      {error && (
        <span
          role="status"
          className="notice"
          style={{ position: "fixed", bottom: 75, right: 20, zIndex: 30 }}
        >
          {error}
        </span>
      )}
    </>
  );
}

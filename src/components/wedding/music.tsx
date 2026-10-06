"use client";
import { useEffect, useRef, useState } from "react";
import { Music2, Pause, SlidersHorizontal } from "lucide-react";
import { WEDDING_MUSIC } from "@/lib/wedding-music";

export function Music({ url }: { url: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const attempted = useRef(false);
  const wanted = useRef(false);
  const request = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [error, setError] = useState("");
  async function play() {
    const element = audio.current;
    if (!element) return;
    const current = ++request.current;
    attempted.current = true;
    wanted.current = true;
    element.volume = volume;
    setError("");
    try {
      await element.play();
      if (!wanted.current) element.pause();
    } catch {
      if (current === request.current)
        setError("Chưa phát được nhạc. Bạn có thể thử bật lại.");
    }
  }
  function pause() {
    wanted.current = false;
    request.current++;
    audio.current?.pause();
  }
  // The listener calls play synchronously during the opening button's user gesture.
  const playLatest = useRef(play);
  useEffect(() => {
    playLatest.current = play;
  });
  useEffect(() => {
    const element = audio.current;
    const container = element?.closest(".wedding-page");
    const start = () => void playLatest.current();
    const hide = () => {
      if (document.hidden) {
        wanted.current = false;
        request.current++;
        element?.pause();
      }
    };
    container?.addEventListener("invitation-music-request", start);
    document.addEventListener("visibilitychange", hide);
    return () => {
      wanted.current = false;
      request.current++;
      element?.pause();
      container?.removeEventListener("invitation-music-request", start);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [url]);
  return (
    <div className="wedding-music-player">
      <audio
        ref={audio}
        src={url}
        preload="none"
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          if (attempted.current)
            setError("Tệp nhạc chưa tải được. Bạn có thể thử bật lại.");
        }}
      />
      <button
        type="button"
        className={`music-toggle${playing ? " is-playing" : ""}`}
        aria-pressed={playing}
        aria-label={playing ? "Tắt nhạc nền" : "Bật nhạc nền"}
        onClick={() => {
          if (audio.current && !audio.current.paused) pause();
          else void play();
        }}
      >
        <span className="music-disc" aria-hidden="true">
          {playing ? <Pause size={18} /> : <Music2 size={18} />}
        </span>
        <span>{playing ? "Đang phát" : "Nhạc nền"}</span>
      </button>
      <details className="music-settings">
        <summary aria-label="Điều chỉnh nhạc nền">
          <SlidersHorizontal size={18} aria-hidden="true" />
        </summary>
        <div className="music-panel">
          <p>
            {url === WEDDING_MUSIC.url
              ? WEDDING_MUSIC.title
              : "Bài hát của hai người"}
          </p>
          <label>
            Âm lượng nhạc nền
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(event) => {
                const value = Number(event.target.value);
                setVolume(value);
                if (audio.current) audio.current.volume = value;
              }}
            />
          </label>
        </div>
      </details>
      {error && (
        <p role="status" className="music-error">
          {error}
        </p>
      )}
    </div>
  );
}

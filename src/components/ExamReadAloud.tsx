"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import "./exam-read-aloud.css";
import type { Choice } from "@/lib/types";
import { buildReadAloudText } from "@/lib/read-aloud-script";

type Language = "zh" | "en";
const SPEEDS = [0.8, 0.7, 1] as const;
const SPEED_KEY = "socthink_exam_read_aloud_rate";
const SPEED_EVENT = "socthink_exam_read_aloud_rate_changed";
function readRate() {
  try {
    const saved = Number(window.localStorage.getItem(SPEED_KEY));
    if (SPEEDS.some((value) => value === saved)) return saved;
  } catch { /* in-memory fallback */ }
  return null;
}
function subscribeRate(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SPEED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SPEED_EVENT, onChange);
  };
}
type Props = {
  questionId: string;
  audioZh?: string;
  audioEn?: string;
  chinese: string;
  english?: string;
  chineseChoices?: Choice[];
  englishChoices?: Choice[];
};

export default function ExamReadAloud({
  questionId, audioZh, audioEn, chinese, english,
  chineseChoices = [], englishChoices = [],
}: Props) {
  const [playing, setPlaying] = useState<Language | null>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const storedRate = useSyncExternalStore(subscribeRate, readRate, () => null);
  const [fallbackRate, setFallbackRate] = useState(0.8);
  const rate = storedRate ?? fallbackRate;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const cursorRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const zhAudio = useRef<HTMLAudioElement | null>(null);
  const enAudio = useRef<HTMLAudioElement | null>(null);
  const available = typeof window !== "undefined" && "speechSynthesis" in window;
  const completeEnglish = Boolean(
    english?.trim() &&
    englishChoices.length === chineseChoices.length &&
    chineseChoices.every((item, i) =>
      item.key === englishChoices[i]?.key && Boolean(englishChoices[i]?.label?.trim())),
  );
  const scripts: Record<Language, string> = {
    zh: buildReadAloudText(chinese, chineseChoices, "zh"),
    en: completeEnglish ? buildReadAloudText(english || "", englishChoices, "en") : "",
  };

  useEffect(() => {
    if (zhAudio.current) zhAudio.current.playbackRate = rate;
    if (enAudio.current) enAudio.current.playbackRate = rate;
  }, [rate, questionId, audioZh, audioEn]);

  function clearSpeech() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    utteranceRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  useEffect(() => {
    const zh = zhAudio.current;
    const en = enAudio.current;
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      zh?.pause();
      en?.pause();
    };
  }, [questionId]);

  function startSpeech(language: Language, startAt = 0, speed = rate) {
    if (!available || !scripts[language]) return;
    clearSpeech();
    zhAudio.current?.pause();
    enAudio.current?.pause();
    const script = scripts[language];
    const start = Math.min(script.length - 1, Math.max(0, startAt));
    const utterance = new SpeechSynthesisUtterance(script.slice(start));
    const charsPerSecond = language === "zh" ? 3.7 : 12;
    utterance.lang = language === "zh" ? "zh-CN" : "en-US";
    utterance.rate = speed;
    utterance.onstart = () => {
      let ticks = 0;
      timerRef.current = setInterval(() => {
        ticks += 1;
        // Web Speech does not report a precise timeline on every browser.
        // While synthesizing, this is explicitly an estimated reading position.
        cursorRef.current = Math.min(script.length - 1, Math.max(
          cursorRef.current,
          start + Math.floor((ticks / 4) * charsPerSecond * utterance.rate),
        ));
        setProgress(Math.round((cursorRef.current / script.length) * 100));
      }, 250);
    };
    utterance.onboundary = (e) => {
      if (utteranceRef.current !== utterance) return;
      cursorRef.current = Math.min(script.length, start + e.charIndex);
      setProgress(Math.round((cursorRef.current / script.length) * 100));
    };
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      utteranceRef.current = null;
      cursorRef.current = 0;
      setPlaying(null);
      setPaused(false);
      setProgress(100);
    };
    utterance.onerror = () => {
      if (utteranceRef.current !== utterance) return;
      clearSpeech();
      setPlaying(null);
      setPaused(false);
      setError("播放失败。请检查设备的语音引擎，或使用音频文件。");
    };
    utteranceRef.current = utterance;
    cursorRef.current = start;
    setProgress(Math.round((start / script.length) * 100));
    setPlaying(language);
    setPaused(false);
    setError("");
    window.speechSynthesis.speak(utterance);
  }

  function changeRate() {
    const next = rate === 0.8 ? 0.7 : rate === 0.7 ? 1 : 0.8;
    setFallbackRate(next);
    try { window.localStorage.setItem(SPEED_KEY, String(next)); } catch {}
    window.dispatchEvent(new Event(SPEED_EVENT));
    // Web Speech voices cannot reliably change speed mid-utterance;
    // restart from the estimated current position without jumping to Q1.
    if (playing && !paused) startSpeech(playing, cursorRef.current, next);
  }

  function toggle(language: Language) {
    if (!available) return;
    if (playing === language) {
      if (paused) {
        window.speechSynthesis.resume();
        setPaused(false);
      } else {
        window.speechSynthesis.pause();
        setPaused(true);
      }
      return;
    }
    startSpeech(language, 0);
  }

  function seek(language: Language, percent: number) {
    const script = scripts[language];
    if (!script.length) return;
    const at = Math.floor((Math.max(0, Math.min(100, percent)) / 100) * script.length);
    setProgress(percent);
    cursorRef.current = at;
    if (playing === language) startSpeech(language, at);
  }

  function audioStarted(language: Language) {
    clearSpeech();
    setPlaying(null);
    setPaused(false);
    setError("");
    if (language === "zh") enAudio.current?.pause();
    else zhAudio.current?.pause();
  }

  function speechControls(language: Language) {
    const caption = language === "zh" ? "中文读题（含全部选项）" : "English question and options";
    const isPlaying = playing === language;
    return (
      <div className="exam-speech-track" key={language}>
        <span className="exam-speech-label">{caption}</span>
        <div className="exam-speech-controls">
          <button
            type="button"
            disabled={!available || !scripts[language]}
            aria-pressed={isPlaying && !paused}
            onClick={() => toggle(language)}
          >
            {isPlaying && !paused ? "Ⅱ 暂停" : isPlaying ? "▶ 继续" : "▶ 播放"}
          </button>
          <input
            type="range" min="0" max="100" step="1"
            value={isPlaying ? progress : 0}
            disabled={!available || !scripts[language]}
            aria-label={language === "zh" ? "估算朗读进度" : "Estimated reading progress"}
            onChange={(e) => seek(language, Number(e.target.value))}
          />
          <span className="exam-speech-percent">{isPlaying ? progress : 0}%</span>
          {isPlaying && <button type="button" onClick={() => {
            clearSpeech();
            setPlaying(null);
            setPaused(false);
            setProgress(0);
          }}>■ 停止</button>}
        </div>
        <small>设备语音 · 进度为估算值；音频版支持精确时间轴</small>
      </div>
    );
  }

  return (
    <div className="exam-read-aloud" aria-label="题目及选项语音朗读">
      <div className="exam-speech-speed">
        <button type="button" onClick={changeRate} aria-label="切换朗读语速">
          语速 {rate.toFixed(1)}×
        </button>
      </div>
      {audioZh ? <div className="exam-audio-track">
        <span>中文完整朗读</span>
        <audio key={questionId + "-zh"} ref={zhAudio} controls preload="metadata"
          onLoadedMetadata={(e) => { e.currentTarget.playbackRate = rate; }}
          onPlay={() => audioStarted("zh")} src={audioZh} aria-label="中文题干及全部选项音频" />
      </div> : speechControls("zh")}
      {completeEnglish && (audioEn ? <div className="exam-audio-track">
        <span>English · Full question and options</span>
        <audio key={questionId + "-en"} ref={enAudio} controls preload="metadata"
          onLoadedMetadata={(e) => { e.currentTarget.playbackRate = rate; }}
          onPlay={() => audioStarted("en")} src={audioEn} aria-label="English full reading audio" />
      </div> : speechControls("en"))}
      {!available && !audioZh && <span role="status">此设备不支持浏览器语音，请使用音频文件版。</span>}
      {error && <span role="status">{error}</span>}
    </div>
  );
}

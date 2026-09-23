"use client";

import { useEffect, useMemo, useState } from "react";
import ThreeSolidScene from "@/components/ThreeSolidScene";
import MathDslScene from "@/components/MathDslScene";
import styles from "./SmartSolutionPlayer.module.css";
import { buildFallbackStoryboard, type SolutionScene, type SolutionStoryboard, type SolutionVisual } from "@/lib/solution-storyboard";

type Props = {
  questionId: string;
  questionNo: number;
  stem: string;
  solution?: string;
  answer: string;
  concept?: string;
  assetUrl?: string;
};

function SourceImage({ url }: { url: string }) {
  return (
    <div className="solution-source-frame">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="原题图，用于交互讲解" />
      <div className="solution-scanline" />
    </div>
  );
}

function NumberLine({ visual }: { visual: Extract<SolutionVisual, { type: "number-line" }> }) {
  const values = Array.from({ length: Math.max(2, visual.end - visual.start + 1) }, (_, i) => visual.start + i);
  return <div className="solution-number-line">
    <div className="number-track" />
    <div className="number-points">{values.slice(0, 12).map((value) => <span key={value} className={value === visual.marker ? "hot" : ""}><i />{value}</span>)}</div>
  </div>;
}

function FractionBar({ visual }: { visual: Extract<SolutionVisual, { type: "fraction-bar" }> }) {
  return <div className="solution-fraction-wrap">
    <div className="solution-fraction-bar">{Array.from({ length: visual.denominator }, (_, i) => <i key={i} className={i < visual.numerator ? "filled" : ""} />)}</div>
    <strong>{visual.numerator}/{visual.denominator}</strong>
  </div>;
}
function VisualStage({ scene }: { scene: SolutionScene }) {
  const visual=scene.visual;
  if (scene.renderSpec?.script?.length && scene.renderSpec.engine !== "source") return <MathDslScene script={scene.renderSpec.script} />;
  if (visual.type === "source-image") return <SourceImage url={visual.url} />;
  if (visual.type === "number-line") return <NumberLine visual={visual} />;
  if (visual.type === "fraction-bar") return <FractionBar visual={visual} />;
  if (visual.type === "solid3d") return <ThreeSolidScene />;
  return <div className="solution-empty-visual"><span>🦘</span><strong>先把题意说清楚，再决定画什么图。</strong><small>不确定的图，系统宁可不乱画。</small></div>;
}

function SolutionTeacher({ speaking }: { speaking: boolean }) {
  return (
    <aside className={styles.teacherSlot} aria-label="袋鼠数学老师">
      <div className={`${styles.teacherAvatar} ${speaking ? styles.speaking : ""}`}>
        <svg viewBox="0 0 120 132" role="img" aria-label="戴眼镜的Q版袋鼠数学老师">
          <ellipse cx="39" cy="25" rx="12" ry="27" transform="rotate(-13 39 25)" fill="#c88755" />
          <ellipse cx="81" cy="25" rx="12" ry="27" transform="rotate(13 81 25)" fill="#c88755" />
          <ellipse cx="39" cy="24" rx="5" ry="17" transform="rotate(-13 39 24)" fill="#f2b99a" />
          <ellipse cx="81" cy="24" rx="5" ry="17" transform="rotate(13 81 24)" fill="#f2b99a" />
          <circle cx="60" cy="64" r="39" fill="#d99a63" />
          <ellipse cx="60" cy="76" rx="27" ry="21" fill="#f2c3a0" />
          <circle cx="47" cy="59" r="4.4" fill="#2e3a33" />
          <circle cx="73" cy="59" r="4.4" fill="#2e3a33" />
          <circle cx="47" cy="59" r="11" fill="none" stroke="#34443b" strokeWidth="3" />
          <circle cx="73" cy="59" r="11" fill="none" stroke="#34443b" strokeWidth="3" />
          <path d="M58 59h4" stroke="#34443b" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="60" cy="72" rx="5" ry="3.5" fill="#684b3c" />
          <path d="M51 82c6 6 12 6 18 0" fill="none" stroke="#684b3c" strokeWidth="3" strokeLinecap="round" />
          <path d="M35 105c9-9 41-9 50 0l8 27H27z" fill="#f3a45f" />
          <path d="M47 101l13 13 13-13" fill="#fff9ef" />
          <path d="M88 108l17-18" stroke="#5b6d61" strokeWidth="4" strokeLinecap="round" />
          <circle cx="107" cy="88" r="4" fill="#ff7a45" />
        </svg>
      </div>
      <div className={styles.teacherBubble}>{speaking ? "听我慢慢讲" : "我们一步一步来"}</div>
    </aside>
  );
}

function speak(text: string, rate: number, onDone: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = Math.max(0.75, Math.min(1.2, rate * 0.96));
  utterance.pitch = 1.02;
  const voices = synth.getVoices();
  const preferred = [
    /Xiaoxiao/i,
    /Tingting/i,
    /Meijia/i,
    /Sinji/i,
    /zh-CN|Chinese/i,
  ];
  utterance.voice = preferred
    .map((pattern) => voices.find((voice) => pattern.test(`${voice.lang} ${voice.name}`)))
    .find(Boolean) || null;
  utterance.onend = onDone;
  utterance.onerror = onDone;
  synth.speak(utterance);
  return true;
}

export default function SmartSolutionPlayer(props: Props) {
  const fallback = useMemo(() => buildFallbackStoryboard(props), [props]);
  const [verified, setVerified] = useState<SolutionStoryboard | null>(null);
  const storyboard = verified || fallback;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoStartPending, setAutoStartPending] = useState(false);
  const [rate, setRate] = useState(1);
  const scene = storyboard.scenes[index];

  useEffect(() => {
    if (!open || verified) return;
    let cancelled = false;
    fetch(`/api/solutions/${encodeURIComponent(props.questionId)}`, { cache: "no-store" })
      .then(async (res) => res.ok ? res.json() as Promise<SolutionStoryboard> : null)
      .then((data) => {
        if (!cancelled && data?.quality === "verified" && data.scenes?.length) {
          setVerified(data);
          setIndex(0);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled && autoStartPending) {
          window.dispatchEvent(new CustomEvent("smart-solution-start", { detail: { questionId: props.questionId } }));
          setAutoStartPending(false);
          setPlaying(true);
        }
      });
    return () => { cancelled = true; };
  }, [autoStartPending, open, props.questionId, verified]);

  useEffect(() => {
    const stopForOtherPlayer = (event: Event) => {
      const detail = (event as CustomEvent<{ questionId?: string }>).detail;
      if (detail?.questionId && detail.questionId !== props.questionId) {
        setPlaying(false);
        setAutoStartPending(false);
      }
    };
    window.addEventListener("smart-solution-start", stopForOtherPlayer);
    return () => window.removeEventListener("smart-solution-start", stopForOtherPlayer);
  }, [props.questionId]);

  const startPlayback = () => {
    window.dispatchEvent(new CustomEvent("smart-solution-start", { detail: { questionId: props.questionId } }));
    setPlaying(true);
  };

  const openAndStart = () => {
    setOpen(true);
    setIndex(0);
    if (verified) startPlayback();
    else setAutoStartPending(true);
  };

  useEffect(() => {
    if (!open || !playing || !scene) return;

    let active = true;
    let audio: HTMLAudioElement | null = null;
    let fallbackTimer: number | null = null;
    let transitionTimer: number | null = null;
    let fallbackStarted = false;

    const advanceScene = () => {
      if (!active) return;
      active = false;
      if (index >= storyboard.scenes.length - 1) {
        setPlaying(false);
      } else {
        setIndex((value) => Math.min(storyboard.scenes.length - 1, value + 1));
      }
    };

    const finishScene = () => {
      if (!active || transitionTimer !== null) return;
      transitionTimer = window.setTimeout(advanceScene, 420);
    };

    const playSpeechFallback = () => {
      if (!active || fallbackStarted) return;
      fallbackStarted = true;
      const started = speak(scene.narration, rate, finishScene);
      if (!started) {
        const estimate = Math.max(scene.durationMs || 0, 2200 + scene.narration.length * 180);
        fallbackTimer = window.setTimeout(finishScene, estimate / Math.max(0.75, rate));
      }
    };

    if (scene.audioUrl) {
      audio = new Audio(scene.audioUrl);
      audio.preload = "auto";
      audio.playbackRate = rate;
      audio.onended = finishScene;
      audio.onerror = playSpeechFallback;
      audio.play().catch(playSpeechFallback);
    } else {
      playSpeechFallback();
    }

    return () => {
      active = false;
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      if (transitionTimer !== null) window.clearTimeout(transitionTimer);
      if (audio) {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
      }
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, [index, open, playing, rate, scene, storyboard.scenes.length]);

  if (!open) {
    return <div className="smart-solution-entry">
      <button className="smart-solution-launch" onClick={openAndStart}>
        <span>✨</span><div><strong>动画讲懂这道题</strong><small>打开即自动连续讲解 · 声音同步</small></div><b>打开 →</b>
      </button>
      {storyboard.requiresGeneration && <p className="solution-quality-note">当前只有官方答案；系统会先展示安全版讲解，不会编造推导。</p>}
    </div>;
  }

  return <section className="smart-solution-player">
    <div className="solution-player-head">
      <div><span className="solution-mascot">🦘</span><div><small>Q{props.questionNo} · 数学侦探模式</small><strong>{scene.title}</strong></div></div>
      <button className="solution-close" onClick={() => { setOpen(false); setPlaying(false); setAutoStartPending(false); }}>收起</button>
    </div>

    <div className="solution-stage">
      <VisualStage scene={scene} />
      <div className="solution-story-card">
        <div className={styles.storyTop}>
          <span className="solution-step-tag">STEP {index + 1}/{storyboard.scenes.length}</span>
          <SolutionTeacher speaking={playing} />
        </div>
        <p>{scene.narration}</p>
        {scene.caption && <div className="solution-caption">{scene.caption}</div>}
        {scene.checkpoint && <button className="solution-checkpoint" onClick={() => setPlaying(false)}>💡 {scene.checkpoint}</button>}
      </div>
    </div>
    <div className="solution-progress">{storyboard.scenes.map((_, i) => <button key={i} aria-label={`跳到第 ${i + 1} 步`} className={i === index ? "active" : i < index ? "done" : ""} onClick={() => setIndex(i)} />)}</div>

    <div className="solution-controls">
      <button className="secondary-button" disabled={index === 0} onClick={() => setIndex((v) => Math.max(0, v - 1))}>← 上一步</button>
      <button
        className={playing ? "primary-button solution-playing" : "primary-button"}
        disabled={autoStartPending}
        onClick={() => playing ? setPlaying(false) : startPlayback()}
      >{autoStartPending ? "正在准备讲解…" : playing ? "暂停一下" : "▶ 继续讲解"}</button>
      <select aria-label="讲解速度" value={rate} onChange={(e) => setRate(Number(e.target.value))}>
        <option value={0.88}>慢一点</option><option value={1}>正常</option><option value={1.15}>快一点</option>
      </select>
      <button className="secondary-button" disabled={index === storyboard.scenes.length - 1} onClick={() => setIndex((v) => Math.min(storyboard.scenes.length - 1, v + 1))}>下一步 →</button>
    </div>

    <div className={`solution-quality ${storyboard.quality}`}>
      {storyboard.quality === "verified"
        ? "✓ AI 精讲已复核：答案与官方答案一致，推导与证据页核对通过。"
        : storyboard.quality === "answer-only"
          ? "待生成完整推导：当前只使用原题与官方答案，不自动臆造过程。"
          : "当前为自动结构化讲解；高价值题可升级为复核后的精讲版。"}
    </div>
  </section>;
}

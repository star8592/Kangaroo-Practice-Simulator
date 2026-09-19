"use client";

import { useEffect, useMemo, useState } from "react";
import ThreeSolidScene from "@/components/ThreeSolidScene";
import MathDslScene from "@/components/MathDslScene";
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

function speak(text: string, rate: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = rate;
  utterance.pitch = 1.08;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((v) => /zh|Chinese|Xiaoxiao|Tingting/i.test(`${v.lang} ${v.name}`)) || null;
  window.speechSynthesis.speak(utterance);
}

export default function SmartSolutionPlayer(props: Props) {
  const fallback = useMemo(() => buildFallbackStoryboard(props), [props]);
  const [verified, setVerified] = useState<SolutionStoryboard | null>(null);
  const storyboard = verified || fallback;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
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
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [open, props.questionId, verified]);

  useEffect(() => {
    if (!open || !scene || !voiceOn) return;
    let audio: HTMLAudioElement | null = null;
    if (scene.audioUrl) {
      audio = new Audio(scene.audioUrl);
      audio.playbackRate = rate;
      audio.play().catch(() => speak(scene.narration, rate));
    } else speak(scene.narration, rate);
    return () => {
      audio?.pause();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, [index, open, voiceOn, rate, scene]);
  useEffect(() => {
    if (!open || !playing || !scene) return;
    const timer = window.setTimeout(() => {
      if (index >= storyboard.scenes.length - 1) setPlaying(false);
      else setIndex((v) => v + 1);
    }, scene.durationMs || 6000);
    return () => window.clearTimeout(timer);
  }, [open, playing, index, scene, storyboard.scenes.length]);

  if (!open) {
    return <div className="smart-solution-entry">
      <button className="smart-solution-launch" onClick={() => setOpen(true)}>
        <span>✨</span><div><strong>动画讲懂这道题</strong><small>数形结合 · 可交互 · 可语音</small></div><b>打开 →</b>
      </button>
      {storyboard.requiresGeneration && <p className="solution-quality-note">当前只有官方答案；系统会先展示安全版讲解，不会编造推导。</p>}
    </div>;
  }

  return <section className="smart-solution-player">
    <div className="solution-player-head">
      <div><span className="solution-mascot">🦘</span><div><small>Q{props.questionNo} · 数学侦探模式</small><strong>{scene.title}</strong></div></div>
      <button className="solution-close" onClick={() => { setOpen(false); setPlaying(false); }}>收起</button>
    </div>

    <div className="solution-stage">
      <VisualStage scene={scene} />
      <div className="solution-story-card">
        <span className="solution-step-tag">STEP {index + 1}/{storyboard.scenes.length}</span>
        <p>{scene.narration}</p>
        {scene.caption && <div className="solution-caption">{scene.caption}</div>}
        {scene.checkpoint && <button className="solution-checkpoint" onClick={() => setPlaying(false)}>💡 {scene.checkpoint}</button>}
      </div>
    </div>
    <div className="solution-progress">{storyboard.scenes.map((_, i) => <button key={i} aria-label={`跳到第 ${i + 1} 步`} className={i === index ? "active" : i < index ? "done" : ""} onClick={() => setIndex(i)} />)}</div>

    <div className="solution-controls">
      <button className="secondary-button" disabled={index === 0} onClick={() => setIndex((v) => Math.max(0, v - 1))}>← 上一步</button>
      <button className={playing ? "primary-button solution-playing" : "primary-button"} onClick={() => setPlaying((v) => !v)}>{playing ? "暂停一下" : "▶ 自动讲解"}</button>
      <button className={voiceOn ? "secondary-button active" : "secondary-button"} onClick={() => setVoiceOn((v) => !v)}>{voiceOn ? "🔊 解说开" : "🔈 解说关"}</button>
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

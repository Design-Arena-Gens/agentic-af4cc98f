'use client';

import { useEffect, useRef, useState } from 'react';

type RecorderState = 'idle' | 'recording';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const WALK_CYCLE_MS = 1400;
const SKYLINE_SEGMENTS = 12;
const STAR_COUNT = 120;

const getDevicePixelRatio = () =>
  typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);

type Star = {
  x: number;
  y: number;
  size: number;
  twinkleOffset: number;
};

type SkylineSegment = {
  base: number;
  height: number;
  width: number;
};

const generateStars = (count: number): Star[] =>
  Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random() * 0.5,
    size: 0.5 + Math.random() * 1.5,
    twinkleOffset: Math.random() * Math.PI * 2,
  }));

const generateSkyline = (): SkylineSegment[] => {
  const skyline: SkylineSegment[] = [];
  for (let i = 0; i < SKYLINE_SEGMENTS; i += 1) {
    skyline.push({
      base: i / SKYLINE_SEGMENTS,
      width: 0.08 + Math.random() * 0.12,
      height: 0.3 + Math.random() * 0.25,
    });
  }
  return skyline;
};

export function NightWalkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const pendingTimeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('Enjoy the nighttime walk. Record a clip when you are ready.');

  const [stars] = useState(() => generateStars(STAR_COUNT));
  const [skyline] = useState(() => generateSkyline());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const ratio = getDevicePixelRatio();
      canvas.width = CANVAS_WIDTH * ratio;
      canvas.height = CANVAS_HEIGHT * ratio;
      canvas.style.width = `${CANVAS_WIDTH}px`;
      canvas.style.height = `${CANVAS_HEIGHT}px`;
      ctx.scale(ratio, ratio);
    };

    updateCanvasSize();
    startTimeRef.current = performance.now();

    const draw = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;
      const cycleProgress = (elapsed % WALK_CYCLE_MS) / WALK_CYCLE_MS;
      const walkPhase = cycleProgress * Math.PI * 2;

      renderFrame(ctx, cycleProgress, walkPhase, stars, skyline, elapsed);
      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    const handleResize = () => {
      if (!canvasRef.current || !ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      updateCanvasSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [skyline, stars]);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
      if (pendingTimeoutRef.current) {
        window.clearTimeout(pendingTimeoutRef.current);
      }
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const handleRecord = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!('captureStream' in canvas)) {
      setMessage("Recording isn't supported in this browser.");
      return;
    }

    if (recorderState === 'recording') {
      recorderRef.current?.stop();
      return;
    }

    const stream = canvas.captureStream(60);
    const chunks: Blob[] = [];

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 4_000_000,
      });
      recorderRef.current = recorder;
      setRecorderState('recording');
      setMessage('Recording in progress… capturing a 10 second loop.');
      setDownloadUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (chunks.length === 0) {
          setMessage('No data captured. Try recording again.');
          setRecorderState('idle');
          return;
        }

        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setMessage('Clip ready! Use the download button to save your video.');
        setRecorderState('idle');
      };

      recorder.onerror = () => {
        setMessage('Recording failed. Please try again or use a different browser.');
        setRecorderState('idle');
      };

      recorder.start();

      pendingTimeoutRef.current = window.setTimeout(() => {
        recorder.stop();
        pendingTimeoutRef.current = null;
      }, 10_000);
    } catch (error) {
      console.error(error);
      setMessage('Recording is unavailable. Check browser support for MediaRecorder.');
    }
  };

  return (
    <div className="relative flex w-full max-w-5xl flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-white/3 p-6 shadow-[0_0_60px_rgba(56,189,248,0.15)] backdrop-blur-2xl sm:p-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-sky-100 sm:text-4xl">
          Night Walk Generator
        </h1>
        <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
          A stylized nocturnal stroll brought to life with canvas animation. Capture a webm video of
          the loop to use in your creative projects.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="h-full w-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-slate-950/30 via-transparent to-sky-400/5" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRecord}
            className="flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-sky-400 active:bg-sky-300"
          >
            {recorderState === 'recording' ? (
              <>
                <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-400" />
                Stop Recording
              </>
            ) : (
              <>
                <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-sky-100" />
                Record 10s Clip
              </>
            )}
          </button>

          {downloadUrl && (
            <a
              href={downloadUrl}
              download="night-walk.webm"
              className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 px-5 py-2.5 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:text-white"
            >
              <span aria-hidden="true">⬇️</span>
              Download Clip
            </a>
          )}
        </div>
        <p className="text-xs text-slate-400 sm:text-sm">{message}</p>
      </div>
    </div>
  );
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  cycleProgress: number,
  walkPhase: number,
  stars: Star[],
  skyline: SkylineSegment[],
  elapsed: number
) {
  const width = CANVAS_WIDTH;
  const height = CANVAS_HEIGHT;

  ctx.clearRect(0, 0, width, height);
  drawSky(ctx, width, height, stars, elapsed);
  drawSkyline(ctx, width, height, skyline, elapsed);
  drawStreet(ctx, width, height, elapsed);
  drawCharacter(ctx, width, height, cycleProgress, walkPhase);
  drawAtmospherics(ctx, width, height, elapsed);
}

function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number, stars: Star[], elapsed: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#020617');
  gradient.addColorStop(0.35, '#0b183a');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.fillStyle = '#f8fafc';
  stars.forEach((star, index) => {
    const x = star.x * width + Math.sin(elapsed * 0.00005 + index) * 15;
    const y = star.y * height;
    const twinkle = 0.7 + Math.sin(elapsed * 0.002 + star.twinkleOffset) * 0.3;
    ctx.globalAlpha = 0.3 + twinkle * 0.7;
    ctx.beginPath();
    ctx.arc(x, y, star.size * twinkle, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawSkyline(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  skyline: SkylineSegment[],
  elapsed: number
) {
  const skylineHeight = height * 0.5;
  const baseY = height * 0.65;

  ctx.save();
  ctx.translate(-((elapsed * 0.02) % (width * 0.35)), 0);

  skyline.forEach((building) => {
    const segWidth = building.width * width;
    const x = building.base * width;
    ctx.fillStyle = '#0b1c3f';
    ctx.fillRect(x, baseY - skylineHeight * building.height, segWidth, skylineHeight * building.height);

    ctx.fillStyle = 'rgba(148, 197, 255, 0.06)';
    ctx.fillRect(x + segWidth * 0.1, baseY - skylineHeight * building.height, segWidth * 0.2, skylineHeight * building.height);
  });

  ctx.restore();
}

function drawStreet(ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number) {
  const horizon = height * 0.68;
  const roadHeight = height * 0.32;

  const gradient = ctx.createLinearGradient(0, horizon, 0, height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#020617');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, horizon, width, roadHeight);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-width, height);
  ctx.lineTo(width * 2, horizon + 10);
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
  ctx.lineWidth = 4;
  ctx.setLineDash([80, 60]);
  ctx.lineDashOffset = (elapsed * 0.2) % 140;
  ctx.beginPath();
  ctx.moveTo(0, horizon + roadHeight * 0.55);
  ctx.lineTo(width, height);
  ctx.stroke();
  ctx.restore();
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cycleProgress: number,
  walkPhase: number
) {
  const baseX = width * 0.5;
  const groundY = height * 0.78;
  const stride = Math.sin(walkPhase) * 20;
  const bob = Math.sin(walkPhase * 2) * 4;
  const coatLightness = 52 + Math.sin(cycleProgress * Math.PI * 2) * 6;

  ctx.save();
  ctx.translate(baseX + stride * 0.6, groundY - bob);

  ctx.shadowColor = 'rgba(37, 99, 235, 0.4)';
  ctx.shadowBlur = 25;

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(-120, 20, 140, 20, 0, 0, Math.PI * 2);
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(0, -140);
  ctx.fillStyle = '#38bdf8';
  ctx.save();
  ctx.rotate(Math.sin(walkPhase) * 0.1);
  ctx.fillRect(-12, -90, 24, 110);
  ctx.restore();

  ctx.fillStyle = `hsl(199 88% ${coatLightness}%)`;
  drawRoundedRect(ctx, -24, -35, 48, 70, 18);

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(0, -120, 26, 0, Math.PI * 2);
  ctx.fill();

  drawLimb(ctx, 0, -60, 18, walkPhase, true);
  drawLimb(ctx, 0, -60, 18, walkPhase + Math.PI, true);

  drawLimb(ctx, 0, 0, 28, walkPhase + Math.PI, false);
  drawLimb(ctx, 0, 0, 28, walkPhase, false);
  ctx.restore();

  ctx.restore();
}

function drawLimb(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  length: number,
  phase: number,
  isArm: boolean
) {
  const swing = Math.sin(phase) * (isArm ? 0.9 : 1.2);
  const kneeLift = Math.max(0, Math.sin(phase + Math.PI / 2)) * (isArm ? 0 : 0.6);

  ctx.save();
  ctx.translate(originX, originY);

  const jointY = length * 0.55 - kneeLift * 20;
  const jointX = Math.sin(phase + Math.PI / 2) * 6;
  ctx.strokeStyle = isArm ? '#bae6fd' : '#1d4ed8';
  ctx.lineWidth = isArm ? 8 : 10;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(jointX + swing * 10, jointY, swing * 30, length);
  ctx.stroke();

  ctx.restore();
}

function drawAtmospherics(ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number) {
  ctx.save();
  const glowCount = 5;
  for (let i = 0; i < glowCount; i += 1) {
    const x = (i / glowCount) * width + Math.sin(elapsed * 0.0004 + i) * 40;
    const y = height * 0.62 + Math.cos(elapsed * 0.0007 + i) * 10;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 180);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.2)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - 180, y - 180, 360, 360);
  }

  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < width; i += 8) {
    const waveY =
      height * 0.75 +
      Math.sin(i * 0.02 + elapsed * 0.004) * 6 +
      Math.sin(i * 0.05 + elapsed * 0.002) * 4;
    ctx.lineTo(i, waveY);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

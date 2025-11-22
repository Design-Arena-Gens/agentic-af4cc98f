import { NightWalkCanvas } from "@/components/night-walk-canvas";

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="absolute inset-x-0 top-0 mx-auto h-[420px] w-full max-w-6xl -translate-y-1/2 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center gap-8">
        <NightWalkCanvas />
        <section className="grid w-full gap-6 rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-sm text-slate-300 backdrop-blur-3xl sm:grid-cols-3 sm:text-base">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-sky-200">How it Works</h2>
            <p className="mt-2 leading-relaxed text-slate-300/90">
              A procedural canvas animation simulates the rhythm of a lone traveler. Parallax
              skylines, rolling highlights, and a looping gait create the illusion of motion.
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-sky-200">Recording Tips</h2>
            <ul className="mt-2 space-y-2 pl-5 text-slate-300/90 marker:text-sky-400/80 list-disc">
              <li>Recording uses MediaRecorder — desktop Chromium browsers offer best results.</li>
              <li>Download produces a 10 second, 60 FPS webm clip ready for editing.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-sky-200">Creative Uses</h2>
            <ul className="mt-2 space-y-2 pl-5 text-slate-300/90 marker:text-sky-400/80 list-disc">
              <li>Drop into motion graphics timelines as a stylized background loop.</li>
              <li>Blend with typography or lyrics for night-city storytelling.</li>
              <li>Use frames as references for illustration practice.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

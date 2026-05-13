import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { usePlayerStore } from '../store/playerStore';
import { useAudioReactiveStore, getRawFrequencyData } from '../store/audioReactiveStore';
import { useTheme } from '../context/ThemeContext';
import { formatDuration } from '../utils/songUtils';

// ── Particle System ──────────────────────────────────────────
class Particle {
  constructor(cx, cy, radius) {
    const angle = Math.random() * Math.PI * 2;
    const dist = radius + 20 + Math.random() * 80;
    this.x = cx + Math.cos(angle) * dist;
    this.y = cy + Math.sin(angle) * dist;
    this.vx = (Math.random() - 0.5) * 0.6;
    this.vy = (Math.random() - 0.5) * 0.6;
    this.life = 1;
    this.decay = 0.005 + Math.random() * 0.015;
    this.size = 1.5 + Math.random() * 3;
    this.angle = angle;
  }

  update(bass) {
    this.x += this.vx + Math.cos(this.angle) * bass * 0.8;
    this.y += this.vy + Math.sin(this.angle) * bass * 0.8;
    this.life -= this.decay;
  }

  draw(ctx, color) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.life * 0.7;
    ctx.fillStyle = color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Color helpers ────────────────────────────────────────────
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 207, g: 159, b: 255 };
}

function lerpColor(r1, g1, b1, r2, g2, b2, t) {
  return {
    r: Math.round(r1 + (r2 - r1) * t),
    g: Math.round(g1 + (g2 - g1) * t),
    b: Math.round(b1 + (b2 - b1) * t),
  };
}

export default function SongProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentSong, isPlaying } = usePlayerStore();
  const { bass, mid, treble, volume } = useAudioReactiveStore();
  const { accentHex } = useTheme();

  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particlesRef = useRef([]);
  const smoothedDataRef = useRef(new Float32Array(128));
  const containerRef = useRef(null);

  // Accent color in RGB
  const accentRgb = useMemo(() => hexToRgb(accentHex), [accentHex]);
  // Treble color — lighter/cooler shift
  const trebleRgb = useMemo(() => ({
    r: Math.min(255, accentRgb.r + 60),
    g: Math.min(255, accentRgb.g + 40),
    b: Math.min(255, accentRgb.b + 20),
  }), [accentRgb]);

  // Redirect if no song
  useEffect(() => {
    if (!currentSong) {
      navigate('/dashboard');
    }
  }, [currentSong, navigate]);

  // ── Main Canvas Render Loop ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    const smoothed = smoothedDataRef.current;
    const particles = particlesRef.current;

    function render() {
      const dpr = window.devicePixelRatio || 1;
      // Use container dimensions instead of canvas.offsetWidth
      const rect = container.getBoundingClientRect();
      const displayWidth = rect.width;
      const displayHeight = rect.height;

      if (displayWidth === 0 || displayHeight === 0) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // Resize canvas to match display size
      const targetW = Math.round(displayWidth * dpr);
      const targetH = Math.round(displayHeight * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      // Reset transform every frame for clean state
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const width = displayWidth;
      const height = displayHeight;
      const cx = width / 2;
      const cy = height / 2;

      // Get current store state directly (not from React state, for 60fps)
      const store = useAudioReactiveStore.getState();
      const playerStore = usePlayerStore.getState();
      const playing = playerStore.isPlaying;
      const bassLevel = playing ? store.bass : 0;
      const volLevel = playing ? store.volume : 0;
      const midLevel = playing ? store.mid : 0;
      const trebleLevel = playing ? store.treble : 0;

      // Get raw frequency data (128 bins)
      const rawData = getRawFrequencyData();

      // Smooth the frequency data for fluid animation
      const smoothFactor = 0.3;
      for (let i = 0; i < 128; i++) {
        smoothed[i] = smoothed[i] + (rawData[i] - smoothed[i]) * smoothFactor;
      }

      // Clear
      ctx.clearRect(0, 0, width, height);

      // ── Sizing calculations ────────────────────────────────
      const minDim = Math.min(width, height);
      const albumRadius = minDim * 0.2; // Album art radius
      const barGap = albumRadius + 18; // Where bars start
      const maxBarHeight = minDim * 0.22; // Max bar height

      // ── Background Ambient Pulse ────────────────────────────
      const pulseRadius = albumRadius * 2.5 + bassLevel * 80;
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseRadius);
      bgGrad.addColorStop(0, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${0.06 + bassLevel * 0.14})`);
      bgGrad.addColorStop(0.6, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${0.02 + bassLevel * 0.05})`);
      bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // ── Inner Glow Ring ─────────────────────────────────────
      const glowIntensity = 0.15 + bassLevel * 0.45;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, albumRadius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${glowIntensity})`;
      ctx.lineWidth = 3 + bassLevel * 5;
      ctx.shadowBlur = 20 + bassLevel * 40;
      ctx.shadowColor = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${glowIntensity})`;
      ctx.stroke();
      ctx.restore();

      // Secondary ring (treble-reactive)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, albumRadius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${trebleRgb.r}, ${trebleRgb.g}, ${trebleRgb.b}, ${0.05 + trebleLevel * 0.2})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 10 + trebleLevel * 25;
      ctx.shadowColor = `rgba(${trebleRgb.r}, ${trebleRgb.g}, ${trebleRgb.b}, 0.3)`;
      ctx.stroke();
      ctx.restore();

      // ── Circular Frequency Bars ─────────────────────────────
      const numBars = 80;
      const barWidth = 4;

      for (let i = 0; i < numBars; i++) {
        // Mirror: first half = ascending bins, second half = mirrored
        const halfBars = numBars / 2;
        const dataIndex = i < halfBars
          ? Math.floor((i / halfBars) * 50)
          : Math.floor(((numBars - 1 - i) / halfBars) * 50);

        const value = smoothed[dataIndex] || 0;
        const amplitude = value / 255;

        // Non-linear scaling for more dramatic effect
        const scaledAmplitude = Math.pow(amplitude, 0.75);

        // Bar height: minimum + dynamic
        const barHeight = Math.max(3, scaledAmplitude * maxBarHeight);

        // Angle evenly distributed, rotated so symmetry axis is at bottom
        const angle = (i * (Math.PI * 2)) / numBars;
        const rot = angle + Math.PI / 2;

        // Color gradient from bass (accent) to treble (lighter)
        const colorT = i < halfBars ? i / halfBars : (numBars - 1 - i) / halfBars;
        const barColor = lerpColor(
          accentRgb.r, accentRgb.g, accentRgb.b,
          trebleRgb.r, trebleRgb.g, trebleRgb.b,
          colorT
        );

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        // Draw bar
        ctx.beginPath();
        ctx.moveTo(0, barGap);
        ctx.lineTo(0, barGap + barHeight);
        ctx.lineWidth = barWidth;
        ctx.lineCap = 'round';

        // Dynamic opacity and glow
        const barOpacity = 0.3 + scaledAmplitude * 0.7;
        ctx.strokeStyle = `rgba(${barColor.r}, ${barColor.g}, ${barColor.b}, ${barOpacity})`;
        ctx.shadowBlur = 6 + scaledAmplitude * 20;
        ctx.shadowColor = `rgba(${barColor.r}, ${barColor.g}, ${barColor.b}, ${0.3 + scaledAmplitude * 0.5})`;

        ctx.stroke();
        ctx.restore();
      }

      // ── Outer Ambient Dots Ring ──────────────────────────────
      const dotRing = barGap + maxBarHeight + 20;
      const numDots = 36;
      for (let i = 0; i < numDots; i++) {
        const dataIdx = Math.floor((i / numDots) * 64);
        const val = (smoothed[dataIdx] || 0) / 255;
        const dotAngle = (i * Math.PI * 2) / numDots + Math.PI / 2;
        const dotX = cx + Math.cos(dotAngle) * (dotRing + val * 15);
        const dotY = cy + Math.sin(dotAngle) * (dotRing + val * 15);
        const dotSize = 1.5 + val * 2.5;

        ctx.save();
        ctx.globalAlpha = 0.2 + val * 0.6;
        ctx.fillStyle = `rgb(${trebleRgb.r}, ${trebleRgb.g}, ${trebleRgb.b})`;
        ctx.shadowBlur = 4 + val * 8;
        ctx.shadowColor = `rgba(${trebleRgb.r}, ${trebleRgb.g}, ${trebleRgb.b}, 0.5)`;
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Particle System (treble-driven) ─────────────────────
      // Spawn particles on treble/mid hits
      if (playing && trebleLevel > 0.3 && Math.random() > 0.4) {
        particles.push(new Particle(cx, cy, barGap + maxBarHeight * 0.5));
      }
      if (playing && bassLevel > 0.6 && Math.random() > 0.7) {
        particles.push(new Particle(cx, cy, albumRadius));
      }

      // Cap particle count
      while (particles.length > 60) particles.shift();

      // Update & draw particles
      const particleColor = `rgb(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b})`;
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(bassLevel);
        particles[i].draw(ctx, particleColor);
        if (particles[i].life <= 0) particles.splice(i, 1);
      }

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [accentRgb, trebleRgb]);

  // ── Handle canvas resize ──────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      // Force re-render on next frame (the render loop handles sizing)
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!currentSong) return null;

  // Audio-reactive styles for the album art
  const albumScale = isPlaying ? 1 + bass * 0.04 : 1;
  const albumGlow = isPlaying
    ? `0 0 ${30 + bass * 60}px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${0.2 + bass * 0.45}),
       0 0 ${10 + volume * 30}px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${0.1 + volume * 0.2})`
    : '0 0 30px rgba(0,0,0,0.5)';
  const albumBorderColor = isPlaying
    ? `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${0.2 + bass * 0.5})`
    : 'rgba(255,255,255,0.05)';

  // Spin speed reacts to tempo/bass
  const spinDuration = isPlaying ? `${Math.max(6, 20 - bass * 10)}s` : '0s';

  return (
    <AppLayout>
      <div className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4">

        {/* Background ambient pulse layers */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: isPlaying
              ? `radial-gradient(ellipse at center, rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${0.04 + bass * 0.08}) 0%, transparent 70%)`
              : 'none',
            transition: 'background 150ms ease-out',
          }}
        />

        {/* Song Info Header */}
        <div className="relative z-10 mb-2 flex w-full flex-col items-center text-center">
          <h1
            className="text-4xl font-black drop-shadow-lg md:text-5xl"
            style={{
              color: 'var(--text-primary)',
              textShadow: isPlaying ? `0 0 ${20 + bass * 30}px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${0.15 + bass * 0.25})` : 'none',
            }}
          >
            {currentSong.title}
          </h1>
          <p className="mt-2 text-xl font-bold" style={{ color: 'var(--text-secondary)' }}>
            {currentSong.artistName || 'Unknown Artist'}
          </p>
          <div className="mt-3 flex gap-3">
            <span
              className="glass-card rounded-full border px-4 py-1 text-xs font-bold"
              style={{ color: 'var(--accent)', borderColor: 'var(--border)' }}
            >
              {currentSong.genre || 'General'}
            </span>
            {currentSong.duration > 0 && (
              <span
                className="glass-card rounded-full border px-4 py-1 text-xs font-bold"
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
              >
                {formatDuration(currentSong.duration)}
              </span>
            )}
          </div>
        </div>

        {/* Visualizer Container - explicit dimensions */}
        <div
          ref={containerRef}
          className="relative flex items-center justify-center"
          style={{ width: '100%', maxWidth: 650, height: 650 }}
        >

          {/* Central Spinning Record Image */}
          <div
            className="absolute z-10 overflow-hidden rounded-full"
            style={{
              width: '40%',
              height: '40%',
              border: `4px solid ${albumBorderColor}`,
              boxShadow: albumGlow,
              transform: `scale(${albumScale})`,
              transition: 'transform 120ms ease-out, box-shadow 120ms ease-out, border-color 120ms ease-out',
              animation: isPlaying ? `spin ${spinDuration} linear infinite` : 'none',
            }}
          >
            <img
              src={currentSong.coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80'}
              alt={currentSong.title}
              className="h-full w-full object-cover"
            />
            {/* Center dot (vinyl effect) */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: '12%',
                height: '12%',
                background: 'rgba(0,0,0,0.7)',
                border: `2px solid rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${0.3 + bass * 0.4})`,
                boxShadow: `inset 0 0 6px rgba(0,0,0,0.8), 0 0 ${4 + bass * 8}px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.3)`,
              }}
            />
          </div>

          {/* Canvas for frequency bars, particles, rings */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Playback status indicator */}
        <div className="relative z-10 mt-2 flex items-center gap-3">
          {isPlaying ? (
            <div className="flex items-center gap-2">
              <div className="flex items-end gap-[3px]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      borderRadius: 2,
                      background: `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${0.6 + bass * 0.4})`,
                      height: `${6 + Math.sin(Date.now() / 200 + i * 1.2) * 4 + bass * 10}px`,
                      transition: 'height 100ms ease-out',
                    }}
                  />
                ))}
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>Now Playing</span>
            </div>
          ) : (
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Paused</span>
          )}
        </div>

      </div>

      {/* Spin keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AppLayout>
  );
}

import { useSyncExternalStore } from "react";

const RIGHT_WAVE_PATHS = [
  {
    d: "M 1180 860 C 1080 780, 980 700, 920 580 C 860 460, 880 340, 960 220 C 1020 130, 1100 70, 1180 40",
    opacity: 0.35,
    width: 1.2,
    delay: "0s",
  },
  {
    d: "M 1220 880 C 1110 795, 1010 710, 945 590 C 880 470, 905 350, 990 230 C 1055 140, 1135 80, 1210 50",
    opacity: 0.55,
    width: 1.6,
    delay: "-2s",
  },
  {
    d: "M 1260 870 C 1140 785, 1040 695, 975 575 C 910 455, 935 335, 1020 215 C 1085 125, 1165 65, 1240 35",
    opacity: 0.75,
    width: 2,
    delay: "-4s",
  },
  {
    d: "M 1300 890 C 1170 800, 1070 710, 1005 590 C 940 470, 965 350, 1050 230 C 1115 140, 1195 80, 1270 50",
    opacity: 0.9,
    width: 2.4,
    delay: "-6s",
  },
  {
    d: "M 1340 875 C 1200 790, 1100 700, 1035 580 C 970 460, 995 340, 1080 220 C 1145 130, 1225 70, 1300 40",
    opacity: 0.6,
    width: 1.8,
    delay: "-8s",
  },
  {
    d: "M 1380 885 C 1230 795, 1130 705, 1065 585 C 1000 465, 1025 345, 1110 225 C 1175 135, 1255 75, 1330 45",
    opacity: 0.4,
    width: 1.4,
    delay: "-1.5s",
  },
  {
    d: "M 1420 865 C 1260 775, 1160 685, 1095 565 C 1030 445, 1055 325, 1140 205 C 1205 115, 1285 55, 1360 25",
    opacity: 0.25,
    width: 1,
    delay: "-5s",
  },
];

const LEFT_WAVE_PATHS = [
  {
    d: "M 60 120 C 180 240, 320 380, 260 520 C 200 660, 110 760, 40 860",
    opacity: 0.5,
    width: 2.2,
    delay: "-3s",
  },
  {
    d: "M 120 90 C 260 230, 400 370, 340 510 C 280 650, 190 750, 110 870",
    opacity: 0.7,
    width: 2.6,
    delay: "-5s",
  },
  {
    d: "M 180 110 C 310 250, 450 390, 380 530 C 310 670, 220 770, 140 880",
    opacity: 0.85,
    width: 3,
    delay: "-7s",
  },
  {
    d: "M 240 100 C 360 240, 500 380, 420 520 C 340 660, 250 760, 170 870",
    opacity: 0.55,
    width: 2,
    delay: "-1s",
  },
  {
    d: "M 300 130 C 420 270, 540 410, 470 550 C 400 690, 310 790, 230 860",
    opacity: 0.4,
    width: 1.6,
    delay: "-9s",
  },
  {
    d: "M 20 200 C 140 320, 260 440, 200 580 C 140 720, 80 800, 30 880",
    opacity: 0.3,
    width: 1.2,
    delay: "-4s",
  },
  {
    d: "M 360 80 C 480 200, 580 340, 520 480 C 460 620, 380 720, 300 840",
    opacity: 0.35,
    width: 1.4,
    delay: "-6.5s",
  },
];

const MOBILE_LAYOUT = {
  leftShift: 300,
  rightShift: -300,
  glow: { cx: 500, cy: 460, rx: 360, ry: 340 },
  leftGroupOpacity: 0.78,
  rightGroupOpacity: 0.68,
  strokeScale: 1.35,
  opacityScale: 1.15,
};

const DESKTOP_LAYOUT = {
  leftShift: 0,
  rightShift: 0,
  glow: { cx: 320, cy: 460, rx: 420, ry: 380 },
  leftGroupOpacity: 0.65,
  rightGroupOpacity: 0.55,
  strokeScale: 1,
  opacityScale: 1,
};

function subscribeMediaQuery(query, callback) {
  const mediaQuery = window.matchMedia(query);
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function useMobileLayout() {
  const isMobile = useSyncExternalStore(
    (callback) => subscribeMediaQuery("(max-width: 767px)", callback),
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );

  return isMobile ? MOBILE_LAYOUT : DESKTOP_LAYOUT;
}

function shiftPathHorizontally(d, deltaX) {
  let coordIndex = 0;

  return d.replace(/-?\d+(?:\.\d+)?/g, (num) => {
    const value = parseFloat(num);
    const next =
      coordIndex % 2 === 0 && deltaX !== 0 ? value + deltaX : value;
    coordIndex += 1;
    return Number.isInteger(value) && !num.includes(".")
      ? String(Math.round(next))
      : String(next);
  });
}

function adaptPaths(paths, layout, shiftX) {
  return paths.map((path) => ({
    ...path,
    d: shiftPathHorizontally(path.d, shiftX),
    width: path.width * layout.strokeScale,
    opacity: Math.min(path.opacity * layout.opacityScale, 1),
  }));
}

function WavePath({ path, reverse = false }) {
  return (
    <path
      d={path.d}
      fill="none"
      stroke="url(#heroWaveStroke)"
      strokeWidth={path.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={path.opacity}
      pathLength={1}
      className={reverse ? "hero-wave-path-reverse" : "hero-wave-path"}
      style={{ animationDelay: path.delay }}
    />
  );
}

export default function HeroWaveBackground() {
  const layout = useMobileLayout();
  const leftPaths = adaptPaths(LEFT_WAVE_PATHS, layout, layout.leftShift);
  const rightPaths = adaptPaths(RIGHT_WAVE_PATHS, layout, layout.rightShift);

  return (
    <svg
      className="hero-wave-bg absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="heroWaveStroke"
          x1="0%"
          y1="100%"
          x2="0%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0" />
          <stop offset="18%" stopColor="#34d399" stopOpacity="0.25" />
          <stop offset="45%" stopColor="#10b981" stopOpacity="0.85" />
          <stop offset="62%" stopColor="#6EE7B7" stopOpacity="0.95" />
          <stop offset="78%" stopColor="#34d399" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#064E3B" stopOpacity="0" />
        </linearGradient>

        <radialGradient id="heroAmbientGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.14" />
          <stop offset="55%" stopColor="#059669" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#064E3B" stopOpacity="0" />
        </radialGradient>

        <filter
          id="heroWaveGlow"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="1440" height="900" fill="#121212" />

      <ellipse
        cx={layout.glow.cx}
        cy={layout.glow.cy}
        rx={layout.glow.rx}
        ry={layout.glow.ry}
        fill="url(#heroAmbientGlow)"
        className="hero-ambient-glow"
      />

      <g filter="url(#heroWaveGlow)" opacity={layout.rightGroupOpacity}>
        {rightPaths.map((path, index) => (
          <WavePath key={`right-${index}`} path={path} />
        ))}
      </g>

      <g filter="url(#heroWaveGlow)" opacity={layout.leftGroupOpacity}>
        {leftPaths.map((path, index) => (
          <WavePath key={`left-${index}`} path={path} reverse />
        ))}
      </g>
    </svg>
  );
}

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({ value, size = 96, strokeWidth = 8, className }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  const getColor = (score: number) => {
    if (score >= 80) return "hsl(142.1 76.2% 36.3%)"; // green
    if (score >= 60) return "hsl(42.0290 92.8251% 56.2745%)"; // yellow
    return "hsl(356.3033 90.5579% 54.3137%)"; // red
  };

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg className="progress-ring transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(214.3 31.8% 91.4%)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          className="progress-ring-fill transition-all duration-500 ease-in-out"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(value)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: getColor(value) }}>
          {value}
        </span>
      </div>
    </div>
  );
}

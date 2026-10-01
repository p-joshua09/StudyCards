export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="progress-group">
      <div className="progress-label"><span>{label}</span><strong>{value}%</strong></div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

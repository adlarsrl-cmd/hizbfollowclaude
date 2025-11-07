type Snap = { 
  snapshot_at: string; 
  value_int: number; 
  week_key_tuesday: string;
  cycle_number?: number;
};

export function buildWeeklyDeltaSeries(snaps: Snap[]) {
  const sorted = [...snaps].sort((a, b) => 
    new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime()
  );
  
  const out: { week: string; delta: number }[] = [];
  let prev = 0;
  let prevCycle = 0;
  
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i].value_int;
    const curCycle = sorted[i].cycle_number || 0;
    
    let delta = 0;
    if (i === 0) {
      delta = cur;
    } else if (curCycle > prevCycle) {
      // New khatma detected, delta is current value + remaining from previous cycle
      delta = (60 - prev) + cur;
    } else {
      delta = Math.max(0, cur - prev);
    }
    
    out.push({ 
      week: sorted[i].week_key_tuesday.split('-W')[1] || sorted[i].week_key_tuesday, 
      delta 
    });
    
    prev = cur;
    prevCycle = curCycle;
  }
  
  return out;
}
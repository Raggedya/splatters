// The swept collision accepts the full time between visible frames. Only the
// more expensive wet-paint integration uses its existing bounded step.
export function frameTimes(now,last,launchedAt=last){
 const elapsed=Math.max(0,(now-last)/1000);
 return {elapsed,flight:Math.max(0,(now-Math.max(last,launchedAt))/1000),paint:Math.min(.05,elapsed)};
}

import type { Pod } from '../types/kubernetes';

export const matchesPodName = (pod: Pod, query: string): boolean =>
  pod.name.toLowerCase().includes(query);

// Keep the normal tile budget, but never hide a search match behind overflow.
// Every group stays on the map; matching tiles lead their existing group.
export function selectMapPods(pods: Pod[], query: string, limit: number) {
  if (!query) return { visible: pods.slice(0, limit), matchCount: 0 };
  const matches: Pod[] = [];
  const others: Pod[] = [];
  for (const pod of pods) (matchesPodName(pod, query) ? matches : others).push(pod);
  return {
    visible: [...matches, ...others.slice(0, Math.max(0, limit - matches.length))],
    matchCount: matches.length,
  };
}

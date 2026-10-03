import type { CapacityType } from '../types/kubernetes';

// Only classify explicit Kubernetes labels; absence is not proof of on-demand.
export function resolveCapacityType(labels: Record<string, string> = {}): { capacityType: CapacityType; capacitySource?: string } {
  const candidates: [string, Record<string, CapacityType>][] = [
    ['eks.amazonaws.com/capacityType', { SPOT: 'spot', ON_DEMAND: 'on-demand' }],
    ['karpenter.sh/capacity-type', { spot: 'spot', 'on-demand': 'on-demand' }],
    ['cloud.google.com/gke-spot', { true: 'spot', false: 'on-demand' }],
    ['kubernetes.azure.com/scalesetpriority', { spot: 'spot', regular: 'on-demand' }],
  ];
  for (const [key, values] of candidates) {
    const value = labels[key];
    if (value === undefined) continue;
    return { capacityType: Object.hasOwn(values, value) ? values[value] : 'unknown', capacitySource: `${key}=${value}` };
  }
  return { capacityType: 'unknown' };
}

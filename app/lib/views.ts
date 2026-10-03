import type { ActiveView } from '../types/kubernetes';

export const VIEW_LABELS: Record<ActiveView, string> = {
  computeMap: 'Compute Map', nodeGroups: 'Node Groups', nodes: 'Nodes', pods: 'Pods', helm: 'Helm',
  secrets: 'Secrets', ingresses: 'Ingresses', hpa: 'HPA', deployments: 'Deployments',
};

import type { Node, NodeGroupInfo } from '../types/kubernetes';
import { parseNumericValue } from './format';

// Share the one nodes response across Nodes, Node Groups, and the map.
// Memory keeps the server's existing allocatable-as-capacity denominator.
export function groupNodes(nodes: Node[]): NodeGroupInfo[] {
  const groups = new Map<string, Node[]>();
  for (const node of nodes) {
    const name = node.nodeGroup || 'default';
    const members = groups.get(name) || [];
    members.push(node);
    groups.set(name, members);
  }
  return Array.from(groups, ([name, members]) => {
    const sum = (read: (node: Node) => string) => members.reduce((n, node) => n + parseNumericValue(read(node)), 0);
    const cpu = sum((n) => n.capacity.cpu);
    const memory = sum((n) => n.capacity.memory);
    const usedCpu = sum((n) => n.usage.cpu);
    const usedMemory = sum((n) => n.usage.memory);
    const available = members.every((n) => n.metricsAvailable);
    const gi = (bytes: number) => `${bytes > 0 && bytes < 1024 ** 3 ? (bytes / 1024 ** 3).toFixed(1) : Math.round(bytes / 1024 ** 3)}Gi`;
    return {
      name, nodes: members, totalCpu: String(cpu), totalMemory: gi(memory),
      usedCpu: available ? (usedCpu < 1 ? `${Math.round(usedCpu * 1000)}m` : usedCpu.toFixed(2)) : 'n/a',
      usedMemory: available ? gi(usedMemory) : 'n/a',
      podsCount: members.reduce((n, node) => n + node.pods, 0),
      metricsAvailable: available,
      cpuPercentage: available && cpu > 0 ? Math.min(Math.round(usedCpu / cpu * 100), 100) : null,
      memPercentage: available && memory > 0 ? Math.min(Math.round(usedMemory / memory * 100), 100) : null,
      oldestNodeCreatedAt: members.map((n) => n.createdAt || '').filter(Boolean).sort()[0],
    };
  });
}

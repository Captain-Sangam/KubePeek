export interface Cluster {
  name: string;
  context: string;
  server: string;
}

export interface Node {
  name: string;
  instanceType?: string;
  tags?: Record<string, string>;
  capacity: {
    cpu: string;
    memory: string;
  };
  allocatable: {
    cpu: string;
    memory: string;
  };
  usage: {
    cpu: string;
    memory: string;
  };
  pods: number;
}

export interface Pod {
  name: string;
  namespace: string;
  status: string;
  helmChart?: string;
  helmVersion?: string;
  cpuUsage: string;
  memoryUsage: string;
  nodeName: string;
  creationTimestamp: string;
}

export interface NodeGroupInfo {
  name: string;
  nodes: Node[];
  totalCpu: string;
  totalMemory: string;
  usedCpu: string;
  usedMemory: string;
  podsCount: number;
  cpuPercentage?: number;
  memPercentage?: number;
} 
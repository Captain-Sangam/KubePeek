export interface Cluster {
  name: string;
  context: string;
  server: string;
  displayName?: string;
  isActive?: boolean;
}

// Which resource view the sidebar has selected.
export type ActiveView = 'nodeGroups' | 'nodes' | 'pods' | 'helm' | 'secrets';

// The scope that gates the Pods view. Exactly one type is active at a time.
export type PodsScope =
  | { type: 'namespace'; value: string }
  | { type: 'node'; value: string }
  | { type: 'nodeGroup'; value: string };

export interface Node {
  name: string;
  instanceType?: string;
  tags?: Record<string, string>;
  nodeGroup?: string;
  createdAt?: string; // ISO creationTimestamp
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
  nodeGroup?: string;
  creationTimestamp: string; // relative age string, e.g. "2d" (kept for back-compat)
  createdAt?: string; // ISO timestamp
  restarts?: number;
  cpuRequest?: string; // formatted, e.g. "100m"
  cpuLimit?: string;
  memoryRequest?: string; // formatted, e.g. "256Mi"
  memoryLimit?: string;
  // Usage as a percentage of the applicable denominator (limit -> request ->
  // node allocatable). null when no denominator is available.
  cpuPercent?: number | null;
  memoryPercent?: number | null;
  // Which denominator the percentage is measured against.
  cpuBasis?: ResourceBasis;
  memoryBasis?: ResourceBasis;
}

export type ResourceBasis = 'limit' | 'request' | 'allocatable' | 'none';

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
  oldestNodeCreatedAt?: string;
}

export interface ContainerStateInfo {
  type: 'running' | 'waiting' | 'terminated' | 'unknown';
  reason?: string;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
}

export interface ContainerDetail {
  name: string;
  image: string;
  ready: boolean;
  isInit: boolean;
  restartCount: number;
  state: ContainerStateInfo;
  lastState?: ContainerStateInfo;
  requests: { cpu?: string; memory?: string };
  limits: { cpu?: string; memory?: string };
  usage?: { cpu: string; memory: string };
}

export interface PodDetail {
  name: string;
  namespace: string;
  phase: string;
  qosClass?: string;
  nodeName: string;
  nodeGroup?: string;
  podIP?: string;
  hostIP?: string;
  createdAt: string;
  startTime?: string;
  age: string;
  restartPolicy?: string;
  serviceAccountName?: string;
  restarts: number;
  // Aggregate usage/limits so the drawer can render pod-level bars.
  cpuUsage?: string;
  memoryUsage?: string;
  cpuPercent?: number | null;
  memoryPercent?: number | null;
  cpuBasis?: ResourceBasis;
  memoryBasis?: ResourceBasis;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  ownerReferences: { kind: string; name: string; controller?: boolean }[];
  conditions: {
    type: string;
    status: string;
    reason?: string;
    message?: string;
    lastTransitionTime?: string;
  }[];
  tolerations: {
    key?: string;
    operator?: string;
    value?: string;
    effect?: string;
    tolerationSeconds?: number;
  }[];
  volumes: { name: string; type: string }[];
  containers: ContainerDetail[];
  initContainers: ContainerDetail[];
}

export interface PodEvent {
  type: string;
  reason: string;
  message: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  source: string;
}

export interface SecretSummary {
  name: string;
  namespace: string;
  type: string;
  keys: string[];
  keyCount: number;
  createdAt: string;
  age: string;
}

export interface SecretDetail {
  name: string;
  namespace: string;
  type: string;
  createdAt: string;
  labels?: Record<string, string>;
  data: Record<string, { value: string; encoding: 'utf8' | 'base64' }>;
}

export interface HelmReleaseSummary {
  name: string;
  namespace: string;
  revision: number;
  status: string;
  chart: string;
  chartVersion: string;
  appVersion: string;
  updated: string;
}

export interface HelmReleaseDetail extends HelmReleaseSummary {
  values: Record<string, unknown>;
  userValues: Record<string, unknown>;
  manifest: string;
  notes: string;
  history: {
    revision: number;
    status: string;
    chartVersion: string;
    appVersion: string;
    updated: string;
    description?: string;
  }[];
}

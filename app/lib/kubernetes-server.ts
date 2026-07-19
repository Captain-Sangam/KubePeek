import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import {
  Cluster,
  Node,
  Pod,
  NodeGroupInfo,
  PodDetail,
  ContainerDetail,
  ContainerStateInfo,
  PodEvent,
  SecretSummary,
  SecretDetail,
} from '../types/kubernetes';

// Minimal shape of the options object passed to kc.applyToRequest / fetchWithoutCertValidation.
// Replaces the removed `request` library's `Options` type.
type RequestOpts = {
  url: string;
  method?: string;
  json?: boolean;
  headers?: Record<string, string>;
};

// Helper function to parse CPU values from Kubernetes format
const parseCpuValue = (cpuStr: string): string => {
  if (!cpuStr) return '0';
  
  // Remove any quotes
  cpuStr = cpuStr.replace(/"/g, '');
  
  // Handle nanocores (e.g., "100n")
  if (cpuStr.endsWith('n')) {
    const nanocores = parseInt(cpuStr.slice(0, -1), 10) || 0;
    return (nanocores / 1000000000).toString(); // Convert to cores
  }
  
  // Handle millicores (e.g., "100m")
  if (cpuStr.endsWith('m')) {
    const millicores = parseInt(cpuStr.slice(0, -1), 10) || 0;
    return (millicores / 1000).toString(); // Convert to cores
  }
  
  // Handle microcores (e.g., "100µ")
  if (cpuStr.endsWith('µ')) {
    const microcores = parseInt(cpuStr.slice(0, -1), 10) || 0;
    return (microcores / 1000000).toString(); // Convert to cores
  }
  
  // If it's just a number, assume it's cores
  // First try to parse it as a float
  try {
    const cores = parseFloat(cpuStr);
    if (!isNaN(cores)) {
      return cores.toString();
    }
  } catch (e) {
    // If parsing fails, fallback to regex
    const matches = cpuStr.match(/[\d.]+/);
    if (matches) {
      return matches[0];
    }
  }
  
  return '0';
};

// Helper function to parse memory values from Kubernetes format
const parseMemoryValue = (memStr: string): string => {
  if (!memStr) return '0';
  
  try {
    // Remove any quotes and whitespace
    const originalStr = memStr;
    memStr = memStr.replace(/"/g, '').trim();
    
    // First try direct parse if it's a simple number
    if (/^\d+$/.test(memStr)) {
      return memStr; // Already in bytes
    }
    
    // Handle Ki (kibibytes)
    if (memStr.endsWith('Ki')) {
      const kibibytes = parseInt(memStr.slice(0, -2), 10) || 0;
      const bytes = kibibytes * 1024;
      return bytes.toString(); // Convert to bytes
    }
    
    // Handle Mi (mebibytes)
    if (memStr.endsWith('Mi')) {
      const mebibytes = parseInt(memStr.slice(0, -2), 10) || 0;
      const bytes = mebibytes * 1024 * 1024;
      return bytes.toString(); // Convert to bytes
    }
    
    // Handle Gi (gibibytes)
    if (memStr.endsWith('Gi')) {
      const gibibytes = parseInt(memStr.slice(0, -2), 10) || 0;
      const bytes = gibibytes * 1024 * 1024 * 1024;
      return bytes.toString(); // Convert to bytes
    }
    
    // Handle K, M, G (without i)
    if (memStr.endsWith('K')) {
      const kilobytes = parseInt(memStr.slice(0, -1), 10) || 0;
      const bytes = kilobytes * 1000;
      return bytes.toString();
    }
    
    if (memStr.endsWith('M')) {
      const megabytes = parseInt(memStr.slice(0, -1), 10) || 0;
      const bytes = megabytes * 1000 * 1000;
      return bytes.toString();
    }
    
    if (memStr.endsWith('G')) {
      const gigabytes = parseInt(memStr.slice(0, -1), 10) || 0;
      const bytes = gigabytes * 1000 * 1000 * 1000;
      return bytes.toString();
    }
    
    // Extract numeric part as a fallback
    const matches = memStr.match(/[\d.]+/);
    if (matches) {
      return matches[0];
    }
    
    // If nothing else works, return 0
    return '0';
  } catch (error) {
    console.error(`Error parsing memory value '${memStr}':`, error);
    return '0';
  }
};

// Format CPU for display
const formatCpuForDisplay = (cpuStr: string): string => {
  const cpu = parseFloat(cpuStr);
  if (isNaN(cpu) || cpu === 0) return '0';
  
  if (cpu < 0.001) {
    return `${(cpu * 1000000).toFixed(0)}µ`; // Microcores
  } else if (cpu < 1) {
    return `${(cpu * 1000).toFixed(0)}m`; // Millicores
  } else {
    return cpu % 1 === 0 ? cpu.toFixed(0) : cpu.toFixed(2); // Cores
  }
};

// Format memory for display
const formatMemoryForDisplay = (memStr: string): string => {
  const mem = parseFloat(memStr);
  if (isNaN(mem) || mem === 0) return '0';
  
  const gigabytes = mem / (1024 * 1024 * 1024);
  if (gigabytes >= 1) {
    return `${gigabytes.toFixed(0)}Gi`;
  } else if (mem < 1024) {
    return `${mem.toFixed(0)}B`;
  } else if (mem < 1024 * 1024) {
    return `${(mem / 1024).toFixed(0)}Ki`;
  } else {
    return `${(mem / (1024 * 1024)).toFixed(0)}Mi`;
  }
};

// Format memory for nodegroups (always in Gi)
const formatNodeGroupMemory = (memStr: string): string => {
  const mem = parseFloat(memStr);
  if (isNaN(mem) || mem === 0) return '0Gi';
  
  // Always convert to Gi for nodegroups
  const gigabytes = mem / (1024 * 1024 * 1024);
  
  // If the value is less than 1 Gi but not 0, show it with 1 decimal place
  if (gigabytes < 1 && gigabytes > 0) {
    return `${gigabytes.toFixed(1)}Gi`;
  }
  
  // For larger values, round to the nearest integer
  return `${Math.round(gigabytes)}Gi`;
};

// Resolve a node's node-group name from its labels, covering the common
// managed-Kubernetes conventions. Operates on raw node labels.
const resolveNodeGroupName = (labels: Record<string, string> | undefined): string => {
  if (!labels) return 'default';
  return (
    labels['eks.amazonaws.com/nodegroup'] || // EKS
    labels['kops.k8s.io/instancegroup'] || // kOps
    labels['cloud.google.com/gke-nodepool'] || // GKE
    labels['agentpool'] || // AKS
    'default'
  );
};

// Sum CPU/memory requests and limits across a set of containers.
// Returns cores (CPU) and bytes (memory) as numbers.
const sumPodResources = (
  containers: k8s.V1Container[] | undefined
): { cpuRequest: number; cpuLimit: number; memoryRequest: number; memoryLimit: number } => {
  const totals = { cpuRequest: 0, cpuLimit: 0, memoryRequest: 0, memoryLimit: 0 };
  if (!containers) return totals;
  for (const c of containers) {
    const req = c.resources?.requests;
    const lim = c.resources?.limits;
    if (req?.['cpu']) totals.cpuRequest += parseFloat(parseCpuValue(req['cpu']));
    if (lim?.['cpu']) totals.cpuLimit += parseFloat(parseCpuValue(lim['cpu']));
    if (req?.['memory']) totals.memoryRequest += parseFloat(parseMemoryValue(req['memory']));
    if (lim?.['memory']) totals.memoryLimit += parseFloat(parseMemoryValue(lim['memory']));
  }
  return totals;
};

// Compute a usage percentage against the applicable denominator following the
// limit -> request -> node-allocatable fallback chain. Returns null when no
// denominator is available so callers can render plain text instead of a bar.
const computeUsagePercent = (
  usage: number,
  limit: number,
  request: number,
  allocatable: number
): { percent: number; basis: 'limit' | 'request' | 'allocatable' | 'none' } => {
  const denom = limit > 0 ? limit : request > 0 ? request : allocatable > 0 ? allocatable : 0;
  const basis =
    limit > 0 ? 'limit' : request > 0 ? 'request' : allocatable > 0 ? 'allocatable' : 'none';
  if (denom <= 0) return { percent: 0, basis: 'none' };
  return { percent: Math.min(Math.round((usage / denom) * 100), 100), basis };
};

// Get the kubeconfig file path
const getKubeconfigPath = (): string => {
  const kubeconfigEnv = process.env.KUBECONFIG;
  const homeDir = os.homedir();
  console.log(`[KubeConfig Debug] KUBECONFIG env: ${kubeconfigEnv}`);
  console.log(`[KubeConfig Debug] Home directory: ${homeDir}`);
  console.log(`[KubeConfig Debug] Current working directory: ${process.cwd()}`);

  // Check if KUBECONFIG environment variable is set
  if (kubeconfigEnv) {
    console.log(`[KubeConfig Debug] Using KUBECONFIG env var: ${kubeconfigEnv}`);
    return kubeconfigEnv;
  }

  // Check for common kubeconfig locations
  const possiblePaths = [
    path.join(homeDir, '.kube', 'config'),      // Standard path
    '/root/.kube/config',                        // Docker container path
    '/tmp/.kube/config',                         // Alternative container path
    path.join(process.cwd(), '.kube', 'config')  // Relative to CWD
  ];

  // Find first existing path
  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      console.log(`[KubeConfig Debug] Found kubeconfig at: ${configPath}`);
      return configPath;
    }
  }

  // Default fallback
  const defaultPath = path.join(homeDir, '.kube', 'config');
  console.log(`[KubeConfig Debug] Using default path: ${defaultPath}`);
  return defaultPath;
};

// Load kubeconfig
export const loadKubeConfig = (): k8s.KubeConfig => {
  const kc = new k8s.KubeConfig();
  const kubeconfigPath = getKubeconfigPath();
  console.log(`[KubeConfig Debug] Attempting to load config from: ${kubeconfigPath}`);
  console.log(`[KubeConfig Debug] Relevant Env Vars: KUBECONFIG=${process.env.KUBECONFIG}, HOME=${process.env.HOME}, USER=${process.env.USER}, AWS_PROFILE=${process.env.AWS_PROFILE}, AWS_REGION=${process.env.AWS_REGION}`);

  try {
    const exists = fs.existsSync(kubeconfigPath);
    console.log(`[KubeConfig Debug] Does kubeconfig file exist at '${kubeconfigPath}'? ${exists}`);

    if (exists) {
      try {
        console.log(`[KubeConfig Debug] Loading config using kc.loadFromFile('${kubeconfigPath}')...`);
        const fileContents = fs.readFileSync(kubeconfigPath, 'utf8');
        console.log(`[KubeConfig Debug] Read ${fileContents.length} bytes from config file`);
        
        kc.loadFromFile(kubeconfigPath);
        
        console.log(`[KubeConfig Debug] Successfully loaded config from file.`);
        console.log(`[KubeConfig Debug] Current context: ${kc.getCurrentContext()}`);
        console.log(`[KubeConfig Debug] Available contexts: ${kc.getContexts().map(c => c.name).join(', ')}`);
        
        // If we have no contexts, try loadFromDefault as fallback
        if (kc.getContexts().length === 0) {
          console.log(`[KubeConfig Debug] No contexts found in file, trying loadFromDefault as fallback`);
          kc.loadFromDefault();
        }
      } catch (loadError: any) {
        console.error(`[KubeConfig Debug] Error during kc.loadFromFile('${kubeconfigPath}'):`, loadError);
        console.error(`[KubeConfig Debug] Error details: Name=${loadError.name}, Message=${loadError.message}, Stack=${loadError.stack}`);
        // Fallback to default to see if that works (it likely won't, but preserves original logic)
        console.log('[KubeConfig Debug] Falling back to kc.loadFromDefault() due to loadFromFile error...');
        kc.loadFromDefault();
      }
    } else {
      console.log(`[KubeConfig Debug] Kubeconfig file not found at '${kubeconfigPath}', trying kc.loadFromDefault()...`);
      kc.loadFromDefault();
      console.log('[KubeConfig Debug] Loaded default config.');
    }
  } catch (error: any) {
    // Catch errors from existsSync or loadFromDefault
    console.error(`[KubeConfig Debug] General error loading kubeconfig (path: ${kubeconfigPath}):`, error);
    console.error(`[KubeConfig Debug] General error details: Name=${error.name}, Message=${error.message}, Stack=${error.stack}`);
    // Attempt default loading as a last resort if not already tried
    if (!fs.existsSync(kubeconfigPath)) {
       console.log('[KubeConfig Debug] Retrying kc.loadFromDefault() after general error...');
       kc.loadFromDefault();
    }
  }
  return kc;
};

// Get available clusters
export const getClusters = (): Cluster[] => {
  const kc = loadKubeConfig();
  
  return kc.getContexts().map(context => {
    const cluster = kc.getCluster(context.cluster);
    return {
      name: context.name,
      context: context.cluster,
      server: cluster?.server || 'Unknown',
      displayName: '' // Client will populate this from localStorage
    };
  });
};

// Rest of server-side Kubernetes API functions...
// Function signatures should match the original file
// to ensure compatibility

// Get a cluster by name
export const getClusterByName = (name: string): Cluster | null => {
  const clusters = getClusters();
  return clusters.find(cluster => cluster.name === name) || null;
};

// Use Node.js native https module to make requests without certificate validation
const fetchWithoutCertValidation = async (urlString: string, options: any = {}): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Parse the URL
    const parsedUrl = new URL(urlString);
    
    // Determine if we need http or https
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;
    
    // Setup request options
    const requestOptions: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: false, // This is the key setting to ignore certificate validation
    };
    
    // Add any authorization headers from the original options
    if (options.headers) {
      requestOptions.headers = { ...requestOptions.headers, ...options.headers };
    }
    
    // Make the request
    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      
      // Collect response data
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // Resolve with response object when done
      res.on('end', () => {
        resolve({
          ok: res.statusCode && res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          json: async () => JSON.parse(data),
          text: async () => data
        });
      });
    });
    
    // Handle request errors
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    // Send the request
    req.end();
  });
}; 

// Get a client for a specific cluster
export const getClientForCluster = (clusterName: string): {
  coreClient: k8s.CoreV1Api;
  metricsClient: any;
  appsClient: k8s.AppsV1Api;
} => {
  const kc = loadKubeConfig();
  const availableContexts = kc.getContexts().map(c => c.name);
  const currentContextFromLoad = kc.getCurrentContext(); // Context name loaded from file/env

  console.log(`[GetClient Debug] Requested clusterName: "${clusterName}"`);
  console.log(`[GetClient Debug] Context loaded by default: "${currentContextFromLoad}"`);
  console.log(`[GetClient Debug] Available contexts: ${JSON.stringify(availableContexts)}`);

  // Check if the requested clusterName is a valid context
  if (availableContexts.includes(clusterName)) {
    // If the requested name is valid, try to set it
    try {
      console.log(`[GetClient Debug] Setting current context to requested name: "${clusterName}"`);
      kc.setCurrentContext(clusterName);
    } catch (error) {
      // Log error but proceed, relying on the originally loaded context
      console.error(`[GetClient Debug] Failed to set context to "${clusterName}", proceeding with default "${currentContextFromLoad}":`, error);
      // Explicitly set back to the originally loaded context just in case setCurrentContext cleared it
      kc.setCurrentContext(currentContextFromLoad);
    }
  } else {
    // If the requested name is NOT valid, log a warning and use the default context
    console.warn(`[GetClient Debug] Requested clusterName "${clusterName}" not found in available contexts. Using default context: "${currentContextFromLoad}"`);
    // Ensure the originally loaded context is set (it should be already, but this is safe)
    kc.setCurrentContext(currentContextFromLoad);
  }

  console.log(`[GetClient Debug] Final context being used for API clients: "${kc.getCurrentContext()}"`);

  // Create the API clients
  const coreClient = kc.makeApiClient(k8s.CoreV1Api);
  let metricsClient;
  
  try {
    // Try to create the metrics client using direct API path
    // Don't use the MetricsV1beta1Api class as it might not be available in all versions
    const cluster = kc.getCurrentCluster();
    const user = kc.getCurrentUser();
    
    if (!cluster || !user) {
      throw new Error('No current cluster or user found');
    }
    
    // Shared metrics fetch: builds the auth options, applies the kubeconfig
    // credentials (awaited — exec-auth tokens are resolved asynchronously), and
    // fetches over the cert-tolerant transport. Returns parsed JSON.
    const metricsGet = async (apiPath: string): Promise<any> => {
      const targetUrl = `${cluster.server}${apiPath}`;
      const opts: RequestOpts = { url: targetUrl, method: 'GET', json: true };
      await kc.applyToRequest(opts as any);

      console.log(`Fetching metrics from ${targetUrl}`);
      const response = await fetchWithoutCertValidation(targetUrl, opts);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText} (${response.status})`);
      }
      return response.json();
    };

    // Create a simple metrics client with the required methods
    metricsClient = {
      getNodeMetrics: async () => {
        try {
          const data = await metricsGet('/apis/metrics.k8s.io/v1beta1/nodes');
          return { body: data };
        } catch (err) {
          console.error('Error fetching node metrics directly:', err);
          return { body: { items: [] } };
        }
      },

      getPodMetrics: async () => {
        try {
          const data = await metricsGet('/apis/metrics.k8s.io/v1beta1/pods');
          return { body: data };
        } catch (err) {
          console.error('Error fetching pod metrics directly:', err);
          return { body: { items: [] } };
        }
      },

      getPodMetricsForNamespace: async (namespace: string) => {
        try {
          const data = await metricsGet(
            `/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods`
          );
          return { body: data };
        } catch (err) {
          console.error(`Error fetching pod metrics for namespace ${namespace}:`, err);
          return { body: { items: [] } };
        }
      },

      getPodMetricsForPod: async (namespace: string, podName: string) => {
        try {
          const data = await metricsGet(
            `/apis/metrics.k8s.io/v1beta1/namespaces/${namespace}/pods/${podName}`
          );
          return { body: data };
        } catch (err) {
          console.error(`Error fetching metrics for pod ${namespace}/${podName}:`, err);
          return { body: null };
        }
      }
    };
  } catch (error) {
    console.error('Error creating metrics client:', error);
    // Create a dummy metrics client with methods that return empty data
    metricsClient = {
      getNodeMetrics: async () => ({ body: { items: [] } }),
      getPodMetrics: async () => ({ body: { items: [] } }),
      getPodMetricsForNamespace: async () => ({ body: { items: [] } }),
      getPodMetricsForPod: async () => ({ body: null })
    };
  }
  
  const appsClient = kc.makeApiClient(k8s.AppsV1Api);
  
  return { coreClient, metricsClient, appsClient };
};

// Get nodes for a cluster
export const getNodes = async (clusterName: string): Promise<Node[]> => {
  try {
    console.log(`Getting clients for cluster: ${clusterName}`);
    const { coreClient, metricsClient } = getClientForCluster(clusterName);
    
    // Get nodes
    console.log('Fetching nodes...');
    const nodesResponse = await coreClient.listNode();
    const nodes = nodesResponse.body.items;
    console.log(`Successfully fetched ${nodes.length} nodes`);
    
    // Get metrics for nodes
    console.log('Fetching node metrics...');
    let nodeMetrics: { items: Array<{ metadata?: { name?: string }, usage?: { cpu?: string, memory?: string } }> } = { items: [] };
    try {
      const metricsResponse = await metricsClient.getNodeMetrics();
      nodeMetrics = metricsResponse.body;
      console.log(`Successfully fetched metrics for ${nodeMetrics.items.length} nodes`);
    } catch (metricsError) {
      console.error('Error fetching node metrics:', metricsError);
      console.log('Continuing without metrics data');
    }
    
    // Get pods for each node
    console.log('Fetching pods...');
    let pods: Array<{ metadata?: { name?: string, namespace?: string }, spec?: { nodeName?: string } }> = [];
    try {
      const podsResponse = await coreClient.listPodForAllNamespaces();
      pods = podsResponse.body.items;
      console.log(`Successfully fetched ${pods.length} pods`);
    } catch (podsError) {
      console.error('Error fetching pods:', podsError);
      console.log('Continuing without pods data');
    }
    
    return nodes.map(node => {
      try {
        // Find metrics for this node
        const metrics = nodeMetrics.items.find(m => m.metadata?.name === node.metadata?.name);
        
        // Count pods on this node
        const nodePods = pods.filter(pod => pod.spec?.nodeName === node.metadata?.name);
        
        // Parse CPU and memory capacity
        const cpuCapacity = node.status?.capacity?.['cpu'] || '0';
        const memoryCapacity = node.status?.capacity?.['memory'] || '0';
        
        // Parse CPU and memory allocatable
        const cpuAllocatable = node.status?.allocatable?.['cpu'] || '0';
        const memoryAllocatable = node.status?.allocatable?.['memory'] || '0';
        
        // Get CPU and memory usage from metrics
        let cpuUsage = metrics?.usage?.cpu || '0';
        let memoryUsage = metrics?.usage?.memory || '0';
        
        // Parse CPU and memory values to get normalized numeric values
        const parsedCpuCapacity = parseCpuValue(cpuCapacity);
        const parsedCpuUsage = parseCpuValue(cpuUsage);
        const parsedMemCapacity = parseMemoryValue(memoryAllocatable); // Use allocatable instead of capacity
        const parsedMemUsage = parseMemoryValue(memoryUsage);
        
        // Ensure usage doesn't exceed capacity
        const validatedCpuUsage = Math.min(parseFloat(parsedCpuUsage), parseFloat(parsedCpuCapacity)).toString();
        const validatedMemUsage = Math.min(parseFloat(parsedMemUsage), parseFloat(parsedMemCapacity)).toString();
        
        // Parse instance type from labels
        const instanceType = node.metadata?.labels?.['node.kubernetes.io/instance-type'] ||
                          node.metadata?.labels?.['beta.kubernetes.io/instance-type'] || 'unknown';
        
        // Get all labels as tags
        const tags: Record<string, string> = {};
        if (node.metadata?.labels) {
          Object.entries(node.metadata.labels).forEach(([key, value]) => {
            // Filter out some common labels that are not interesting
            if (!key.startsWith('kubernetes.io/') && 
                !key.startsWith('k8s.io/') &&
                !key.includes('instance-type')) {
              tags[key] = value;
            }
          });
        }
        
        return {
          name: node.metadata?.name || 'unknown',
          instanceType,
          tags,
          nodeGroup: resolveNodeGroupName(node.metadata?.labels),
          createdAt: node.metadata?.creationTimestamp
            ? new Date(node.metadata.creationTimestamp).toISOString()
            : '',
          capacity: {
            cpu: formatCpuForDisplay(parsedCpuCapacity),
            memory: formatMemoryForDisplay(parsedMemCapacity)
          },
          allocatable: {
            cpu: formatCpuForDisplay(cpuAllocatable),
            memory: formatMemoryForDisplay(memoryAllocatable)
          },
          usage: {
            cpu: formatCpuForDisplay(validatedCpuUsage),
            memory: formatMemoryForDisplay(validatedMemUsage)
          },
          pods: nodePods.length
        };
      } catch (nodeError) {
        console.error(`Error processing node ${node.metadata?.name}:`, nodeError);
        // Return a minimal node object in case of error
        return {
          name: node.metadata?.name || 'unknown',
          instanceType: 'unknown',
          tags: {},
          nodeGroup: resolveNodeGroupName(node.metadata?.labels),
          createdAt: node.metadata?.creationTimestamp
            ? new Date(node.metadata.creationTimestamp).toISOString()
            : '',
          capacity: { cpu: '0', memory: '0' },
          allocatable: { cpu: '0', memory: '0' },
          usage: { cpu: '0', memory: '0' },
          pods: 0
        };
      }
    });
    
  } catch (error) {
    console.error('Error getting nodes:', error);
    throw error;
  }
};

// Group nodes by label
export const getNodeGroups = async (clusterName: string): Promise<NodeGroupInfo[]> => {
  try {
    console.log("=== START NODE GROUP CALCULATION ===");
    const nodes = await getNodes(clusterName);
    console.log(`Retrieved ${nodes.length} nodes for nodegroup calculation`);
    
    // Create a map of node groups
    const nodeGroups = new Map<string, NodeGroupInfo>();
    
    nodes.forEach(node => {
      // Node group is already resolved per-node in getNodes().
      const nodeGroupName = node.nodeGroup || 'default';

      // Get or create node group
      let nodeGroup = nodeGroups.get(nodeGroupName);
      if (!nodeGroup) {
        nodeGroup = {
          name: nodeGroupName,
          nodes: [],
          totalCpu: '0',
          totalMemory: '0',
          usedCpu: '0',
          usedMemory: '0',
          podsCount: 0,
          cpuPercentage: 0,
          memPercentage: 0
        };
        nodeGroups.set(nodeGroupName, nodeGroup);
      }

      // Add node to group
      nodeGroup.nodes.push(node);

      // Track the oldest node in the group (earliest creation timestamp).
      if (node.createdAt) {
        if (!nodeGroup.oldestNodeCreatedAt || node.createdAt < nodeGroup.oldestNodeCreatedAt) {
          nodeGroup.oldestNodeCreatedAt = node.createdAt;
        }
      }
      
      try {
        // Get CPU capacity and usage from node data
        const cpuCapacity = parseFloat(parseCpuValue(node.capacity.cpu));
        const cpuUsage = parseFloat(parseCpuValue(node.usage.cpu));
        const validatedCpuUsage = Math.min(cpuUsage, cpuCapacity);
        
        // Get memory values directly from the node's allocatable & capacity field
        const memCapacityBytes = parseFloat(parseMemoryValue(node.capacity.memory));
        
        // Get memory usage
        const memUsageBytes = parseFloat(parseMemoryValue(node.usage.memory));
        const validatedMemUsage = Math.min(memUsageBytes, memCapacityBytes);
        
        // Add values to node group totals
        nodeGroup.totalCpu = (parseFloat(nodeGroup.totalCpu) + cpuCapacity).toString();
        nodeGroup.usedCpu = (parseFloat(nodeGroup.usedCpu) + validatedCpuUsage).toString();
        nodeGroup.totalMemory = (parseFloat(nodeGroup.totalMemory) + memCapacityBytes).toString();
        nodeGroup.usedMemory = (parseFloat(nodeGroup.usedMemory) + validatedMemUsage).toString();
        
      } catch (error) {
        console.error(`Error calculating node metrics for ${node.name}:`, error);
      }
      
      nodeGroup.podsCount += node.pods;
    });
    
    // Convert map to array and format values
    const formattedNodeGroups = Array.from(nodeGroups.values()).map(nodeGroup => {
      try {
        // Get raw values for calculations
        const totalCpu = parseFloat(nodeGroup.totalCpu);
        const usedCpu = parseFloat(nodeGroup.usedCpu);
        const totalMemory = parseFloat(nodeGroup.totalMemory);
        const usedMemory = parseFloat(nodeGroup.usedMemory);
        
        // Calculate percentages
        const cpuPercentage = totalCpu > 0 ? Math.min(Math.round((usedCpu / totalCpu) * 100), 100) : 0;
        const memPercentage = totalMemory > 0 ? Math.min(Math.round((usedMemory / totalMemory) * 100), 100) : 0;
        
        // Format values for display
        const formattedTotalCpu = formatCpuForDisplay(nodeGroup.totalCpu);
        const formattedUsedCpu = formatCpuForDisplay(nodeGroup.usedCpu);
        
        // Convert memory to Gi directly for display
        const totalMemoryGi = totalMemory / (1024 * 1024 * 1024);
        // Ensure we don't show partial gigabytes for node groups
        const totalMemoryDisplay = `${Math.round(totalMemoryGi)}Gi`;
        
        // Return the formatted node group data
        return {
          ...nodeGroup,
          totalCpu: formattedTotalCpu,
          usedCpu: formattedUsedCpu,
          totalMemory: totalMemoryDisplay,
          usedMemory: formatNodeGroupMemory(nodeGroup.usedMemory),
          cpuPercentage: cpuPercentage,
          memPercentage: memPercentage
        };
      } catch (error) {
        console.error(`Error formatting nodeGroup ${nodeGroup.name}:`, error);
        
        // Fallback to defaults if formatting fails
        const totalMemory = parseFloat(nodeGroup.totalMemory);
        const totalMemoryGi = Math.max(1, Math.round(totalMemory / (1024 * 1024 * 1024)));
        
        return {
          ...nodeGroup,
          totalCpu: formatCpuForDisplay(nodeGroup.totalCpu),
          usedCpu: formatCpuForDisplay(nodeGroup.usedCpu),
          totalMemory: `${totalMemoryGi}Gi`,
          usedMemory: formatNodeGroupMemory(nodeGroup.usedMemory),
          cpuPercentage: 0,
          memPercentage: 0
        };
      }
    });
    
    return formattedNodeGroups;
  } catch (error) {
    console.error('Error getting node groups:', error);
    throw error;
  }
};

// Get pods for a cluster, optionally scoped to a namespace, a single node, or
// a node group. Exactly one scope key is expected; an empty scope lists all
// pods (kept for back-compat). fieldSelector supports only ANDed equality, so
// node-group scope fans out one call per member node.
export interface PodScope {
  namespace?: string;
  nodeName?: string;
  nodeGroup?: string;
}

export const getPods = async (
  clusterName: string,
  scope: PodScope = {}
): Promise<Pod[]> => {
  try {
    console.log(`Getting clients for cluster: ${clusterName}`, scope);
    const { coreClient, metricsClient } = getClientForCluster(clusterName);

    // Nodes are needed for node-group enrichment (and the fallback usage
    // denominator) in every scope; the list is small.
    const nodesResponse = await coreClient.listNode();

    // Resolve which pods to fetch based on scope.
    let pods: k8s.V1Pod[];
    if (scope.namespace) {
      const resp = await coreClient.listNamespacedPod(scope.namespace);
      pods = resp.body.items;
    } else if (scope.nodeName) {
      const resp = await coreClient.listPodForAllNamespaces(
        undefined, // allowWatchBookmarks
        undefined, // _continue
        `spec.nodeName=${scope.nodeName}`
      );
      pods = resp.body.items;
    } else if (scope.nodeGroup) {
      const memberNodes = nodesResponse.body.items
        .filter(n => resolveNodeGroupName(n.metadata?.labels) === scope.nodeGroup)
        .map(n => n.metadata?.name)
        .filter((n): n is string => Boolean(n));
      if (memberNodes.length === 0) {
        pods = [];
      } else {
        const responses = await Promise.all(
          memberNodes.map(nodeName =>
            coreClient.listPodForAllNamespaces(undefined, undefined, `spec.nodeName=${nodeName}`)
          )
        );
        pods = responses.flatMap(r => r.body.items);
      }
    } else {
      const resp = await coreClient.listPodForAllNamespaces();
      pods = resp.body.items;
    }

    // Metrics: namespace scope can use the namespaced endpoint; node/nodeGroup
    // scopes fall back to cluster-wide metrics (the metrics API has no node
    // filter) and rely on the name+namespace match below to discard extras.
    const metricsResponse = scope.namespace
      ? await metricsClient.getPodMetricsForNamespace(scope.namespace)
      : await metricsClient.getPodMetrics();

    console.log(`Successfully fetched ${pods.length} pods`);

    // Build a lookup of node -> { nodeGroup, allocatable } so each pod can
    // resolve its node group and a fallback usage denominator.
    const nodeInfoByName = new Map<
      string,
      { nodeGroup: string; cpuAllocatable: number; memAllocatable: number }
    >();
    for (const node of nodesResponse.body.items) {
      const name = node.metadata?.name;
      if (!name) continue;
      nodeInfoByName.set(name, {
        nodeGroup: resolveNodeGroupName(node.metadata?.labels),
        cpuAllocatable: parseFloat(parseCpuValue(node.status?.allocatable?.['cpu'] || '0')),
        memAllocatable: parseFloat(parseMemoryValue(node.status?.allocatable?.['memory'] || '0'))
      });
    }

    const podMetrics: {
      items?: Array<{
        metadata?: { name?: string; namespace?: string };
        containers?: Array<{ usage?: { cpu?: string; memory?: string } }>;
      }>;
    } = metricsResponse.body || { items: [] };
    console.log(`Successfully fetched metrics for ${podMetrics.items?.length || 0} pods`);

    const podItems = podMetrics.items || [];
    
    return pods.map(pod => {
      try {
        // Find metrics for this pod
        const metrics = podItems.find(
          m => m.metadata?.name === pod.metadata?.name && 
               m.metadata?.namespace === pod.metadata?.namespace
        );
        
        // Compute total CPU and memory usage from all containers
        let totalCpuUsage = 0;
        let totalMemoryUsage = 0;
        
        if (metrics?.containers) {
          metrics.containers.forEach(container => {
            try {
              // Parse CPU usage
              const cpuUsageStr = container.usage?.cpu || '0';
              const cpuValue = parseFloat(parseCpuValue(cpuUsageStr));
              totalCpuUsage += cpuValue;
              
              // Parse memory usage
              const memoryUsageStr = container.usage?.memory || '0';
              const memoryValue = parseFloat(parseMemoryValue(memoryUsageStr));
              totalMemoryUsage += memoryValue;
            } catch (parseError) {
              console.error(`Error parsing container metrics for ${pod.metadata?.name}:`, parseError);
            }
          });
        }
        
        // Format CPU and memory usage for display
        const cpuUsageFormatted = formatCpuForDisplay(totalCpuUsage.toString());
        const memoryUsageFormatted = formatMemoryForDisplay(totalMemoryUsage.toString());

        // Restart count: sum across all container statuses.
        const restarts = (pod.status?.containerStatuses || []).reduce(
          (sum, cs) => sum + (cs.restartCount || 0),
          0
        );

        // Aggregate requests/limits across containers.
        const res = sumPodResources(pod.spec?.containers);

        // Resolve node group + allocatable fallback from the pod's node.
        const nodeInfo = pod.spec?.nodeName
          ? nodeInfoByName.get(pod.spec.nodeName)
          : undefined;

        const cpuUsagePct = computeUsagePercent(
          totalCpuUsage,
          res.cpuLimit,
          res.cpuRequest,
          nodeInfo?.cpuAllocatable || 0
        );
        const memUsagePct = computeUsagePercent(
          totalMemoryUsage,
          res.memoryLimit,
          res.memoryRequest,
          nodeInfo?.memAllocatable || 0
        );

        // Extract Helm information from labels
        const labels = pod.metadata?.labels || {};
        const helmChart = labels['app.kubernetes.io/name'] || 
                        (labels['helm.sh/chart'] ? labels['helm.sh/chart'].split('-')[0] : undefined);
                        
        const helmVersion = labels['app.kubernetes.io/version'] ||
                        (labels['helm.sh/chart'] ? labels['helm.sh/chart'].split('-')[1] : undefined);
        
        // Get creation timestamp
        const creationTime = pod.metadata?.creationTimestamp
          ? new Date(pod.metadata.creationTimestamp).toISOString()
          : '';
        
        // Format creation time as relative time (e.g., "2d", "5h")
        let age = 'unknown';
        try {
          if (creationTime) {
            const now = new Date();
            const creationDate = new Date(creationTime);
            const diffMs = now.getTime() - creationDate.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            if (diffDays > 0) {
              age = `${diffDays}d`;
            } else if (diffHours > 0) {
              age = `${diffHours}h`;
            } else {
              age = 'new';
            }
          }
        } catch (timeError) {
          console.error(`Error calculating age for ${pod.metadata?.name}:`, timeError);
        }
        
        return {
          name: pod.metadata?.name || 'unknown',
          namespace: pod.metadata?.namespace || 'default',
          status: pod.status?.phase || 'Unknown',
          helmChart,
          helmVersion,
          cpuUsage: cpuUsageFormatted,
          memoryUsage: memoryUsageFormatted,
          nodeName: pod.spec?.nodeName || 'unknown',
          nodeGroup: nodeInfo?.nodeGroup || 'unknown',
          creationTimestamp: age,
          createdAt: creationTime,
          restarts,
          cpuRequest: res.cpuRequest > 0 ? formatCpuForDisplay(res.cpuRequest.toString()) : undefined,
          cpuLimit: res.cpuLimit > 0 ? formatCpuForDisplay(res.cpuLimit.toString()) : undefined,
          memoryRequest:
            res.memoryRequest > 0 ? formatMemoryForDisplay(res.memoryRequest.toString()) : undefined,
          memoryLimit:
            res.memoryLimit > 0 ? formatMemoryForDisplay(res.memoryLimit.toString()) : undefined,
          cpuPercent: cpuUsagePct.basis === 'none' ? null : cpuUsagePct.percent,
          memoryPercent: memUsagePct.basis === 'none' ? null : memUsagePct.percent,
          cpuBasis: cpuUsagePct.basis,
          memoryBasis: memUsagePct.basis
        };
      } catch (podError) {
        console.error(`Error processing pod ${pod.metadata?.name}:`, podError);
        // Return a minimal pod object in case of error
        return {
          name: pod.metadata?.name || 'unknown',
          namespace: pod.metadata?.namespace || 'default',
          status: pod.status?.phase || 'Unknown',
          cpuUsage: '0m',
          memoryUsage: '0Mi',
          nodeName: pod.spec?.nodeName || 'unknown',
          nodeGroup: 'unknown',
          creationTimestamp: 'unknown',
          restarts: 0,
          cpuPercent: null,
          memoryPercent: null
        };
      }
    });
    
  } catch (error) {
    console.error('Error getting pods:', error);
    throw error;
  }
};

// Delete a pod
export const deletePod = async (clusterName: string, namespace: string, podName: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { coreClient } = getClientForCluster(clusterName);
    await coreClient.deleteNamespacedPod(podName, namespace);
    return { success: true, message: `Pod ${namespace}/${podName} deleted successfully` };
  } catch (error) {
    console.error(`Error deleting pod ${namespace}/${podName}:`, error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred while deleting pod'
    };
  }
};

// Delete a secret
export const deleteSecret = async (clusterName: string, namespace: string, name: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { coreClient } = getClientForCluster(clusterName);
    await coreClient.deleteNamespacedSecret(name, namespace);
    return { success: true, message: `Secret ${namespace}/${name} deleted successfully` };
  } catch (error) {
    console.error(`Error deleting secret ${namespace}/${name}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred while deleting secret'
    };
  }
};

// Get pod logs
export const getPodLogs = async (
  clusterName: string,
  namespace: string,
  podName: string,
  containerName?: string,
  tailLines?: number,
  timestamps: boolean = true,
  previous: boolean = false
): Promise<{ success: boolean; logs?: string; message?: string }> => {
  console.log(`kubernetes-server: Getting logs for pod ${namespace}/${podName} in cluster ${clusterName}`,
    { containerName, tailLines, timestamps, previous });
  
  try {
    if (!clusterName || !namespace || !podName) {
      console.error('Missing required parameters:', { clusterName, namespace, podName });
      return { 
        success: false, 
        message: `Missing required parameters: ${!clusterName ? 'cluster' : ''} ${!namespace ? 'namespace' : ''} ${!podName ? 'podName' : ''}`.trim()
      };
    }
    
    const { coreClient } = getClientForCluster(clusterName);
    
    // If container name is not provided, get all container logs
    if (!containerName) {
      // First get the pod to find all containers
      console.log(`kubernetes-server: Fetching pod ${namespace}/${podName} to get container names`);
      let pod;
      try {
        const response = await coreClient.readNamespacedPod(podName, namespace);
        pod = response.body;
      } catch (podError) {
        console.error(`Error fetching pod ${namespace}/${podName}:`, podError);
        
        if (podError && typeof podError === 'object' && 'response' in podError && 
            podError.response && typeof podError.response === 'object' && 
            'statusCode' in podError.response && podError.response.statusCode === 404) {
          return { 
            success: false, 
            message: `Pod ${namespace}/${podName} not found` 
          };
        }
        throw podError;
      }
      
      const containerNames = pod.spec?.containers.map(c => c.name) || [];
      console.log(`kubernetes-server: Found ${containerNames.length} containers in pod ${namespace}/${podName}`);
      
      if (containerNames.length === 0) {
        return { success: true, logs: 'No containers found in pod' };
      }
      
      // Get logs for each container
      let allLogs = '';
      for (const container of containerNames) {
        try {
          console.log(`kubernetes-server: Fetching logs for container ${container}`);
          const { body } = await coreClient.readNamespacedPodLog(
            podName,
            namespace,
            container,
            undefined, // follow
            undefined, // insecureSkipTLSVerifyBackend
            undefined, // limitBytes
            undefined, // pretty
            previous, // previous
            undefined, // sinceSeconds
            tailLines, // tailLines
            timestamps // timestamps
          );
          allLogs += `\n--- Container: ${container} ---\n${body}\n`;
        } catch (containerError) {
          console.error(`Error fetching logs for container ${container}:`, containerError);
          allLogs += `\n--- Container: ${container} ---\nError fetching logs: ${
            containerError instanceof Error ? containerError.message : 'Unknown error'
          }\n`;
        }
      }
      return { success: true, logs: allLogs };
    }
    
    // Get logs for a specific container
    console.log(`kubernetes-server: Fetching logs for specific container ${containerName}`);
    const { body } = await coreClient.readNamespacedPodLog(
      podName,
      namespace,
      containerName,
      undefined, // follow
      undefined, // insecureSkipTLSVerifyBackend
      undefined, // limitBytes
      undefined, // pretty
      previous, // previous
      undefined, // sinceSeconds
      tailLines, // tailLines
      timestamps // timestamps
    );

    return { success: true, logs: body };
  } catch (error) {
    console.error(`Error getting logs for pod ${namespace}/${podName}:`, error);
    let errorMessage = 'Unknown error occurred while fetching logs';
    
    // Handle specific kubernetes client errors
    if (error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 
        'statusCode' in error.response) {
      const statusCode = error.response.statusCode;
      
      if (statusCode === 404) {
        errorMessage = `Pod ${namespace}/${podName} not found`;
      } else if (statusCode === 403) {
        errorMessage = `Access denied for pod logs ${namespace}/${podName}`;
      } else {
        errorMessage = `Kubernetes API error (${statusCode}): ${
          'body' in error.response && error.response.body && 
          typeof error.response.body === 'object' && 
          'message' in error.response.body 
            ? error.response.body.message 
            : 'Unknown error'
        }`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      message: errorMessage
    };
  }
};

// Map a V1ContainerState to our normalized ContainerStateInfo.
const mapContainerState = (state: k8s.V1ContainerState | undefined): ContainerStateInfo => {
  if (!state) return { type: 'unknown' };
  if (state.running) {
    return {
      type: 'running',
      startedAt: state.running.startedAt
        ? new Date(state.running.startedAt).toISOString()
        : undefined
    };
  }
  if (state.waiting) {
    return { type: 'waiting', reason: state.waiting.reason, message: state.waiting.message };
  }
  if (state.terminated) {
    return {
      type: 'terminated',
      reason: state.terminated.reason,
      message: state.terminated.message,
      exitCode: state.terminated.exitCode,
      startedAt: state.terminated.startedAt
        ? new Date(state.terminated.startedAt).toISOString()
        : undefined,
      finishedAt: state.terminated.finishedAt
        ? new Date(state.terminated.finishedAt).toISOString()
        : undefined
    };
  }
  return { type: 'unknown' };
};

// Build a ContainerDetail from a container spec + its status + live usage.
const buildContainerDetail = (
  spec: k8s.V1Container,
  status: k8s.V1ContainerStatus | undefined,
  isInit: boolean,
  usage: { cpu?: string; memory?: string } | undefined
): ContainerDetail => {
  const requests = spec.resources?.requests || {};
  const limits = spec.resources?.limits || {};
  return {
    name: spec.name,
    image: spec.image || status?.image || '',
    ready: status?.ready || false,
    isInit,
    restartCount: status?.restartCount || 0,
    state: mapContainerState(status?.state),
    lastState: status?.lastState ? mapContainerState(status.lastState) : undefined,
    requests: {
      cpu: requests['cpu'] ? formatCpuForDisplay(parseCpuValue(requests['cpu'])) : undefined,
      memory: requests['memory']
        ? formatMemoryForDisplay(parseMemoryValue(requests['memory']))
        : undefined
    },
    limits: {
      cpu: limits['cpu'] ? formatCpuForDisplay(parseCpuValue(limits['cpu'])) : undefined,
      memory: limits['memory']
        ? formatMemoryForDisplay(parseMemoryValue(limits['memory']))
        : undefined
    },
    usage: usage
      ? {
          cpu: formatCpuForDisplay(parseCpuValue(usage.cpu || '0')),
          memory: formatMemoryForDisplay(parseMemoryValue(usage.memory || '0'))
        }
      : undefined
  };
};

// Determine the "type" of a volume from the first non-name key present.
const volumeType = (vol: k8s.V1Volume): string => {
  const keys = Object.keys(vol).filter(k => k !== 'name' && (vol as any)[k] != null);
  return keys[0] || 'unknown';
};

// Compute a relative age string from an ISO timestamp.
const relativeAge = (iso: string): string => {
  if (!iso) return 'unknown';
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (mins > 0) return `${mins}m`;
  return `${Math.max(0, Math.floor(diffMs / 1000))}s`;
};

// Get structured pod detail (Lens-like).
export const getPodDetail = async (
  clusterName: string,
  namespace: string,
  podName: string
): Promise<{ success: boolean; detail?: PodDetail; message?: string }> => {
  try {
    if (!clusterName || !namespace || !podName) {
      return { success: false, message: 'Missing required parameters' };
    }

    const { coreClient, metricsClient } = getClientForCluster(clusterName);

    const [podResp, metricsResp, nodesResp] = await Promise.all([
      coreClient.readNamespacedPod(podName, namespace),
      metricsClient.getPodMetricsForPod(namespace, podName),
      coreClient.listNode()
    ]);

    const pod = podResp.body;
    const metrics = metricsResp.body as
      | { containers?: Array<{ name?: string; usage?: { cpu?: string; memory?: string } }> }
      | null;

    // Live usage per container, keyed by container name.
    const usageByContainer = new Map<string, { cpu?: string; memory?: string }>();
    if (metrics?.containers) {
      for (const c of metrics.containers) {
        if (c.name) usageByContainer.set(c.name, c.usage || {});
      }
    }

    const statusByName = new Map<string, k8s.V1ContainerStatus>();
    (pod.status?.containerStatuses || []).forEach(s => statusByName.set(s.name, s));
    const initStatusByName = new Map<string, k8s.V1ContainerStatus>();
    (pod.status?.initContainerStatuses || []).forEach(s => initStatusByName.set(s.name, s));

    const containers: ContainerDetail[] = (pod.spec?.containers || []).map(spec =>
      buildContainerDetail(spec, statusByName.get(spec.name), false, usageByContainer.get(spec.name))
    );
    const initContainers: ContainerDetail[] = (pod.spec?.initContainers || []).map(spec =>
      buildContainerDetail(
        spec,
        initStatusByName.get(spec.name),
        true,
        usageByContainer.get(spec.name)
      )
    );

    // Aggregate pod-level usage + limits/requests for the drawer bars.
    let totalCpuUsage = 0;
    let totalMemUsage = 0;
    usageByContainer.forEach(u => {
      totalCpuUsage += parseFloat(parseCpuValue(u.cpu || '0'));
      totalMemUsage += parseFloat(parseMemoryValue(u.memory || '0'));
    });
    const res = sumPodResources(pod.spec?.containers);

    const nodeName = pod.spec?.nodeName || '';
    const node = nodesResp.body.items.find(n => n.metadata?.name === nodeName);
    const cpuAllocatable = parseFloat(parseCpuValue(node?.status?.allocatable?.['cpu'] || '0'));
    const memAllocatable = parseFloat(
      parseMemoryValue(node?.status?.allocatable?.['memory'] || '0')
    );
    const cpuPct = computeUsagePercent(totalCpuUsage, res.cpuLimit, res.cpuRequest, cpuAllocatable);
    const memPct = computeUsagePercent(totalMemUsage, res.memoryLimit, res.memoryRequest, memAllocatable);

    const restarts = (pod.status?.containerStatuses || []).reduce(
      (sum, cs) => sum + (cs.restartCount || 0),
      0
    );
    const createdAt = pod.metadata?.creationTimestamp
      ? new Date(pod.metadata.creationTimestamp).toISOString()
      : '';

    const detail: PodDetail = {
      name: pod.metadata?.name || podName,
      namespace: pod.metadata?.namespace || namespace,
      phase: pod.status?.phase || 'Unknown',
      qosClass: pod.status?.qosClass,
      nodeName,
      nodeGroup: node ? resolveNodeGroupName(node.metadata?.labels) : undefined,
      podIP: pod.status?.podIP,
      hostIP: pod.status?.hostIP,
      createdAt,
      startTime: pod.status?.startTime ? new Date(pod.status.startTime).toISOString() : undefined,
      age: relativeAge(createdAt),
      restartPolicy: pod.spec?.restartPolicy,
      serviceAccountName: pod.spec?.serviceAccountName,
      restarts,
      cpuUsage: formatCpuForDisplay(totalCpuUsage.toString()),
      memoryUsage: formatMemoryForDisplay(totalMemUsage.toString()),
      cpuPercent: cpuPct.basis === 'none' ? null : cpuPct.percent,
      memoryPercent: memPct.basis === 'none' ? null : memPct.percent,
      cpuBasis: cpuPct.basis,
      memoryBasis: memPct.basis,
      labels: pod.metadata?.labels || {},
      annotations: pod.metadata?.annotations || {},
      ownerReferences: (pod.metadata?.ownerReferences || []).map(o => ({
        kind: o.kind,
        name: o.name,
        controller: o.controller
      })),
      conditions: (pod.status?.conditions || []).map(c => ({
        type: c.type,
        status: c.status,
        reason: c.reason,
        message: c.message,
        lastTransitionTime: c.lastTransitionTime
          ? new Date(c.lastTransitionTime).toISOString()
          : undefined
      })),
      tolerations: (pod.spec?.tolerations || []).map(t => ({
        key: t.key,
        operator: t.operator,
        value: t.value,
        effect: t.effect,
        tolerationSeconds: t.tolerationSeconds
      })),
      volumes: (pod.spec?.volumes || []).map(v => ({ name: v.name, type: volumeType(v) })),
      containers,
      initContainers
    };

    return { success: true, detail };
  } catch (error) {
    console.error(`Error getting detail for pod ${namespace}/${podName}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error fetching pod detail'
    };
  }
};

// List events for a specific pod.
export const getPodEvents = async (
  clusterName: string,
  namespace: string,
  podName: string
): Promise<{ success: boolean; events?: PodEvent[]; message?: string }> => {
  try {
    if (!clusterName || !namespace || !podName) {
      return { success: false, message: 'Missing required parameters' };
    }

    const { coreClient } = getClientForCluster(clusterName);

    // fieldSelector is the 5th positional arg on listNamespacedEvent in v0.20.
    const { body } = await coreClient.listNamespacedEvent(
      namespace,
      undefined, // pretty
      undefined, // allowWatchBookmarks
      undefined, // _continue
      `involvedObject.name=${podName},involvedObject.namespace=${namespace}`
    );

    const events: PodEvent[] = body.items.map(e => {
      const last =
        e.lastTimestamp || e.eventTime || e.metadata?.creationTimestamp || '';
      const first = e.firstTimestamp || e.eventTime || e.metadata?.creationTimestamp || '';
      return {
        type: e.type || 'Normal',
        reason: e.reason || '',
        message: e.message || '',
        count: e.count || (e.series?.count ?? 1),
        firstSeen: first ? new Date(first).toISOString() : '',
        lastSeen: last ? new Date(last).toISOString() : '',
        source: e.source?.component || e.reportingComponent || ''
      };
    });

    // Newest first.
    events.sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''));

    return { success: true, events };
  } catch (error) {
    console.error(`Error getting events for pod ${namespace}/${podName}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error fetching pod events'
    };
  }
};

// True when an error looks like an expired/invalid credential (AWS SSO/VPN
// session lapsed, exec-auth failed, or the API returned 401). Lets routes
// surface a distinguishable 'auth_expired' instead of a generic 500 so the UI
// can show a Reconnect button.
export const isAuthError = (error: any): boolean => {
  const status = error?.statusCode ?? error?.response?.statusCode ?? error?.code;
  if (status === 401) return true;
  const msg = String(error?.message || '');
  return /unauthorized|expired|credential|get-token|exec/i.test(msg);
};

// List namespace names in the cluster, sorted.
export const listNamespaces = async (clusterName: string): Promise<string[]> => {
  const { coreClient } = getClientForCluster(clusterName);
  const { body } = await coreClient.listNamespace();
  return body.items
    .map(ns => ns.metadata?.name || '')
    .filter(Boolean)
    .sort();
};

// List secrets across namespaces (or one namespace). Values are NOT included.
// Helm release secrets are excluded (surfaced by the Helm section instead).
export const listSecrets = async (
  clusterName: string,
  namespace?: string
): Promise<SecretSummary[]> => {
  const { coreClient } = getClientForCluster(clusterName);

  const resp = namespace
    ? await coreClient.listNamespacedSecret(namespace)
    : await coreClient.listSecretForAllNamespaces();

  return resp.body.items
    .filter(s => s.type !== 'helm.sh/release.v1')
    .map(s => {
      const keys = Object.keys(s.data || {});
      const createdAt = s.metadata?.creationTimestamp
        ? new Date(s.metadata.creationTimestamp).toISOString()
        : '';
      return {
        name: s.metadata?.name || 'unknown',
        namespace: s.metadata?.namespace || 'default',
        type: s.type || 'Opaque',
        keys,
        keyCount: keys.length,
        createdAt,
        age: relativeAge(createdAt)
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

// Get a single secret with base64-decoded values. Binary values are flagged
// so the UI doesn't render mangled UTF-8.
export const getSecretDetail = async (
  clusterName: string,
  namespace: string,
  name: string
): Promise<{ success: boolean; secret?: SecretDetail; message?: string }> => {
  try {
    const { coreClient } = getClientForCluster(clusterName);
    const { body: s } = await coreClient.readNamespacedSecret(name, namespace);

    const data: SecretDetail['data'] = {};
    for (const [key, b64] of Object.entries(s.data || {})) {
      const buf = Buffer.from(b64 as string, 'base64');
      // Treat as binary if it contains NUL or a high proportion of control chars.
      const isBinary = buf.includes(0) ||
        buf.some(byte => byte < 9 || (byte > 13 && byte < 32));
      data[key] = isBinary
        ? { value: b64 as string, encoding: 'base64' }
        : { value: buf.toString('utf8'), encoding: 'utf8' };
    }

    const createdAt = s.metadata?.creationTimestamp
      ? new Date(s.metadata.creationTimestamp).toISOString()
      : '';

    return {
      success: true,
      secret: {
        name: s.metadata?.name || name,
        namespace: s.metadata?.namespace || namespace,
        type: s.type || 'Opaque',
        createdAt,
        labels: s.metadata?.labels,
        data
      }
    };
  } catch (error) {
    console.error(`Error getting secret ${namespace}/${name}:`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error fetching secret'
    };
  }
};

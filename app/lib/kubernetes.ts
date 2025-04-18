import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import * as url from 'url';
import { Cluster, Node, Pod, NodeGroupInfo } from '../types/kubernetes';

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

// Get the kubeconfig file path
const getKubeconfigPath = (): string => {
  const kubeconfigEnv = process.env.KUBECONFIG;
  if (kubeconfigEnv) {
    return kubeconfigEnv;
  }
  return path.join(os.homedir(), '.kube', 'config');
};

// Load kubeconfig
export const loadKubeConfig = (): k8s.KubeConfig => {
  const kc = new k8s.KubeConfig();
  try {
    const kubeconfigPath = getKubeconfigPath();
    if (fs.existsSync(kubeconfigPath)) {
      kc.loadFromFile(kubeconfigPath);
    } else {
      kc.loadFromDefault();
    }
  } catch (error) {
    console.error('Error loading kubeconfig:', error);
    kc.loadFromDefault();
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
      server: cluster?.server || 'Unknown'
    };
  });
};

// Get a cluster by name
export const getClusterByName = (name: string): Cluster | null => {
  const clusters = getClusters();
  return clusters.find(cluster => cluster.name === name) || null;
};

// Get a client for a specific cluster
export const getClientForCluster = (clusterName: string): {
  coreClient: k8s.CoreV1Api;
  metricsClient: any;
  appsClient: k8s.AppsV1Api;
} => {
  const kc = loadKubeConfig();
  
  try {
    // Set the current context to the specified cluster
    kc.setCurrentContext(clusterName);
  } catch (error) {
    console.error(`Failed to set context to ${clusterName}:`, error);
    // Continue with the current context as a fallback
    console.log('Continuing with current context');
  }
  
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
    
    // Create a simple metrics client with the required methods
    metricsClient = {
      getNodeMetrics: async () => {
        try {
          // Use request library directly instead of the client
          const opts = {}; 
          kc.applyToRequest(opts);
          
          // Use our custom fetch function with SSL options
          console.log(`Fetching node metrics from ${cluster.server}/apis/metrics.k8s.io/v1beta1/nodes`);
          const response = await fetchWithoutCertValidation(`${cluster.server}/apis/metrics.k8s.io/v1beta1/nodes`, opts);
          
          if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText} (${response.status})`);
          }
          
          const data = await response.json();
          return { body: data };
        } catch (err) {
          console.error('Error fetching node metrics directly:', err);
          
          // Provide more detailed error logging
          if (err instanceof Error) {
            // Log the error details
            console.error('Error details:', {
              message: err.message,
              stack: err.stack,
              cause: err.cause ? (err.cause as Error).message : 'No cause',
              code: (err as any).code
            });
            
            // Log a more user-friendly message
            if ((err as any).code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
              console.error('This appears to be an SSL certificate verification issue. Using insecure connections to bypass.');
            } else if ((err as any).code === 'ECONNREFUSED') {
              console.error('Connection refused. Make sure the Kubernetes API server is accessible.');
            }
          }
          
          // Continue with empty metrics
          return { body: { items: [] } };
        }
      },
      
      getPodMetrics: async () => {
        try {
          // Use request library directly instead of the client
          const opts = {};
          kc.applyToRequest(opts);
          
          // Use our custom fetch function with SSL options
          console.log(`Fetching pod metrics from ${cluster.server}/apis/metrics.k8s.io/v1beta1/pods`);
          const response = await fetchWithoutCertValidation(`${cluster.server}/apis/metrics.k8s.io/v1beta1/pods`, opts);
          
          if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText} (${response.status})`);
          }
          
          const data = await response.json();
          return { body: data };
        } catch (err) {
          console.error('Error fetching pod metrics directly:', err);
          
          // Provide more detailed error logging
          if (err instanceof Error) {
            // Log the error details
            console.error('Error details:', {
              message: err.message,
              stack: err.stack,
              cause: err.cause ? (err.cause as Error).message : 'No cause',
              code: (err as any).code
            });
            
            // Log a more user-friendly message
            if ((err as any).code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
              console.error('This appears to be an SSL certificate verification issue. Using insecure connections to bypass.');
            } else if ((err as any).code === 'ECONNREFUSED') {
              console.error('Connection refused. Make sure the Kubernetes API server is accessible.');
            }
          }
          
          // Continue with empty metrics
          return { body: { items: [] } };
        }
      }
    };
  } catch (error) {
    console.error('Error creating metrics client:', error);
    // Create a dummy metrics client with methods that return empty data
    metricsClient = {
      getNodeMetrics: async () => {
        return {
          body: {
            items: []
          }
        };
      },
      getPodMetrics: async () => {
        return {
          body: {
            items: []
          }
        };
      }
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
    let nodeMetrics = { items: [] };
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
    let pods = [];
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
        const cpuUsage = metrics?.usage?.cpu || '0';
        const memoryUsage = metrics?.usage?.memory || '0';
        
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
          capacity: {
            cpu: cpuCapacity,
            memory: memoryCapacity
          },
          allocatable: {
            cpu: cpuAllocatable,
            memory: memoryAllocatable
          },
          usage: {
            cpu: cpuUsage,
            memory: memoryUsage
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
    const nodes = await getNodes(clusterName);
    
    // Create a map of node groups
    const nodeGroups = new Map<string, NodeGroupInfo>();
    
    nodes.forEach(node => {
      // Extract a node group from specific labels
      // This looks for common node group designations in different Kubernetes setups
      let nodeGroupName = 'default';
      
      if (node.tags) {
        // For EKS
        if (node.tags['eks.amazonaws.com/nodegroup']) {
          nodeGroupName = node.tags['eks.amazonaws.com/nodegroup'];
        }
        // For kOps
        else if (node.tags['kops.k8s.io/instancegroup']) {
          nodeGroupName = node.tags['kops.k8s.io/instancegroup'];
        }
        // For GKE
        else if (node.tags['cloud.google.com/gke-nodepool']) {
          nodeGroupName = node.tags['cloud.google.com/gke-nodepool'];
        }
        // For AKS
        else if (node.tags['agentpool']) {
          nodeGroupName = node.tags['agentpool'];
        }
      }
      
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
          podsCount: 0
        };
        nodeGroups.set(nodeGroupName, nodeGroup);
      }
      
      // Add node to group
      nodeGroup.nodes.push(node);
      
      // Update group metrics
      nodeGroup.totalCpu = (parseFloat(nodeGroup.totalCpu) + parseFloat(node.capacity.cpu)).toString();
      nodeGroup.totalMemory = (parseFloat(nodeGroup.totalMemory) + parseFloat(node.capacity.memory)).toString();
      nodeGroup.usedCpu = (parseFloat(nodeGroup.usedCpu) + parseFloat(node.usage.cpu)).toString();
      nodeGroup.usedMemory = (parseFloat(nodeGroup.usedMemory) + parseFloat(node.usage.memory)).toString();
      nodeGroup.podsCount += node.pods;
    });
    
    // Convert map to array
    return Array.from(nodeGroups.values());
    
  } catch (error) {
    console.error('Error getting node groups:', error);
    throw error;
  }
};

// Get pods for a cluster
export const getPods = async (clusterName: string): Promise<Pod[]> => {
  try {
    console.log(`Getting clients for cluster: ${clusterName}`);
    const { coreClient, metricsClient } = getClientForCluster(clusterName);
    
    // Get pods
    console.log('Fetching pods...');
    const podsResponse = await coreClient.listPodForAllNamespaces();
    const pods = podsResponse.body.items;
    console.log(`Successfully fetched ${pods.length} pods`);
    
    // Get pod metrics
    console.log('Fetching pod metrics...');
    let podMetrics = { items: [] };
    try {
      const metricsResponse = await metricsClient.getPodMetrics();
      podMetrics = metricsResponse.body;
      console.log(`Successfully fetched metrics for ${podMetrics.items?.length || 0} pods`);
    } catch (metricsError) {
      console.error('Error fetching pod metrics:', metricsError);
      console.log('Continuing without pod metrics data');
    }
    
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
              // Parse CPU usage (remove the 'n' suffix if present)
              const cpuUsage = container.usage?.cpu || '0';
              const cpuValueStr = cpuUsage.toString().replace(/n$/, '');
              const cpuValue = parseInt(cpuValueStr) || 0;
              totalCpuUsage += cpuValue;
              
              // Parse memory usage (remove the 'Ki' suffix if present)
              const memoryUsage = container.usage?.memory || '0';
              const memoryValueStr = memoryUsage.toString().replace(/Ki$/, '');
              const memoryValue = parseInt(memoryValueStr) || 0;
              totalMemoryUsage += memoryValue;
            } catch (parseError) {
              console.error(`Error parsing container metrics for ${pod.metadata?.name}:`, parseError);
            }
          });
        }
        
        // Format CPU and memory usage
        const cpuUsageFormatted = `${((totalCpuUsage || 0) / 1000000).toFixed(2)}m`;
        const memoryUsageFormatted = `${((totalMemoryUsage || 0) / 1024).toFixed(2)}Mi`;
        
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
          creationTimestamp: age
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
          creationTimestamp: 'unknown'
        };
      }
    });
    
  } catch (error) {
    console.error('Error getting pods:', error);
    throw error;
  }
}; 
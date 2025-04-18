'use server';

import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import * as url from 'url';
import { Cluster, Node, Pod, NodeGroupInfo } from '../types/kubernetes';
import { Options } from 'request';

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
          const opts: Options = {
            url: `${cluster.server}/apis/metrics.k8s.io/v1beta1/nodes`,
            method: 'GET',
            json: true
          }; 
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
          return { body: { items: [] } };
        }
      },
      
      getPodMetrics: async () => {
        try {
          // Use request library directly instead of the client
          const opts: Options = {
            url: `${cluster.server}/apis/metrics.k8s.io/v1beta1/pods`,
            method: 'GET',
            json: true
          };
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
          podsCount: 0,
          cpuPercentage: 0,
          memPercentage: 0
        };
        nodeGroups.set(nodeGroupName, nodeGroup);
      }
      
      // Add node to group
      nodeGroup.nodes.push(node);
      
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
    let podMetrics: { 
      items?: Array<{ 
        metadata?: { 
          name?: string; 
          namespace?: string 
        }; 
        containers?: Array<{ 
          usage?: { 
            cpu?: string; 
            memory?: string 
          } 
        }> 
      }> 
    } = { items: [] };
    
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
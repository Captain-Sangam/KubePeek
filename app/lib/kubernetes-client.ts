import { Cluster } from '../types/kubernetes';

// Store for custom cluster display names
const CLUSTER_NAMES_STORAGE_KEY = 'kubepeek_cluster_display_names';

// Save custom display name for a cluster
export const saveClusterDisplayName = (clusterName: string, displayName: string): void => {
  if (typeof window !== 'undefined') {
    try {
      const storedNames = localStorage.getItem(CLUSTER_NAMES_STORAGE_KEY);
      const clusterNames = storedNames ? JSON.parse(storedNames) : {};
      clusterNames[clusterName] = displayName;
      localStorage.setItem(CLUSTER_NAMES_STORAGE_KEY, JSON.stringify(clusterNames));
    } catch (error) {
      console.error('Error saving cluster display name:', error);
    }
  }
};

// Get custom display names for all clusters
export const getClusterDisplayNames = (): Record<string, string> => {
  if (typeof window !== 'undefined') {
    try {
      const storedNames = localStorage.getItem(CLUSTER_NAMES_STORAGE_KEY);
      return storedNames ? JSON.parse(storedNames) : {};
    } catch (error) {
      console.error('Error retrieving cluster display names:', error);
      return {};
    }
  }
  return {};
}; 
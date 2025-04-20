'use client';

import { Cluster } from '../types/kubernetes';

// Storage key for localStorage
const CLUSTER_NAMES_STORAGE_KEY = 'kubepeek_cluster_display_names';

// Save custom display name for a cluster
export const saveClusterDisplayName = (clusterName: string, displayName: string): void => {
  try {
    // Read existing data from localStorage
    let clusterNames: Record<string, string> = {};
    const existingData = localStorage.getItem(CLUSTER_NAMES_STORAGE_KEY);
    
    if (existingData) {
      clusterNames = JSON.parse(existingData);
    }
    
    // Update and save
    clusterNames[clusterName] = displayName;
    localStorage.setItem(CLUSTER_NAMES_STORAGE_KEY, JSON.stringify(clusterNames));
  } catch (error) {
    console.error('Error saving cluster display name:', error);
  }
};

// Get custom display names for all clusters
export const getClusterDisplayNames = (): Record<string, string> => {
  try {
    // Read from localStorage
    const existingData = localStorage.getItem(CLUSTER_NAMES_STORAGE_KEY);
    
    if (existingData) {
      return JSON.parse(existingData);
    }
  } catch (error) {
    console.error('Error retrieving cluster display names:', error);
  }
  
  return {};
}; 
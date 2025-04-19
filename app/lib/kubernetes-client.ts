import { Cluster } from '../types/kubernetes';
import fs from 'fs';
import path from 'path';

// Store for custom cluster display names
const CLUSTER_NAMES_STORAGE_KEY = 'kubepeek_cluster_display_names.json';
const STORAGE_DIR = process.env.STORAGE_DIR || '/tmp/kubepeek';

// Ensure storage directory exists
const ensureStorageDir = (): void => {
  if (!fs.existsSync(STORAGE_DIR)) {
    try {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    } catch (error) {
      console.error('Error creating storage directory:', error);
    }
  }
};

// Path to the storage file
const getStoragePath = (): string => {
  return path.join(STORAGE_DIR, CLUSTER_NAMES_STORAGE_KEY);
};

// Save custom display name for a cluster
export const saveClusterDisplayName = (clusterName: string, displayName: string): void => {
  try {
    ensureStorageDir();
    
    // Read existing data
    let clusterNames: Record<string, string> = {};
    if (fs.existsSync(getStoragePath())) {
      const data = fs.readFileSync(getStoragePath(), 'utf8');
      clusterNames = JSON.parse(data);
    }
    
    // Update and save
    clusterNames[clusterName] = displayName;
    fs.writeFileSync(getStoragePath(), JSON.stringify(clusterNames), 'utf8');
  } catch (error) {
    console.error('Error saving cluster display name:', error);
  }
};

// Get custom display names for all clusters
export const getClusterDisplayNames = (): Record<string, string> => {
  try {
    ensureStorageDir();
    
    if (fs.existsSync(getStoragePath())) {
      const data = fs.readFileSync(getStoragePath(), 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error retrieving cluster display names:', error);
  }
  
  return {};
}; 
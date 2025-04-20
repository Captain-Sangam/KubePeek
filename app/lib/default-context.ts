'use server';

import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Default context name used in the UI when no context is specified
// We'll define this as a function to comply with 'use server' constraints
export async function getDefaultContextName(): Promise<string> {
  return 'loaded-context';
}

/**
 * Get the default context from the kubeconfig file
 */
export async function getDefaultContext(): Promise<string> {
  try {
    // Get kubeconfig path
    const kubeconfigEnv = process.env.KUBECONFIG;
    const homeDir = os.homedir();
    
    let kubeconfigPath;
    if (kubeconfigEnv) {
      kubeconfigPath = kubeconfigEnv;
    } else {
      kubeconfigPath = path.join(homeDir, '.kube', 'config');
    }
    
    // Check if the file exists
    if (!fs.existsSync(kubeconfigPath)) {
      console.error(`Kubeconfig file not found at ${kubeconfigPath}`);
      return await getDefaultContextName();
    }
    
    // Load the kubeconfig
    const kc = new k8s.KubeConfig();
    kc.loadFromFile(kubeconfigPath);
    
    // Get the current context
    const currentContext = kc.getCurrentContext();
    
    if (!currentContext) {
      console.error('No current context found in kubeconfig');
      
      // Try to get the first context as fallback
      const contexts = kc.getContexts();
      if (contexts.length > 0) {
        return contexts[0].name;
      }
      
      return await getDefaultContextName();
    }
    
    return currentContext;
  } catch (error) {
    console.error('Error getting default context:', error);
    return await getDefaultContextName();
  }
}

/**
 * Get all available contexts from the kubeconfig file
 */
export async function getAllContexts(): Promise<string[]> {
  try {
    // Get kubeconfig path
    const kubeconfigEnv = process.env.KUBECONFIG;
    const homeDir = os.homedir();
    
    let kubeconfigPath;
    if (kubeconfigEnv) {
      kubeconfigPath = kubeconfigEnv;
    } else {
      kubeconfigPath = path.join(homeDir, '.kube', 'config');
    }
    
    // Check if the file exists
    if (!fs.existsSync(kubeconfigPath)) {
      console.error(`Kubeconfig file not found at ${kubeconfigPath}`);
      const defaultName = await getDefaultContextName();
      return [defaultName];
    }
    
    // Load the kubeconfig
    const kc = new k8s.KubeConfig();
    kc.loadFromFile(kubeconfigPath);
    
    // Get all contexts
    const contexts = kc.getContexts().map(context => context.name);
    
    if (contexts.length === 0) {
      const defaultName = await getDefaultContextName();
      return [defaultName];
    }
    
    return contexts;
  } catch (error) {
    console.error('Error getting all contexts:', error);
    const defaultName = await getDefaultContextName();
    return [defaultName];
  }
} 
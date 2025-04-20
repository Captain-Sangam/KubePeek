import { NextResponse } from 'next/server';
import { getClusters } from '../../lib/kubernetes-server';
import { getDefaultContext, getDefaultContextName } from '../../lib/default-context';
import { DEFAULT_CONTEXT_NAME } from '../../lib/constants';

export async function GET() {
  try {
    console.log('[/api/clusters] Calling getClusters()...');
    const clusters = getClusters();
    
    // Validate the clusters data
    if (!Array.isArray(clusters)) {
      console.error('[/api/clusters] Invalid clusters data format:', clusters);
      return NextResponse.json(
        { error: `Invalid clusters data format: expected array, got ${typeof clusters}` }, 
        { status: 500 }
      );
    }
    
    // Get current context for debugging
    const currentContext = await getDefaultContext();
    console.log(`[/api/clusters] Current active context: ${currentContext}`);
    
    // Check if clusters array is empty
    if (clusters.length === 0) {
      console.log('[/api/clusters] No clusters found in kubeconfig');
      
      // Create a default fallback cluster using the default context
      const defaultCluster = {
        name: DEFAULT_CONTEXT_NAME,
        context: DEFAULT_CONTEXT_NAME,
        server: 'Current active context',
        displayName: 'Current Cluster',
        isActive: true
      };
      
      console.log('[/api/clusters] Returning default fallback cluster');
      return NextResponse.json([defaultCluster]);
    }
    
    // Add a field to indicate which cluster is currently active
    const clustersWithActiveStatus = clusters.map(cluster => ({
      ...cluster,
      isActive: cluster.name === currentContext
    }));
    
    // Log the exact data being returned
    console.log('[/api/clusters] Returning clusters:', JSON.stringify(clustersWithActiveStatus, null, 2));
    return NextResponse.json(clustersWithActiveStatus);
  } catch (error: any) {
    console.error('[/api/clusters] Error fetching clusters:', error);
    
    // Return a default fallback cluster if there was an error
    const defaultCluster = {
      name: DEFAULT_CONTEXT_NAME,
      context: DEFAULT_CONTEXT_NAME,
      server: 'Current active context', 
      displayName: 'Current Cluster',
      isActive: true
    };
    
    console.log('[/api/clusters] Returning default fallback cluster due to error');
    return NextResponse.json([defaultCluster]);
  }
} 
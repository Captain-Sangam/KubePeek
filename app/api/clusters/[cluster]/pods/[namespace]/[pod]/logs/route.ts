import { NextRequest, NextResponse } from 'next/server';
import { getPodLogs } from '../../../../../../../lib/kubernetes-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { cluster: string; namespace: string; pod: string } }
) {
  // Log the request params for debugging
  console.log('Pod logs API called with params:', JSON.stringify(params, null, 2));
  
  try {
    const { cluster, namespace, pod } = params;
    
    if (!cluster || !namespace || !pod) {
      console.error('Missing required parameters:', { cluster, namespace, pod });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required parameters', 
          params: { cluster, namespace, pod } 
        }, 
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    
    const containerName = searchParams.get('container') || undefined;
    const tailLines = searchParams.get('tail') 
      ? parseInt(searchParams.get('tail') as string, 10) 
      : undefined;
    
    console.log(`Fetching logs for pod ${namespace}/${pod} in cluster ${cluster}`, 
      { containerName, tailLines });
    
    const result = await getPodLogs(cluster, namespace, pod, containerName, tailLines);
    console.log(`Pod logs API result success: ${result.success}`);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      console.error('Pod logs API failed:', result.message);
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error in pod logs API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'An error occurred',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 
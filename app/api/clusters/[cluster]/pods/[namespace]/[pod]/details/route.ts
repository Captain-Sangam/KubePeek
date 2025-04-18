import { NextRequest, NextResponse } from 'next/server';
import { getPodDetails, getPodDetailsUsingKubectl } from '../../../../../../../lib/kubernetes-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { cluster: string; namespace: string; pod: string } }
) {
  // Log the request params for debugging
  console.log('Pod details API called with params:', JSON.stringify(params, null, 2));
  
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
    
    console.log(`Fetching details for pod ${namespace}/${pod} in cluster ${cluster}`);
    let result = await getPodDetails(cluster, namespace, pod);
    
    // If the regular method fails with a 404 or other error, try kubectl fallback
    if (!result.success) {
      console.log(`Regular API request failed, trying kubectl fallback for ${namespace}/${pod} in cluster ${cluster}`);
      result = await getPodDetailsUsingKubectl(cluster, namespace, pod);
    }
    
    console.log(`Pod details API result success: ${result.success}`);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      console.error('Pod details API failed:', result.message);
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error in pod details API:', error);
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
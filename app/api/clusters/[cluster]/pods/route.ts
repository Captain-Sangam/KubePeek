import { NextRequest, NextResponse } from 'next/server';
import { getPods } from '../../../../lib/kubernetes-server';
import { getDefaultContext, getDefaultContextName } from '../../../../lib/default-context';

export async function GET(
  request: NextRequest,
  { params }: { params: { cluster: string } }
) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // The cluster parameter might be URL-encoded, especially for EKS ARNs
  let cluster = decodeURIComponent(params.cluster);
  
  // Get the default context name
  const defaultContextName = await getDefaultContextName();
  
  // If we receive the default placeholder name, replace it with the actual current context
  if (cluster === defaultContextName) {
    const actualContext = await getDefaultContext();
    console.log(`API: Replacing ${defaultContextName} with actual context: ${actualContext}`);
    cluster = actualContext;
  }
  
  console.log(`API: Getting pods for cluster ${cluster}`);

  try {
    const pods = await getPods(cluster);
    console.log(`API: Successfully retrieved ${pods.length} pods`);
    
    return NextResponse.json(pods, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error(`Error fetching pods for cluster ${cluster}:`, error);
    const errorMessage = error.message || 'Failed to fetch pods';
    console.error(`Returning error: ${errorMessage}`);
    
    return NextResponse.json(
      { error: errorMessage }, 
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
} 
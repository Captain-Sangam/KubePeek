import { NextRequest, NextResponse } from 'next/server';
import { getNodes } from '../../../../lib/kubernetes-server';
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
  
  console.log(`API: Getting nodes for cluster ${cluster}`);

  try {
    const nodes = await getNodes(cluster);
    console.log(`API: Successfully retrieved ${nodes.length} nodes`);
    
    return NextResponse.json(nodes, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error(`Error fetching nodes for cluster ${cluster}:`, error);
    const errorMessage = error.message || 'Failed to fetch nodes';
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
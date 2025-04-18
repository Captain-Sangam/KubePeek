import { NextRequest, NextResponse } from 'next/server';
import { getPodLogs } from '../../../../../../../lib/kubernetes-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { cluster: string; namespace: string; pod: string } }
) {
  try {
    const { cluster, namespace, pod } = params;
    const { searchParams } = new URL(request.url);
    
    const containerName = searchParams.get('container') || undefined;
    const tailLines = searchParams.get('tail') 
      ? parseInt(searchParams.get('tail') as string, 10) 
      : undefined;
    
    const result = await getPodLogs(cluster, namespace, pod, containerName, tailLines);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error in pod logs API:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getPodEvents } from '../../../../../../../lib/kubernetes-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { cluster: string; namespace: string; pod: string } }
) {
  try {
    const { cluster, namespace, pod } = params;

    if (!cluster || !namespace || !pod) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters', params: { cluster, namespace, pod } },
        { status: 400 }
      );
    }

    const result = await getPodEvents(cluster, namespace, pod);

    if (result.success) {
      return NextResponse.json(result);
    }
    return NextResponse.json(result, { status: 500 });
  } catch (error) {
    console.error('Error in pod events API:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

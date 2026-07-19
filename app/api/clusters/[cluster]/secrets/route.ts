import { NextRequest, NextResponse } from 'next/server';
import { listSecrets } from '../../../../lib/kubernetes-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { cluster: string } }
) {
  try {
    const { cluster } = params;
    if (!cluster) {
      return NextResponse.json(
        { success: false, message: 'Missing cluster parameter' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get('namespace') || undefined;

    const secrets = await listSecrets(cluster, namespace);
    return NextResponse.json(secrets);
  } catch (error) {
    console.error('Error in secrets API:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

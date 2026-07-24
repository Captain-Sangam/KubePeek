import { NextRequest, NextResponse } from 'next/server';
import { listHelmReleases } from '../../../../lib/helm-server';
import { isAuthError } from '../../../../lib/kubernetes-server';

export async function GET(request: NextRequest, props: { params: Promise<{ cluster: string }> }) {
  const params = await props.params;
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

    const releases = await listHelmReleases(cluster, namespace);
    return NextResponse.json(releases);
  } catch (error) {
    console.error('Error in helm API:', error);
    if (isAuthError(error)) {
      return NextResponse.json({ error: 'auth_expired' }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

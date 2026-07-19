import { NextRequest, NextResponse } from 'next/server';
import { listHelmReleases } from '../../../../lib/helm-server';

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

    const releases = await listHelmReleases(cluster);
    return NextResponse.json(releases);
  } catch (error) {
    console.error('Error in helm API:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

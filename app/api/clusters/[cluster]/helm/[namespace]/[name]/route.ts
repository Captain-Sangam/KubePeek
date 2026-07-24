import { NextRequest, NextResponse } from 'next/server';
import { getHelmRelease } from '../../../../../../lib/helm-server';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ cluster: string; namespace: string; name: string }> }
) {
  const params = await props.params;
  try {
    const { cluster, namespace, name } = params;

    if (!cluster || !namespace || !name) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const result = await getHelmRelease(cluster, namespace, name);

    if (result.success) {
      return NextResponse.json(result);
    }
    return NextResponse.json(result, { status: 500 });
  } catch (error) {
    console.error('Error in helm release detail API:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

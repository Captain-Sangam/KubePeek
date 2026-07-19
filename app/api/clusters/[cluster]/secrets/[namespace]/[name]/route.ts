import { NextRequest, NextResponse } from 'next/server';
import { getSecretDetail, deleteSecret } from '../../../../../../lib/kubernetes-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { cluster: string; namespace: string; name: string } }
) {
  try {
    const { cluster, namespace, name } = params;

    if (!cluster || !namespace || !name) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const result = await getSecretDetail(cluster, namespace, name);

    if (result.success) {
      return NextResponse.json(result);
    }
    return NextResponse.json(result, { status: 500 });
  } catch (error) {
    console.error('Error in secret detail API:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { cluster: string; namespace: string; name: string } }
) {
  try {
    const { cluster, namespace, name } = params;
    if (!cluster || !namespace || !name) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const result = await deleteSecret(cluster, namespace, name);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('Error in secret deletion API:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

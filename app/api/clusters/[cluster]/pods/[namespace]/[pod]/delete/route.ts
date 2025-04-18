import { NextRequest, NextResponse } from 'next/server';
import { deletePod } from '../../../../../../../lib/kubernetes-server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { cluster: string; namespace: string; pod: string } }
) {
  try {
    const { cluster, namespace, pod } = params;
    const result = await deletePod(cluster, namespace, pod);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error in pod deletion API:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 
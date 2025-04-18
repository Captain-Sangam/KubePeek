import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clusterName, displayName } = body;
    
    if (!clusterName) {
      return NextResponse.json(
        { error: 'Cluster name is required' },
        { status: 400 }
      );
    }
    
    // The actual saving is done on the client side using localStorage
    // This endpoint is mainly for API consistency
    
    return NextResponse.json({ 
      success: true, 
      message: 'Display name updated',
      clusterName,
      displayName
    });
  } catch (error: any) {
    console.error('Error updating cluster display name:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update cluster display name' },
      { status: 500 }
    );
  }
} 
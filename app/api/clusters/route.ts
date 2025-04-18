import { NextResponse } from 'next/server';
import { getClusters } from '../../lib/kubernetes';

export async function GET() {
  try {
    const clusters = getClusters();
    return NextResponse.json(clusters);
  } catch (error: any) {
    console.error('Error fetching clusters:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch clusters' }, 
      { status: 500 }
    );
  }
} 
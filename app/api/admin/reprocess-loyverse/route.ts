import { NextResponse } from 'next/server';

// Loyverse sync has been removed. This endpoint is no longer active.
export async function POST() {
    return NextResponse.json(
        { success: false, error: 'Loyverse sync has been removed. Firebase is the single source of truth.' },
        { status: 410 }
    );
}

export async function GET() {
    return NextResponse.json(
        { success: false, error: 'Loyverse sync has been removed. Firebase is the single source of truth.' },
        { status: 410 }
    );
}

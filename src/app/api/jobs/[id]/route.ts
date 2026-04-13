import { NextResponse } from 'next/server';
import db from '@/lib/db';

const VALID_STATUSES = ['new', 'saved', 'applied', 'dismissed'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    db.prepare(`UPDATE jobs SET status = ? WHERE id = ?`).run(body.status, id);
  }

  if (body.notes !== undefined) {
    db.prepare(`UPDATE jobs SET notes = ? WHERE id = ?`).run(body.notes, id);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare(`DELETE FROM jobs WHERE id = ?`).run(id);
  return NextResponse.json({ success: true });
}

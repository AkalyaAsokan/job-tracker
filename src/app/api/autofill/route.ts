import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
  const { urls } = await request.json() as { urls: string[] };

  if (!urls?.length) {
    return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
  }

  const scriptPath = path.join(process.cwd(), 'scripts/autofill.mjs');

  // Spawn as a fully detached process so it survives independently
  const child = spawn(process.execPath, ['--experimental-vm-modules', scriptPath, ...urls], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();

  return NextResponse.json({ success: true, count: urls.length });
}

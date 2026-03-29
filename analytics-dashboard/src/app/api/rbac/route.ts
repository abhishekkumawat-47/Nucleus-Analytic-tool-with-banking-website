import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import fs from 'fs';
import path from 'path';
import { authOptions } from '../auth/[...nextauth]/route';

function getRbacFilePath() {
  return path.resolve(process.cwd(), '../rbac.json');
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const configPath = getRbacFilePath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return NextResponse.json(JSON.parse(data));
    }
    return NextResponse.json({ super_admins: [], app_admins: {} });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, email, appId } = body;

    // Validate payload
    if (!email || !appId || !['add', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const configPath = getRbacFilePath();
    let config = { super_admins: [], app_admins: {} as Record<string, string[]> };

    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    if (!config.app_admins[appId]) {
      config.app_admins[appId] = [];
    }

    if (action === 'add') {
      if (!config.app_admins[appId].includes(email)) {
        config.app_admins[appId].push(email);
      }
    } else if (action === 'remove') {
      config.app_admins[appId] = config.app_admins[appId].filter((e) => e !== email);
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

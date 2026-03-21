// @ts-nocheck — This file runs in the Deno runtime (Supabase Edge Functions), not Node.js
// eslint-disable-next-line import/no-unresolved
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushTarget {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT token is valid
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { targets } = (await req.json()) as { targets: PushTarget[] };
    if (!targets || targets.length === 0) {
      return Response.json({ sent: 0 });
    }

    // Look up push tokens for target users
    const userIds = [...new Set(targets.map((t) => t.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, push_token')
      .in('id', userIds)
      .not('push_token', 'is', null);

    if (!users || users.length === 0) {
      return Response.json({ sent: 0 });
    }

    const tokenMap = new Map<string, string>();
    for (const u of users) {
      if (u.push_token) tokenMap.set(u.id, u.push_token as string);
    }

    const messages = targets
      .filter((t) => tokenMap.has(t.user_id))
      .map((t) => ({
        to: tokenMap.get(t.user_id)!,
        sound: 'default' as const,
        title: t.title,
        body: t.body,
        data: t.data ?? {},
      }));

    if (messages.length === 0) {
      return Response.json({ sent: 0 });
    }

    // Send to Expo Push API (server-side, tokens stay private)
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    return Response.json({ sent: messages.length });
  } catch {
    return new Response('Internal server error', { status: 500 });
  }
});

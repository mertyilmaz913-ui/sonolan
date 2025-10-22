import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';

interface RouteContext { params: { id: string }; }

export async function GET(_req: Request, context: RouteContext) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: 'unauthorized', message: 'Authentication required.' } }, { status: 401 });
  }

  if (user.id !== context.params.id) {
    return NextResponse.json({ error: { code: 'forbidden', message: 'You can only access your own dashboard.' } }, { status: 403 });
  }

  const { data: metrics, error: metricsError } = await supabase
    .from('trader_dashboard_metrics')
    .select('total_minutes, total_revenue, active_subscribers')
    .eq('trader_id', context.params.id)
    .maybeSingle();

  if (metricsError) {
    return NextResponse.json({ error: { code: 'metrics_error', message: metricsError.message } }, { status: 500 });
  }

  const { data: feedback, error: feedbackError } = await supabase
    .from('feedback')
    .select('rating, comment, created_at, client_id')
    .eq('trader_id', context.params.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (feedbackError) {
    return NextResponse.json({ error: { code: 'feedback_error', message: feedbackError.message } }, { status: 500 });
  }

  const clientIds = Array.from(new Set((feedback ?? []).map(f => f.client_id)));
  const { data: clients } = clientIds.length
    ? await supabase.from('profiles').select('user_id, display_name').in('user_id', clientIds)
    : { data: [] as any[] };

  const nameById = new Map((clients ?? []).map(c => [c.user_id, c.display_name]));

  return NextResponse.json({
    totals: {
      total_minutes: metrics?.total_minutes ?? 0,
      total_revenue: metrics?.total_revenue ?? '0',
      active_subscribers: metrics?.active_subscribers ?? 0,
    },
    last_feedback: (feedback ?? []).map(item => ({
      rating: item.rating,
      comment: item.comment,
      created_at: item.created_at,
      client_display_name: nameById.get(item.client_id) ?? 'Client',
    })),
  });
}

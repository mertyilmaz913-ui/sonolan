import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { BookingForm } from '../../../components/BookingForm';

interface Params { params: { id: string } }

export default async function TraderDetailPage({ params }: Params) {
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, display_name, bio, avatar_url, is_public, role')
    .eq('user_id', params.id)
    .maybeSingle();
  if (!profile || profile.role !== 'trader') notFound();

  const { data: trader } = await supabase
    .from('traders')
    .select('price_per_minute, rating, categories')
    .eq('user_id', params.id)
    .maybeSingle();
  if (!trader) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isOwn = !!user && user.id === params.id;
  if (!profile.is_public && !isOwn) notFound();

  const { data: feedback } = await supabase
    .from('feedback')
    .select('id, rating, comment, created_at, client_id')
    .eq('trader_id', params.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const clientMap = new Map<string, string>();
  if (feedback?.length) {
    const unique = Array.from(new Set(feedback.map(f => f.client_id)));
    const { data: clients } = await supabase
      .from('profiles').select('user_id, display_name').in('user_id', unique);
    clients?.forEach(c => clientMap.set(c.user_id, c.display_name));
  }

  return (
    <div className="space-y-8">
      <article className="card space-y-4">
        {isOwn && (
          <div className="rounded-lg border border-sky-500/50 bg-sky-900/20 p-3 text-sm text-sky-300">
            <p>👤 Bu sizin profiliniz. Client'lar profilinizi böyle görüyor{!profile.is_public && ' (Şu anda profiliniz gizli)' }.</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">{profile.display_name}</h1>
          <p className="text-sm text-slate-300">{profile.bio ?? 'Henüz bio eklenmemiş.'}</p>
          <p className="text-sm text-slate-300">
            Ücret: ${parseFloat(String(trader.price_per_minute)).toFixed(2)} /dakika · Puan {parseFloat(String(trader.rating)).toFixed(1)}
          </p>
          <p className="text-xs text-slate-400">Kategoriler: {trader.categories?.length ? trader.categories.join(', ') : '—'}</p>
        </div>

        {isOwn ? (
          <div className="rounded-lg border border-dashed border-slate-600 p-4 text-sm text-slate-300">
            <p>Kendi profilinize rezervasyon yapamazsınız.</p>
          </div>
        ) : user ? (
          profile.role === 'trader' ? (
            <div className="rounded-lg border border-dashed border-slate-600 p-4 text-sm text-slate-300">
              Trader olarak başka trader'lara rezervasyon yapamazsınız.
            </div>
          ) : (
            <BookingForm traderId={profile.user_id} pricePerMinute={parseFloat(String(trader.price_per_minute))} />
          )
        ) : (
          <div className="rounded-lg border border-dashed border-slate-600 p-4 text-sm text-slate-300">
            <Link className="text-sky-400" href="/sign-in">Giriş yapın</Link> ve rezervasyon talebinde bulunun.
          </div>
        )}
      </article>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Son geri bildirimler</h2>
        {feedback?.length ? (
          <div className="space-y-3">
            {feedback.map(item => (
              <div key={item.id} className="card space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>{clientMap.get(item.client_id) ?? 'Anonim client'}</span>
                  <span>Puan {item.rating}/5</span>
                </div>
                {item.comment && <p className="text-sm text-slate-200">{item.comment}</p>}
                <p className="text-xs text-slate-500">
                  {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at))}
                </p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-300">Henüz geri bildirim yok.</p>}
      </section>
    </div>
  );
}

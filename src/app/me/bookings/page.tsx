import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

interface SearchParams { success?: string; }
export default async function MyBookingsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).maybeSingle();
  if (profile?.role !== 'client') {
    return (
      <div className="card space-y-2">
        <h1 className="text-2xl font-semibold">Rezervasyonlarım</h1>
        <p className="text-sm text-slate-300">Rezervasyonları görmek için rolünüzü client olarak değiştirin.</p>
        <Link className="btn-secondary" href="/traders">Trader'ları incele</Link>
      </div>
    );
  }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, trader_id, minutes, status, estimated_cost, scheduled_at, created_at, note')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const { data: traderProfiles } = await supabase
    .from('profiles').select('user_id, display_name')
    .in('user_id', (bookings ?? []).map(b => b.trader_id));

  const map = new Map<string, string>((traderProfiles ?? []).map(p => [p.user_id, p.display_name]));
  const fmt = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Rezervasyonlarım</h1>

      {searchParams.success === 'true' && (
        <div className="card bg-emerald-900/20 border-emerald-500/50">
          <p className="text-emerald-400">✓ Rezervasyon talebiniz başarıyla gönderildi! Trader onayını bekleyin.</p>
        </div>
      )}

      {!bookings?.length ? (
        <div className="card space-y-3">
          <p className="text-sm text-slate-300">Henüz rezervasyonunuz yok.</p>
          <Link className="btn-primary" href="/traders">Trader bul</Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Trader</th><th>Durum</th><th>Dakika</th><th>Tahmini maliyet</th><th>Oluşturulma</th><th>Planlanan</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td><Link className="text-sky-400" href={`/traders/${b.trader_id}`}>{map.get(b.trader_id) ?? 'Bilinmeyen trader'}</Link></td>
                  <td>
                    <span className={`badge ${
                      b.status === 'completed' ? 'bg-emerald-900/30 text-emerald-400' :
                      b.status === 'accepted'  ? 'bg-sky-900/30 text-sky-400'    :
                      b.status === 'pending'   ? 'bg-amber-900/30 text-amber-400' :
                      b.status === 'rejected'  ? 'bg-rose-900/30 text-rose-400'   :
                                                  'bg-slate-700/30 text-slate-400'
                    }`}>
                      {b.status === 'pending' ? 'Beklemede' :
                       b.status === 'accepted' ? 'Onaylandı' :
                       b.status === 'completed'? 'Tamamlandı' :
                       b.status === 'rejected' ? 'Reddedildi' :
                       b.status === 'cancelled'? 'İptal Edildi' : b.status}
                    </span>
                  </td>
                  <td>{b.minutes}</td>
                  <td>${parseFloat(String(b.estimated_cost)).toFixed(2)}</td>
                  <td>{fmt.format(new Date(b.created_at))}</td>
                  <td>{b.scheduled_at ? fmt.format(new Date(b.scheduled_at)) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

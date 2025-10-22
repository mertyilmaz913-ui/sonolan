// Public trader list with NO N+1: pull trader rows then profiles in a single IN() call.
import Link from 'next/link';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export default async function TradersListPage() {
  const supabase = await createSupabaseServerClient();

  const { data: traders } = await supabase.from('traders')
    .select('user_id, price_per_minute, rating, categories').order('rating', { ascending: false });

  const ids = (traders ?? []).map(t => t.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('user_id, display_name, is_public').in('user_id', ids)
    : { data: [] as any[] };

  const pub = new Map((profiles ?? []).filter(p => p.is_public).map(p => [p.user_id, p]));
  const list = (traders ?? []).filter(t => pub.has(t.user_id));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Trader'lar</h1>
      {!list.length ? <p className="text-sm text-slate-300">Henüz trader yok.</p> : (
        <ul className="grid gap-3">
          {list.map(t => {
            const p = pub.get(t.user_id)!;
            return (
              <li key={t.user_id} className="card flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{p.display_name}</h3>
                  <p className="text-sm text-slate-400">
                    ${parseFloat(String(t.price_per_minute)).toFixed(2)}/dk · {parseFloat(String(t.rating)).toFixed(1)}/5
                  </p>
                </div>
                <Link className="btn-primary" href={`/traders/${t.user_id}`}>Görüntüle</Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { bookingSchema } from '../lib/validation';

interface BookingFormProps {
  traderId: string;
  pricePerMinute: number;
}

export function BookingForm({ traderId, pricePerMinute }: BookingFormProps) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(30);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimatedCost = (minutes * pricePerMinute).toFixed(2);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsed = bookingSchema.safeParse({ traderId, minutes, note: note.trim() || undefined });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? 'Geçersiz istek');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    setLoading(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setError(payload?.error?.message ?? 'Rezervasyon oluşturulamadı');
      return;
    }

    // success: go to bookings
    router.push('/me/bookings?success=true');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="minutes">Süre (dakika)</label>
        <input
          id="minutes"
          type="number"
          min={5}
          max={240}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          required
        />
      </div>

      <div>
        <label htmlFor="note">Not (opsiyonel)</label>
        <textarea
          id="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Görüşmek istediğiniz konular..."
        />
      </div>

      <p className="text-sm text-slate-300">Tahmini maliyet: ${estimatedCost}</p>
      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Gönderiliyor…' : 'Rezervasyon talebi gönder'}
      </button>
    </form>
  );
}

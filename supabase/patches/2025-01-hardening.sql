-- INDEXES (performance)
create index if not exists idx_bookings_trader on bookings(trader_id);
create index if not exists idx_bookings_client on bookings(client_id);
create index if not exists idx_feedback_trader on feedback(trader_id);
create index if not exists idx_subscribers_trader_user on subscribers(trader_id, user_id);

-- RLS for view: trader_dashboard_metrics
drop policy if exists "Traders view own metrics" on trader_dashboard_metrics;
create policy "Traders view own metrics" on trader_dashboard_metrics
  for select using ( auth.uid() = trader_id );

-- Rating triggers
create or replace function update_trader_rating() returns trigger as $$
begin
  update traders
     set rating = (select round(avg(rating)::numeric, 2) from feedback where trader_id = new.trader_id)
   where user_id = new.trader_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_feedback_insert on feedback;
create trigger on_feedback_insert after insert on feedback for each row execute function update_trader_rating();

drop trigger if exists on_feedback_update on feedback;
create trigger on_feedback_update after update on feedback for each row execute function update_trader_rating();

-- Booking status transition enforcement
drop policy if exists "Clients cancel own booking" on bookings;
create policy "Clients cancel pending bookings" on bookings
  for update using (
    auth.uid() = client_id and status = 'pending'
  ) with check (
    auth.uid() = client_id and status = 'cancelled'
  );

drop policy if exists "Traders manage assigned bookings" on bookings;
create policy "Traders update booking status" on bookings
  for update using ( auth.uid() = trader_id )
  with check (
    auth.uid() = trader_id and (
      (status = 'accepted' and (select status from bookings b where b.id = bookings.id) = 'pending') or
      (status = 'rejected' and (select status from bookings b where b.id = bookings.id) = 'pending') or
      (status = 'completed' and (select status from bookings b where b.id = bookings.id) = 'accepted')
    )
  );

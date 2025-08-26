create table if not exists public.chessboard_rates_mapping (
  chessboard_id uuid not null references public.chessboard(id) on delete cascade,
  rate_id uuid not null references public.rates(id) on delete cascade,
  primary key (chessboard_id, rate_id)
);

create index if not exists idx_chessboard_rates_mapping_chessboard_id
  on public.chessboard_rates_mapping (chessboard_id);
create index if not exists idx_chessboard_rates_mapping_rate_id
  on public.chessboard_rates_mapping (rate_id);

grant all on table public.chessboard_rates_mapping to anon;
grant all on table public.chessboard_rates_mapping to authenticated;
grant all on table public.chessboard_rates_mapping to service_role;

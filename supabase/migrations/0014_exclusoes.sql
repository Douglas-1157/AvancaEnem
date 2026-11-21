-- Registro das exclusões de alunos e da equipe, com a justificativa dada pela gestão.
-- A gravação é feita pelo servidor (service role); só a gestão consegue ler.
create table if not exists exclusoes (
  id uuid primary key default gen_random_uuid(),
  pessoa_nome text not null,
  papel papel not null,
  turma_nome text,
  motivo text not null check (length(motivo) between 5 and 500),
  excluido_por uuid references profiles(id) on delete set null,
  excluido_por_nome text,
  created_at timestamptz not null default now()
);
create index if not exists exclusoes_data on exclusoes (created_at desc);
alter table exclusoes enable row level security;
drop policy if exists exclusoes_gestao on exclusoes;
create policy exclusoes_gestao on exclusoes for select to authenticated using (eh_gestao());

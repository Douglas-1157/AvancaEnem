-- Arquivar questões.
alter table questoes add column if not exists arquivada boolean not null default false;

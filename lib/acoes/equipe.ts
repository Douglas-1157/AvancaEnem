'use server';
import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '../supabase/server';
import { supabaseAdmin } from '../supabase/admin';
import type { Estado } from '@/components/Form';
import { enviarEmail, esc } from '../emails';
import { emailDoUsuario } from '../destinatarios';

const ok = (msg = 'Salvo.'): Estado => ({ ok: true, msg });
const no = (msg: string): Estado => ({ ok: false, msg });
const txt = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string, d = 0) => { const n = Number(fd.get(k)); return Number.isFinite(n) && n > 0 ? n : d; };

async function equipe() {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: p } = await db.from('profiles').select('id,papel,status').eq('id', user.id).single();
  if (!p || p.status !== 'ativo' || p.papel === 'aluno') return null;
  return { db, id: p.id as string, papel: p.papel as 'professor' | 'gestao' };
}
async function gestao() { const e = await equipe(); return e && e.papel === 'gestao' ? e : null; }

// Competência: usa a escolhida na lista ou cria uma nova a partir do texto digitado.
async function resolverCompetencia(db: any, fd: FormData, disciplinaId: string): Promise<string | null> {
  const novo = txt(fd, 'competencia_nova').slice(0, 80);
  if (!novo) return txt(fd, 'competencia_id') || null;
  const { data: d } = await db.from('disciplinas').select('area').eq('id', disciplinaId).single();
  if (!d) return null;
  const { data: ex } = await db.from('competencias').select('id').eq('area', d.area).ilike('nome', novo.replace(/[%_\\]/g, m => '\\' + m)).limit(1).maybeSingle();
  if (ex) return ex.id;
  const { count } = await db.from('competencias').select('id', { count: 'exact', head: true }).eq('area', d.area);
  for (let i = 0; i < 5; i++) {
    const { data } = await db.from('competencias').insert({ area: d.area, codigo: 'P' + ((count ?? 0) + 1 + i), nome: novo }).select('id').single();
    if (data) return data.id;
  }
  return null;
}

// ---------- Conteúdo ----------
export async function publicarItem(_: Estado, fd: FormData): Promise<Estado> {
  const e = await equipe(); if (!e) return no('Sem permissão.');
  const { db } = e;
  const disciplina = txt(fd, 'disciplina_id'), tipo = txt(fd, 'tipo'), titulo = txt(fd, 'titulo');
  const turmas = fd.getAll('turmas').map(String);
  if (!disciplina || !titulo || !['video', 'pdf'].includes(tipo)) return no('Preencha disciplina, tipo e título.');
  if (!turmas.length) return no('Escolha ao menos uma turma.');
  let moduloId = txt(fd, 'modulo_id');
  const novoModulo = txt(fd, 'modulo_novo');
  if (novoModulo) {
    const { count } = await db.from('modulos').select('id', { count: 'exact', head: true }).eq('disciplina_id', disciplina);
    const { data: m, error } = await db.from('modulos').insert({ disciplina_id: disciplina, nome: novoModulo, ordem: (count ?? 0) + 1 }).select('id').single();
    if (error) return no(error.message); moduloId = m.id;
  }
  if (!moduloId) return no('Escolha um módulo ou crie um novo.');
  let url: string | null = txt(fd, 'url') || null, arquivo: string | null = null;
  if (tipo === 'video' && !url) return no('Cole o link do vídeo (YouTube).');
  if (url && !/^https?:\/\//.test(url)) return no('O link precisa começar com http:// ou https://');
  const file = fd.get('arquivo');
  if (tipo === 'pdf' && file instanceof File && file.size > 0) {
    if (file.type !== 'application/pdf') return no('Envie o arquivo em PDF.');
    if (file.size > 10 * 1024 * 1024) return no(`Esse PDF tem ${(file.size / 1048576).toFixed(1)} MB e o limite é 10 MB. Comprima em ilovepdf.com ou smallpdf.com e envie de novo.`);
    if (new TextDecoder().decode(new Uint8Array(await file.slice(0, 5).arrayBuffer())) !== '%PDF-') return no('Esse arquivo não é um PDF válido.');
    arquivo = `apostilas/${crypto.randomUUID()}.pdf`;
    const up = await db.storage.from('conteudo').upload(arquivo, file, { contentType: 'application/pdf' });
    if (up.error) return no('Falha ao enviar o PDF: ' + up.error.message);
  } else if (tipo === 'pdf' && !url) return no('Anexe o PDF da apostila ou cole um link.');
  const { count: n } = await db.from('itens').select('id', { count: 'exact', head: true }).eq('modulo_id', moduloId);
  const { data: item, error } = await db.from('itens').insert({
    modulo_id: moduloId, tipo, titulo, minutos: num(fd, 'minutos', 20), competencia_id: await resolverCompetencia(db, fd, disciplina),
    url, arquivo_path: arquivo, ordem: (n ?? 0) + 1, criado_por: e.id,
  }).select('id').single();
  if (error) return no(error.message);
  const prazo = txt(fd, 'prazo') || null;
  const { error: e2 } = await db.from('item_turmas').insert(turmas.map(t => ({ item_id: item.id, turma_id: t, prazo })));
  if (e2) return no(e2.message);
  revalidatePath('/professor/conteudo');
  return ok('Publicado para as turmas escolhidas.');
}
export async function alternarPublicacao(itemId: string, publicado: boolean) {
  const e = await equipe(); if (!e) return;
  await e.db.from('itens').update({ publicado }).eq('id', itemId);
  revalidatePath('/professor/conteudo');
}
export async function apagarItem(itemId: string) {
  const e = await equipe(); if (!e) return;
  await e.db.from('itens').delete().eq('id', itemId);
  revalidatePath('/professor/conteudo');
}
export async function criarRecurso(_: Estado, fd: FormData): Promise<Estado> {
  const e = await equipe(); if (!e) return no('Sem permissão.');
  const url = txt(fd, 'url'); if (!/^https?:\/\//.test(url)) return no('O link precisa começar com http:// ou https://');
  const { error } = await e.db.from('recursos').insert({ tipo: txt(fd, 'tipo'), categoria: txt(fd, 'categoria') || 'Geral', titulo: txt(fd, 'titulo'), descricao: txt(fd, 'descricao') || null, carga: txt(fd, 'carga') || null, url, criado_por: e.id });
  if (error) return no(error.message);
  revalidatePath('/professor/conteudo'); return ok('Adicionado à biblioteca.');
}
export async function apagarRecurso(id: string) { const e = await equipe(); if (!e) return; await e.db.from('recursos').delete().eq('id', id); revalidatePath('/professor/conteudo'); }

// Envia uma imagem de questão (enunciado ou comentário) para o bucket público "questoes".
const TIPOS_IMG: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
async function enviarImagem(db: any, fd: FormData, campo: string): Promise<{ url: string | null; erro?: string }> {
  const file = fd.get(campo);
  if (!(file instanceof File) || file.size === 0) return { url: null };
  const ext = TIPOS_IMG[file.type];
  if (!ext) return { url: null, erro: 'A imagem precisa ser PNG, JPG, WEBP ou GIF.' };
  if (file.size > 4 * 1024 * 1024) return { url: null, erro: `Essa imagem tem ${(file.size / 1048576).toFixed(1)} MB e o limite é 4 MB. Reduza o tamanho e envie de novo.` };
  // Confere o conteúdo real do arquivo (o tipo informado pelo navegador pode ser falso).
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  const real = (b[0] === 0x89 && ascii(1, 3) === 'PNG') ? 'png' : (b[0] === 0xff && b[1] === 0xd8) ? 'jpg' : (ascii(0, 3) === 'GIF') ? 'gif' : (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') ? 'webp' : '';
  if (real !== ext) return { url: null, erro: 'Esse arquivo não é uma imagem válida (PNG, JPG, WEBP ou GIF).' };
  const caminho = `${crypto.randomUUID()}.${ext}`;
  const up = await db.storage.from('questoes').upload(caminho, file, { contentType: file.type });
  if (up.error) return { url: null, erro: 'Falha ao enviar a imagem: ' + up.error.message };
  return { url: db.storage.from('questoes').getPublicUrl(caminho).data.publicUrl };
}

// ---------- Questões e simulados ----------
export async function criarQuestao(_: Estado, fd: FormData): Promise<Estado> {
  const e = await equipe(); if (!e) return no('Sem permissão.');
  const alts = [0, 1, 2, 3, 4].map(i => txt(fd, `alt${i}`)).filter(Boolean);
  const correta = Number(fd.get('correta'));
  if (alts.length < 2) return no('Informe ao menos duas alternativas.');
  if (!(correta >= 0 && correta < alts.length)) return no('Marque a alternativa correta.');
  const img = await enviarImagem(e.db, fd, 'imagem'); if (img.erro) return no(img.erro);
  const imgC = await enviarImagem(e.db, fd, 'comentario_imagem'); if (imgC.erro) return no(imgC.erro);
  const { error } = await e.db.from('questoes').insert({
    disciplina_id: txt(fd, 'disciplina_id'), competencia_id: await resolverCompetencia(e.db, fd, txt(fd, 'disciplina_id')), enunciado: txt(fd, 'enunciado'),
    alternativas: alts, correta, comentario: txt(fd, 'comentario') || null, criado_por: e.id,
    imagem_url: img.url, comentario_imagem_url: imgC.url,
  });
  if (error) return no(error.message);
  revalidatePath('/professor/banco'); return ok('Questão adicionada ao banco.');
}
// Exclui de vez. Se a questão já foi usada em simulado (ou respondida), o banco impede: nesse caso, arquive.
export async function excluirQuestao(id: string): Promise<Estado> {
  const e = await equipe(); if (!e) return no('Sem permissão.');
  const { error } = await e.db.from('questoes').delete().eq('id', id);
  if (error) return no(error.code === '23503' ? 'Esta questão já está em um simulado e não pode ser excluída. Use Arquivar.' : 'Não foi possível excluir.');
  revalidatePath('/professor/banco'); return ok('Questão excluída.');
}
export async function apagarQuestao(id: string) { const e = await equipe(); if (!e) return; await e.db.from('questoes').delete().eq('id', id); revalidatePath('/professor/banco'); }

// Edita uma questão. Imagem: nova substitui, "remover" apaga, sem nada mantém a atual.
export async function editarQuestao(_: Estado, fd: FormData): Promise<Estado> {
  const e = await equipe(); if (!e) return no('Sem permissão.');
  const id = txt(fd, 'id'); if (!id) return no('Questão não encontrada.');
  const alts = [0, 1, 2, 3, 4].map(i => txt(fd, `alt${i}`)).filter(Boolean);
  const correta = Number(fd.get('correta'));
  if (alts.length < 2) return no('Informe ao menos duas alternativas.');
  if (!(correta >= 0 && correta < alts.length)) return no('Marque a alternativa correta.');
  const upd: Record<string, unknown> = {
    disciplina_id: txt(fd, 'disciplina_id'), competencia_id: await resolverCompetencia(e.db, fd, txt(fd, 'disciplina_id')),
    enunciado: txt(fd, 'enunciado'), alternativas: alts, correta, comentario: txt(fd, 'comentario') || null,
  };
  for (const [campo, coluna] of [['imagem', 'imagem_url'], ['comentario_imagem', 'comentario_imagem_url']] as const) {
    const img = await enviarImagem(e.db, fd, campo); if (img.erro) return no(img.erro);
    if (img.url) upd[coluna] = img.url; else if (txt(fd, `remover_${campo}`) === '1') upd[coluna] = null;
  }
  const { error } = await e.db.from('questoes').update(upd).eq('id', id);
  if (error) return no(error.message);
  revalidatePath('/professor/banco'); return ok('Questão atualizada.');
}
export async function arquivarQuestao(id: string, arquivada: boolean) {
  const e = await equipe(); if (!e) return;
  await e.db.from('questoes').update({ arquivada }).eq('id', id);
  revalidatePath('/professor/banco');
}

// Sobe ou desce um item dentro do módulo (a ordem da trilha dos alunos).
export async function moverItem(itemId: string, dir: 'up' | 'down') {
  const e = await equipe(); if (!e) return;
  const { data: it } = await e.db.from('itens').select('id,modulo_id').eq('id', itemId).maybeSingle();
  if (!it) return;
  const { data: irmaos } = await e.db.from('itens').select('id').eq('modulo_id', it.modulo_id).order('ordem').order('created_at');
  const ids = (irmaos ?? []).map((x: any) => x.id as string);
  const i = ids.indexOf(itemId), j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((id, k) => e.db.from('itens').update({ ordem: k + 1 }).eq('id', id)));
  revalidatePath('/professor/conteudo'); revalidatePath('/aluno', 'layout');
}

// Gestão define uma nova senha provisória para alguém; a pessoa cria a própria no próximo acesso.
export async function redefinirSenhaUsuario(_: Estado, fd: FormData): Promise<Estado> {
  const e = await gestao(); if (!e) return no('Apenas a gestão redefine senhas.');
  const alvo = txt(fd, 'usuario'), senha = String(fd.get('senha') ?? '');
  if (!alvo) return no('Escolha a pessoa.');
  if (senha.length < 8) return no('A senha provisória precisa ter 8 ou mais caracteres.');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return no('Falta configurar SUPABASE_SERVICE_ROLE_KEY no servidor.');
  const { error } = await supabaseAdmin().auth.admin.updateUserById(alvo, { password: senha, app_metadata: { trocar_senha: true } });
  if (error) return no('Não foi possível redefinir a senha. Tente de novo.');
  return ok('Senha redefinida. Passe a senha provisória à pessoa: ela vai criar a própria ao entrar.');
}

export async function criarSimulado(_: Estado, fd: FormData): Promise<Estado> {
  const e = await equipe(); if (!e) return no('Sem permissão.');
  const { db } = e;
  const qs = fd.getAll('questoes').map(String), turmas = fd.getAll('turmas').map(String), titulo = txt(fd, 'titulo');
  if (!titulo) return no('Dê um título ao simulado.');
  if (!qs.length) return no('Selecione ao menos uma questão.');
  if (!turmas.length) return no('Escolha ao menos uma turma.');
  // o professor informa o tempo POR QUESTÃO; o total do simulado é calculado (questões × tempo), entre 5 e 300 min
  const porQuestao = Number(String(fd.get('tempo_questao') ?? '').replace(',', '.'));
  const minutos = porQuestao > 0 ? Math.min(300, Math.max(5, Math.ceil(porQuestao * qs.length))) : num(fd, 'minutos', 30);
  const { data: s, error } = await db.from('simulados').insert({ titulo, minutos, disciplina_id: txt(fd, 'disciplina_id') || null, criado_por: e.id }).select('id').single();
  if (error) return no(error.message);
  const prazo = txt(fd, 'prazo') || null;
  const r1 = await db.from('simulado_questoes').insert(qs.map((q, i) => ({ simulado_id: s.id, questao_id: q, ordem: i + 1 })));
  const r2 = await db.from('simulado_turmas').insert(turmas.map(t => ({ simulado_id: s.id, turma_id: t, prazo })));
  if (r1.error || r2.error) return no((r1.error ?? r2.error)!.message);
  // opcional: encaixa o simulado ao fim de um módulo da trilha (assim ele respeita a trava progressiva)
  const modulo = txt(fd, 'modulo_id');
  if (modulo) {
    const { count } = await db.from('itens').select('id', { count: 'exact', head: true }).eq('modulo_id', modulo);
    const { data: it, error: e3 } = await db.from('itens').insert({ modulo_id: modulo, tipo: 'sim', titulo, minutos, simulado_id: s.id, ordem: (count ?? 0) + 1, criado_por: e.id }).select('id').single();
    if (e3) return no(e3.message);
    await db.from('item_turmas').insert(turmas.map(t => ({ item_id: it.id, turma_id: t, prazo })));
  }
  revalidatePath('/professor/banco'); revalidatePath('/professor/conteudo');
  return ok('Simulado publicado para as turmas.');
}

// ---------- Dúvidas ----------
export async function responderDuvida(_: Estado, fd: FormData): Promise<Estado> {
  const e = await equipe(); if (!e) return no('Sem permissão.');
  const resposta = txt(fd, 'resposta'); if (resposta.length < 2) return no('Escreva a resposta.');
  const { error } = await e.db.from('duvidas').update({ resposta, status: 'respondida', visto_em: null, respondida_por: e.id, respondida_em: new Date().toISOString() }).eq('id', txt(fd, 'id'));
  if (error) return no(error.message);
  if (fd.get('salvar')) await e.db.from('respostas_salvas').insert({ professor_id: e.id, texto: resposta.slice(0, 1000) });
  revalidatePath('/professor/duvidas'); return ok('Resposta enviada.');
}
export async function apagarSalva(id: string) { const e = await equipe(); if (!e) return; await e.db.from('respostas_salvas').delete().eq('id', id); revalidatePath('/professor/duvidas'); }

// ---------- Redação ----------
export async function criarTemaRedacao(_: Estado, fd: FormData): Promise<Estado> {
  const e = await equipe(); if (!e) return no('Sem permissão.');
  const turmas = fd.getAll('turmas').map(String); if (!turmas.length) return no('Escolha ao menos uma turma.');
  const { data: t, error } = await e.db.from('redacao_temas').insert({ titulo: txt(fd, 'titulo'), enunciado: txt(fd, 'enunciado') || null, prazo: txt(fd, 'prazo') || null, criado_por: e.id }).select('id').single();
  if (error) return no(error.message);
  const r = await e.db.from('redacao_tema_turmas').insert(turmas.map(x => ({ tema_id: t.id, turma_id: x })));
  if (r.error) return no(r.error.message);
  revalidatePath('/professor/redacoes'); return ok('Tema publicado.');
}
export async function corrigirRedacao(_: Estado, fd: FormData): Promise<Estado> {
  const e = await equipe(); if (!e) return no('Sem permissão.');
  const c = [1, 2, 3, 4, 5].map(i => Number(fd.get(`c${i}`)));
  if (c.some(v => !Number.isInteger(v) || v < 0 || v > 200 || v % 40 !== 0)) return no('Escolha uma nota de 0 a 200 para cada competência.');
  const { error } = await e.db.from('redacoes').update({ c1: c[0], c2: c[1], c3: c[2], c4: c[3], c5: c[4], comentario: txt(fd, 'comentario') || null, status: 'corrigida', corretor_id: e.id }).eq('id', txt(fd, 'id'));
  if (error) return no(error.message);
  revalidatePath('/professor/redacoes', 'layout'); return ok('Correção enviada ao aluno.');
}

// ---------- Gestão ----------
export async function decidirCadastro(id: string, aprovar: boolean) {
  const e = await gestao(); if (!e) return;
  const { data: alvo } = await e.db.from('profiles').select('nome,status').eq('id', id).single();
  const { error } = await e.db.from('profiles').update({ status: aprovar ? 'ativo' : 'recusado' }).eq('id', id);
  if (!error && alvo && aprovar && alvo.status !== 'ativo') {
    after(async () => {
      const to = await emailDoUsuario(id);
      if (to) await enviarEmail({ to, subject: 'Seu acesso ao Avança ENEM foi liberado', html: `<p>Olá, ${esc(alvo.nome)}!</p><p>A gestão autorizou o seu acesso. Já é possível entrar no Avança ENEM com o seu e-mail e a senha cadastrada.</p>` });
    });
  }
  revalidatePath('/gestao', 'layout');
}
export async function criarTurma(_: Estado, fd: FormData): Promise<Estado> {
  const e = await gestao(); if (!e) return no('Apenas a gestão cria turmas.');
  const { error } = await e.db.from('turmas').insert({ nome: txt(fd, 'nome'), turno: txt(fd, 'turno') || null });
  if (error) return no(error.message.includes('unique') ? 'Já existe uma turma com esse nome.' : error.message);
  revalidatePath('/gestao', 'layout'); return ok('Turma criada.');
}
export async function alternarTrava(turmaId: string, ligada: boolean) {
  const e = await gestao(); if (!e) return;
  await e.db.from('turmas').update({ trava_progressiva: ligada }).eq('id', turmaId);
  revalidatePath('/gestao', 'layout'); revalidatePath('/aluno', 'layout');
}
export async function editarTurma(_: Estado, fd: FormData): Promise<Estado> {
  const e = await gestao(); if (!e) return no('Sem permissão.');
  const id = txt(fd, 'id'), nome = txt(fd, 'nome');
  if (!id || !nome) return no('Informe o nome da turma.');
  const { error } = await e.db.from('turmas').update({ nome, turno: txt(fd, 'turno') || null }).eq('id', id);
  if (error) return no(error.message.includes('duplicate') || error.code === '23505' ? 'Já existe uma turma com esse nome.' : 'Não foi possível salvar.');
  revalidatePath('/gestao', 'layout'); revalidatePath('/aluno', 'layout'); return ok('Turma atualizada.');
}
// Excluir a turma NÃO apaga os alunos: eles ficam "sem turma". Os vínculos de publicação (aulas, simulados, redações) da turma saem.
export async function excluirTurma(id: string): Promise<Estado> {
  const e = await gestao(); if (!e) return no('Sem permissão.');
  const { error } = await e.db.from('turmas').delete().eq('id', id);
  if (error) return no('Não foi possível excluir a turma.');
  revalidatePath('/gestao', 'layout'); revalidatePath('/professor', 'layout'); revalidatePath('/aluno', 'layout'); return ok('Turma excluída.');
}
export async function moverAluno(_: Estado, fd: FormData): Promise<Estado> {
  try {
    const e = await gestao(); if (!e) return no('Sem permissão.');
    const turma = txt(fd, 'turma_id') || null; // vazio = deixar sem turma
    const { data, error } = await e.db.from('profiles').update({ turma_id: turma }).eq('id', txt(fd, 'id')).eq('papel', 'aluno').select('id');
    if (error) return no('Não foi possível mudar a turma: ' + error.message);
    if (!data?.length) return no('Aluno não encontrado ou sem permissão para mudar.');
    revalidatePath('/gestao', 'layout'); revalidatePath('/aluno', 'layout');
    return ok(turma ? 'Turma atualizada.' : 'Aluno agora está sem turma.');
  } catch { return no('Algo deu errado ao mudar a turma. Tente de novo.'); }
}
// Edita nome, cargo, disciplina e (para professor) as turmas em que leciona.
export async function editarPessoa(_: Estado, fd: FormData): Promise<Estado> {
  const e = await gestao(); if (!e) return no('Apenas a gestão edita a equipe.');
  const id = txt(fd, 'id'), nome = txt(fd, 'nome');
  if (!id || nome.length < 2) return no('Informe o nome.');
  const { data: alvo } = await e.db.from('profiles').select('id,papel').eq('id', id).in('papel', ['professor', 'gestao']).maybeSingle();
  if (!alvo) return no('Pessoa não encontrada.');
  const pedido = txt(fd, 'papel');
  const papel = pedido === 'gestao' || pedido === 'professor' ? pedido : alvo.papel;
  if (id === e.id && papel !== alvo.papel) return no('Você não pode mudar o seu próprio cargo.');
  const { error } = await e.db.from('profiles').update({ nome: nome.slice(0, 120), papel, disciplina_id: txt(fd, 'disciplina_id') || null }).eq('id', id);
  if (error) return no('Não foi possível salvar.');
  if (papel === 'professor') {
    const turmas = fd.getAll('turmas').map(String).filter(Boolean);
    const { error: e1 } = await e.db.from('professor_turmas').delete().eq('professor_id', id);
    if (e1) return no('Salvou os dados, mas não as turmas. Tente de novo.');
    if (turmas.length) { const { error: e2 } = await e.db.from('professor_turmas').insert(turmas.map(t => ({ professor_id: id, turma_id: t }))); if (e2) return no('Salvou os dados, mas não as turmas. Tente de novo.'); }
  }
  revalidatePath('/gestao', 'layout'); revalidatePath('/professor', 'layout');
  return ok('Dados atualizados.');
}
// Exclui aluno ou membro da equipe. Só acontece com justificativa, que fica registrada na tabela "exclusoes".
export async function excluirPessoa(_: Estado, fd: FormData): Promise<Estado> {
  const e = await gestao(); if (!e) return no('Apenas a gestão exclui pessoas.');
  const id = txt(fd, 'id'), motivo = txt(fd, 'motivo');
  if (!id) return no('Pessoa não encontrada.');
  if (motivo.length < 5) return no('Escreva a justificativa da exclusão (pelo menos 5 caracteres).');
  if (id === e.id) return no('Você não pode excluir a si mesmo.');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return no('Falta configurar SUPABASE_SERVICE_ROLE_KEY no servidor.');
  const admin = supabaseAdmin();
  const { data: alvo } = await admin.from('profiles').select('id,nome,papel,turmas!profiles_turma_id_fkey(nome)').eq('id', id).maybeSingle();
  if (!alvo) return no('Pessoa não encontrada (talvez já tenha sido excluída).');
  if (alvo.papel === 'gestao') {
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('papel', 'gestao').eq('status', 'ativo').neq('id', id);
    if (!count) return no('Não dá para excluir a única pessoa da gestão.');
  }
  const { data: eu } = await e.db.from('profiles').select('nome').eq('id', e.id).single();
  // Registra a justificativa antes; se a exclusão falhar, o registro é desfeito.
  const { data: log, error: eLog } = await admin.from('exclusoes').insert({
    pessoa_nome: alvo.nome, papel: alvo.papel, turma_nome: (alvo as any).turmas?.nome ?? null, motivo: motivo.slice(0, 500), excluido_por: e.id, excluido_por_nome: eu?.nome ?? null,
  }).select('id').single();
  if (eLog || !log) return no('Não foi possível registrar a justificativa. Rode a migração 0014 no Supabase e tente de novo.');
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) { await admin.from('exclusoes').delete().eq('id', log.id); return no('Não foi possível excluir. Tente de novo.'); }
  revalidatePath('/gestao', 'layout'); revalidatePath('/professor', 'layout');
  return ok(`${alvo.nome} foi excluído(a).`);
}
// Cria a conta de um professor (a gestão define uma senha provisória e repassa).
export async function criarProfessor(_: Estado, fd: FormData): Promise<Estado> {
  const e = await gestao(); if (!e) return no('Apenas a gestão cadastra professores.');
  const email = txt(fd, 'email').toLowerCase(), nome = txt(fd, 'nome'), senha = String(fd.get('senha') ?? '');
  if (!nome || !/^\S+@\S+\.\S+$/.test(email) || senha.length < 8) return no('Informe nome, e-mail e uma senha provisória de 8+ caracteres.');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return no('Falta configurar SUPABASE_SERVICE_ROLE_KEY no servidor.');
  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome }, app_metadata: { trocar_senha: true } });
  if (error || !data.user) return no(error?.message ?? 'Não foi possível criar a conta.');
  const { error: e2 } = await admin.from('profiles').update({ papel: fd.get('gestao') ? 'gestao' : 'professor', status: 'ativo', disciplina_id: txt(fd, 'disciplina_id') || null }).eq('id', data.user.id);
  if (e2) return no(e2.message);
  revalidatePath('/gestao', 'layout'); return ok('Conta criada. Passe o e-mail e a senha provisória à pessoa.');
}

// Define as turmas em que um professor leciona (substitui a lista anterior).
export async function definirTurmasProfessor(_: Estado, fd: FormData): Promise<Estado> {
  const e = await gestao(); if (!e) return no('Apenas a gestão define isso.');
  const prof = txt(fd, 'professor_id'); if (!prof) return no('Escolha o professor.');
  const turmas = fd.getAll('turmas').map(String).filter(Boolean);
  const { error: e0 } = await e.db.from('profiles').update({ disciplina_id: txt(fd, 'disciplina_id') || null }).eq('id', prof);
  if (e0) return no(e0.message);
  const { error: e1 } = await e.db.from('professor_turmas').delete().eq('professor_id', prof);
  if (e1) return no(e1.message);
  if (turmas.length) { const { error } = await e.db.from('professor_turmas').insert(turmas.map(t => ({ professor_id: prof, turma_id: t }))); if (error) return no(error.message); }
  revalidatePath('/gestao', 'layout'); revalidatePath('/professor', 'layout');
  return ok(turmas.length ? 'Disciplina e turmas atualizadas.' : 'Sem turmas marcadas: o professor não verá nenhuma turma.');
}


// Divide uma linha de CSV respeitando campos entre aspas (ex.: "Silva, João").
function campos(linha: string, sep: string): string[] {
  const out: string[] = []; let atual = ''; let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') { if (aspas && linha[i + 1] === '"') { atual += '"'; i++; } else aspas = !aspas; }
    else if (ch === sep && !aspas) { out.push(atual.trim()); atual = ''; }
    else atual += ch;
  }
  out.push(atual.trim()); return out;
}

// Senha provisória aleatória (sem letras parecidas como 0/O e l/1), única para cada pessoa.
function senhaProvisoria(n = 10): string {
  const al = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = crypto.getRandomValues(new Uint32Array(n));
  return Array.from(b, x => al[x % al.length]).join('');
}

// Importa alunos de uma planilha salva como CSV (colunas: nome, email, matricula, turma).
export async function importarAlunos(_: Estado, fd: FormData): Promise<Estado> {
  const e = await gestao(); if (!e) return no('Apenas a gestão importa alunos.');
  const arq = fd.get('arquivo');
  if (!(arq instanceof File) || !arq.size) return no('Escolha o arquivo CSV.');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return no('Falta configurar SUPABASE_SERVICE_ROLE_KEY no servidor.');
  const bytes = new Uint8Array(await arq.arrayBuffer());
  let texto = new TextDecoder('utf-8').decode(bytes);
  if (texto.includes('\uFFFD')) texto = new TextDecoder('windows-1252').decode(bytes); // CSV do Excel em ANSI
  texto = texto.replace(/^\uFEFF/, '');
  const linhas = texto.split(/\r?\n/).filter(l => l.trim());
  if (linhas.length < 2) return no('O arquivo precisa do cabeçalho e de pelo menos um aluno.');
  const sep = linhas[0].split(';').length > linhas[0].split(',').length ? ';' : ',';
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const cab = campos(linhas[0], sep).map(norm);
  const col = (n: string) => cab.indexOf(n);
  const [iN, iE, iM, iT] = [col('nome'), col('email'), col('matricula'), col('turma')];
  if (iN < 0 || iE < 0) return no('O cabeçalho precisa ter as colunas "nome" e "email" (e, se quiser, "matricula" e "turma").');
  if (linhas.length - 1 > 300) return no('Máximo de 300 alunos por arquivo. Divida em partes.');
  const { data: turmas } = await e.db.from('turmas').select('id,nome');
  const porNome = new Map((turmas ?? []).map(t => [norm(t.nome), t.id]));
  const admin = supabaseAdmin(); let criados = 0; const erros: string[] = []; const entregues: { nome: string; email: string; senha: string }[] = [];
  const um = async (i: number) => {
    const c = campos(linhas[i], sep);
    const nome = c[iN], email = c[iE]?.toLowerCase();
    if (!nome || !email || !/^\S+@\S+\.\S+$/.test(email)) { erros.push(`linha ${i + 1}: nome/e-mail inválido`); return; }
    const turma = iT >= 0 && c[iT] ? porNome.get(norm(c[iT])) : undefined;
    if (iT >= 0 && c[iT] && !turma) { erros.push(`linha ${i + 1}: turma "${c[iT]}" não existe`); return; }
    const senha = senhaProvisoria(); // cada aluno recebe a sua, diferente das outras
    const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome, matricula: iM >= 0 ? c[iM] : '', turma_id: turma ?? '' }, app_metadata: { trocar_senha: true } });
    if (error || !data.user) { erros.push(`linha ${i + 1}: ${/already|registered/i.test(error?.message ?? '') ? 'e-mail já cadastrado' : error?.message}`); return; }
    await admin.from('profiles').update({ status: 'ativo' }).eq('id', data.user.id);
    entregues.push({ nome, email, senha }); criados++;
  };
  for (let i = 1; i < linhas.length; i += 5) {
    await Promise.all(Array.from({ length: Math.min(5, linhas.length - i) }, (_, k) => um(i + k)));
  }
  revalidatePath('/gestao', 'layout');
  const resumo = `${criados} aluno(s) criado(s). Baixe a lista de senhas agora: ela não é mostrada de novo.`;
  const csv = criados ? ['nome;email;senha_provisoria', ...entregues.map(x => [x.nome, x.email, x.senha].map(v => `"${(/^[=+\-@\t\r]/.test(v) ? "'" + v : v).replace(/"/g, '""')}"`).join(';'))].join('\r\n') : undefined;
  const base = erros.length ? { ok: criados > 0, msg: `${resumo} Problemas: ${erros.slice(0, 8).join('; ')}${erros.length > 8 ? `… (+${erros.length - 8})` : ''}` } : ok(resumo);
  return { ...base, csv, arquivo: 'alunos-senhas-provisorias.csv' };
}

/**
 * NEON CRM — servidor v13.10.1 (multi-provedor WhatsApp: Evolution API | Uazapi).
 * Núcleo: contatos, deals, inbox WhatsApp, AI Gateway (OpenAI),
 * Prospecção Ativa (Google Places + disparo com guardrails).
 * v11: login no painel (Basic Auth) + persona de vendas + guarda de horário.
 * v12: agenda real (appointments), lembretes automáticos D-1/2h,
 *       transcrição de áudio (Whisper) direto no webhook.
 * v13: WHATSAPP_PROVIDER=evolution|uazapi (padrão: uazapi até migrar).
 *       Webhook aceita /webhooks/evolution e /webhooks/uazapi (mesmo handler).
 * v13.1: HTML sem cache no navegador (acabou o "painel velho" pós-Deploy).
 * v13.2: confirmação de agenda não duplica com a auto-resposta; lembretes
 *       e persona com emojis variados por contexto.
 * v13.3: ÁUDIO RESPONDE — transcrição segue o fluxo da IA; download de mídia
 *       com chave completa (Evolution); schema.sql sem dados-demo (não voltam
 *       mais no Deploy após limpeza).
 * v13.5: OPT-OUT LGPD — "SAIR" marca o contato (nunca mais recebe resposta
 *       automática nem disparo de prospecção) + PAINEL DE MÉTRICAS
 *       (/api/metrics + aba "Métricas" no painel).
 * v13.5.6: REATIVAR CONTATO — botão no painel desfaz o opt-out (ação humana,
 *       com reconsentimento — a porta de volta prevista em "se um dia mudar
 *       de ideia, estarei por aqui").
 * v13.6.2: OPT-OUT POR PALAVRAS-CHAVE — "STOP", "quero parar de receber
 *       mensagens de vocês", "me descadastra de tudo" agora derrubam a
 *       automação na hora (antes: só a frase exata, tipo "sair" sozinho —
 *       o teste de IA pegou essa brecha). + DETECÇÃO DE ESCALAÇÃO
 *       ("pessoa de verdade", gerente, pós-venda grave, concorrente):
 *       intent='escalacao' fica visível no painel pro Ailton correr pro
 *       inbox. Detetores moram na ai.js (detectOptOut/detectEscalation).
 * v13.9.1: MODO TRADUTOR — "quero o tradutor" liga a aula de idiomas com o
 *       Professor Bilíngue: responde preferindo ÁUDIO (voz TTS → sendAudio)
 *       e manda o TEXTO junto quando há correção (✅) ou tradução (🇧🇷).
 *       "sair do tradutor" desliga e devolve a Mariana. O modo é por conversa
 *       (Set em memória) e roda 24h — é o dono estudando, não spam. Opt-out
 *       e escalação continuam valendo ANTES dele.
 * v13.9.2: CORREÇÃO DA DUPLICAÇÃO — quando o áudio falha e a aula cai
 *       para texto, o texto sai UMA vez só (bandeira textEnviado); a
 *       mensagem de correção (✅/🇧🇷) só completa quando a VOZ saiu.
 * v13.9.3: ÁUDIO VIA URL — os logs provaram que esta Evolution não tem
 *       /message/sendAudio (404) e rejeita/quebra base64 no corpo
 *       ("Owned media must be a url or base64"). O CRM agora hospeda o
 *       mp3 do TTS por 5 min numa rota pública de token aleatório
 *       (GET /media/:token, sem login — como o webhook) e manda a URL
 *       no sendAudio. A voz lê SÓ a fala (linha 🇧🇷 fora, marcador ✅ fora).
 * v13.9.4: VELOCIDADE + MODO EMBAIXADOR — 1) LLMs em PARALELO
 *       (Promise.all: intenção + resposta num round-trip só — antes em
 *       fila, 2 esperas seguidas); 2) "digitando..." (sendPresence
 *       composing) na tela do cliente enquanto a IA pensa; 3) logs de
 *       tempo ("[ia] intenção + resposta prontas em X ms"); 4) MODO
 *       EMBAIXADOR: o dono manda a fala, polishEnglish corrige para
 *       inglês natural e speakWithClonedVoice devolve NA VOZ DELE
 *       (ElevenLabs) + notas ✅; 5) GUARD: "sair do tradutor/embaixador"
 *       NUNCA marca opt-out LGPD (bug real de 07/10); 6) 💜 removidos
 *       das mensagens fixas (regra do dono — vale também para sistema).
 * v13.10: WHITE-LABEL NO PAINEL — nome do negócio, nome da atendente,
 *       cores (primária, sidebar, fundo), mensagem de boas-vindas e
 *       persona extra da IA, tudo editável na aba Configurações e
 *       guardado na tabela app_settings (GET/POST /api/branding).
 * v13.10.1: TRANCO DE DESENVOLVEDOR — salvar marca (POST /api/branding)
 *       exige a senha do desenvolvedor (DEV_PASS no Environment) no header
 *       X-Dev-Pass; a rota /api/branding/unlock valida a senha sem salvar.
 *       O painel do cliente continua LENDO a marca (GET) para se pintar —
 *       mas NÃO edita: quem tem PANEL_PASS vê, quem tem DEV_PASS muda.
 * v13.11: IMPORTAÇÃO DO FORMULÁRIO DO CLIENTE — POST /api/branding/import
 *       recebe o JSON do formulário de configuração (enviado pelo cliente
 *       ao escritório) e formata o CRM num único passo: marca, persona,
 *       boas-vindas, cores e dados do negócio, gravados em app_settings.
 *       MESMA tranca do POST /api/branding: header X-Dev-Pass obrigatório
 *       — o cliente NUNCA importa; a operação é do escritório.
 * v13.12: AGENDA NO PAINEL — rotas /api/appointments para o painel ver e
 *       gerir a agenda que JÁ EXISTIA por baixo (v12: tabela appointments;
 *       v13.2: captura pela IA quando fecha horário na conversa; lembretes
 *       D-1 e 2h antes). GET lista (com cliente e conversa de origem),
 *       POST cria manual (acha/cria o contato e a conversa), PATCH muda
 *       horário/serviço/status, DELETE remove. Protegidas pelo login do
 *       painel (requirePanelAuth) — o cliente só vê o que a aba mostrar.
 * v13.13: CAPTURA COM CONTEXTO — a captura de agendamento (v13.2) só rodava
 *       quando a intenção da MENSAGEM era 'agendamento'; "Sim" e "amanhã às
 *       8h" não dizem agenda e a confirmação se perdia. Agora também roda
 *       quando as últimas mensagens carregam sinal de agenda (regex local,
 *       custo zero) — o parseAppointment continua sendo quem decide.
 * v13.15: CAPTURA À PROVA DE FALHA — normaliza a saída do parser ("16" →
 *       "16:00", "18/10" → ISO) + fallback LOCAL sem LLM (regex na última
 *       mensagem da cliente: "dia 18 as 16hrs", "amanhã às 8h", "sexta 10h")
 *       + log [agenda] captura avaliada (o EasyPanel mostra exatamente o que
 *       aconteceu). Só server.js muda; ai.js permanece v13.14-salão.
 * v13.16: TRAVA DE FUNCIONAMENTO + AGENDA REAL — o horário vem do campo
 *       "hours" do formulário/import (branding; padrão: terça a sábado,
 *       9h-19h). Antes de gravar, valida o slot: dia fechado, fora do
 *       horário ou horário já ocupado (appointments do dia, menos
 *       cancelados) -> NÃO grava e responde com AVISO + horários LIVRES
 *       (da agenda real). A IA também recebe os horários livres de
 *       hoje/amanhã (availabilitySummary) e só oferece o que existe.
 * v13.17: NADA EM SILÊNCIO + CONVENÇÃO DA TARDE — horário que já passou
 *       TAMBÉM responde (proximo slot livre; antes: silêncio total);
 *       "1h" a "6h" sem qualificador = TARDE (13h-18h), nunca madrugada
 *       ("1h da manhã" = 01:00, e a trava avisa); números por extenso
 *       ("três da tarde"); dia cheio -> sugere o PRÓXIMO dia com horários
 *       livres; sumário da IA passa a abrir com o horário de funcionamento.
 * v13.18: MODO DEV PARA DEMOS — POST /api/dev/wipe (trunca o histórico de
 *       atendimento) + GET /api/dev/debug (despejo completo). ANTES do
 *       middleware de login do painel — trancadas só pela DEV_PASS.
 * v13.19: CAPTURA À PROVA DE ALUCINAÇÃO — DIA+HORA explícitos na última
 *       mensagem: o parser LOCAL vence; slot repetido = "já está na agenda".
 * v13.20: GATE DA CAPTURA — só avalia quando a PRÓPRIA mensagem pede
 *       agenda (intent 'agendamento') ou traz sinal nela (dia, hora ou
 *       aprovação). "perfeito, obrigada!" NÃO re-abre a captura (o LLM
 *       alucinava horário a partir do contexto). E o LOCAL vence SEMPRE.
 */import express from 'express';
import path from 'path';
// --------------------------------------------------------------------------
// v13.22: (1) FUSO GARANTIDO — TZ Fortaleza no boot (sem TZ no Environment o
//       servidor pensava em UTC: recusava "hoje" depois das 15h de Fortaleza);
//       (2) TENTATIVA DUPLA na IA — falha 429/rede não deixa mais mensagem sem
//       resposta em silêncio (6 mensagens da demo morreram assim).
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// v13.23: parseHours entende DIAS ABREVIADOS — "seg a sáb, 9h às 18h" (marca do
//       painel) era lida como texto mas computada como "terça a sábado" (padrão),
//       pois só reconhecia palavras completas: segunda ficava "fechada".
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// v13.24: VENDER-READY — (1) FILA GLOBAL DE IA: no máx 2 chamadas OpenAI
//       simultâneas, espaçadas 900ms, com 3 tentativas (espera 3s/6s) — bursts
//       de mensagens não estouram mais o rate limit; (2) JANELA DA IA 24h POR
//       PADRÃO — a persona promete atendimento 24h e o gate 8h-20h engolia
//       TODA resposta informal fora dele (era o sumiço noturno; o env
//       AI_WINDOW, se existir, ainda vence).
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// v13.25: (1) BUG lastSig — o gate da captura referenciava 'lastSig' ANTES da
//       declaração (linha perdida na reconstrução v13.20): toda mensagem com
//       intent diferente de 'agendamento' (preço, informativo) crashava após
//       gerar a resposta e NUNCA era enviada ('lastSig is not defined' nos logs;
//       era o sumiço sistemático das perguntas de preço). Declaração movida
//       para ANTES do gate. (2) exists:false — número inexistente no WhatsApp
//       (números de teste fictícios) agora gera log claro em vez de críptico.
// --------------------------------------------------------------------------
import { fileURLToPath } from 'url';
import { query, ensureContactAndConversation, migrate, pool } from './db.js';
import * as ai from './ai.js';
import * as uazapi from './uazapi.js';
import * as evolution from './evolution.js';
import { mountProspect } from './prospect.js';

// v13.22: FUSO GARANTIDO — TZ no Environment vence; sem ele, o servidor pensava
// em UTC ("hoje" recusado depois das 15h de Fortaleza). ANTES de qualquer Date.
process.env.TZ = process.env.TZ || 'America/Fortaleza';

/* v13.15 — normaliza a saída do parseAppointment (LLM): "16" → "16:00",
   "18/10" → ISO. Devolve null se não houver data+hora utilizáveis. */
function normAppt(a) {
  if (!a || !a.date || !a.time) return null;
  let d = String(a.date).trim();
  const mdm = d.match(/^(\d{1,2})\/(\d{1,2})$/); // 18/10
  if (mdm) d = new Date().getFullYear() + '-' + mdm[2].padStart(2, '0') + '-' + mdm[1].padStart(2, '0');
  const hm = String(a.time).trim().match(/^(\d{1,2})(?::(\d{1,2}))?/); // 16 | 16:00
  if (!hm) return null;
  let H = parseInt(hm[1], 10);
  // v13.17: convenção do negócio — "1h" a "6h" sem qualificador é TARDE (13h-18h)
  if (H >= 1 && H <= 6) H += 12;
  if (H > 23) return null;
  const h = String(H).padStart(2, '0') + ':' + (hm[2] || '0').padStart(2, '0');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{2}:\d{2}$/.test(h)) return null;
  return { date: d, time: h, service: a.service || null };
}

/* v13.15 — fallback SEM LLM: regex na ÚLTIMA mensagem da cliente.
   "dia 18 as 16hrs" → 18/10 16:00 · "amanhã às 8h" → amanhã 08:00 ·
   "sexta 10h" → próxima sexta · "18/10 16h" · "hoje 15h". Sem data E hora
   claras = null (não inventa). Só roda quando o LLM não devolveu nada. */
function parseApptLocal(text) {
  let t = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!t) return null;
  // v13.17: números por extenso -> dígitos (sempre com "hora(s)" para não pegar "uma vez")
  const WORDS = { 'meio-dia': '12h', 'meio dia': '12h', 'uma hora': '1h', 'duas horas': '2h', 'tres horas': '3h', 'quatro horas': '4h', 'cinco horas': '5h', 'seis horas': '6h' };
  for (const [w, d] of Object.entries(WORDS)) t = t.replace(new RegExp('\\b' + w + '\\b', 'g'), d);
  const pm = /da tarde|da noite|hora da tarde/.test(t) ? true : (/da manha/.test(t) ? false : undefined);
  const hm = t.match(/(\d{1,2})\s*(?:h|hrs|horas|:)\s*(\d{2})?/) || t.match(/(?:as|pras)\s*(\d{1,2})(?!\d)/);
  if (!hm) return null;
  let hh = parseInt(hm[1], 10), mi = hm[2] ? parseInt(hm[2], 10) : 0;
  // v13.17: convenção da tarde — "1h" a "6h" sem qualificador = 13h-18h; "1h da manhã" fica 01:00 (a trava avisa)
  if (hh >= 1 && hh <= 6 && pm !== false) hh += 12;
  else if (pm === true && hh <= 11) hh += 12;
  if (hh > 23 || mi > 59) return null;
  const base = new Date(new Date().toLocaleDateString('en-CA', { timeZone: AG_TZ }) + 'T12:00:00-03:00'); // v13.16: calendário de Fortaleza
  if (/depois de amanha/.test(t)) base.setDate(base.getDate() + 2);
  else if (/\bamanha\b/.test(t)) base.setDate(base.getDate() + 1);
  else if (/\bhoje\b/.test(t)) { /* fica hoje */ }
  else {
    const dD = t.match(/\bdia\s+(\d{1,2})\b/);
    const dS = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
    const WK = { segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6, domingo: 0 };
    const wm = Object.keys(WK).find(k => new RegExp('\\b' + k + '\\b').test(t));
    if (dD) {
      const d = parseInt(dD[1], 10);
      if (!(d >= 1 && d <= 31)) return null;
      base.setMonth(d < base.getDate() ? base.getMonth() + 1 : base.getMonth());
      base.setDate(d);
    } else if (dS) {
      base.setMonth(parseInt(dS[2], 10) - 1);
      base.setDate(parseInt(dS[1], 10));
    } else if (wm) {
      let delta = (WK[wm] - base.getDay() + 7) % 7; if (delta === 0) delta = 7;
      base.setDate(base.getDate() + delta);
    } // v13.17: sem dia citado = HOJE — se o horário já passou, a resposta avisa e sugere o próximo (nunca silêncio)
  }
  const pad = n => String(n).padStart(2, '0');
  return { date: base.getFullYear() + '-' + pad(base.getMonth() + 1) + '-' + pad(base.getDate()), time: pad(hh) + ':' + pad(mi), service: null };
}

/* v13.19 — a última mensagem traz DIA + HORA explícitos? Se sim, o parser
   local (determinístico) decide sozinho, sem LLM. */
function hasExplicitDayWhen(text) {
  const t = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const hasDay = /\bdia\s+\d{1,2}\b|\b\d{1,2}\/\d{1,2}\b|\b(segunda|terca|quarta|quinta|sexta|sabado|domingo|amanha|hoje|depois de amanha)\b/.test(t);
  const hasHour = /(\d{1,2})\s*(?:h|hrs|horas|:)\s*\d{0,2}/.test(t) || /\b(?:as|pras)\s+\d{1,2}\b/.test(t);
  return hasDay && hasHour;
}

/* v13.16 — HORÁRIO DE FUNCIONAMENTO + AGENDA REAL (trava e sugestões). */
const AG_TZ = 'America/Fortaleza';
const AG_WK_EN = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const AG_WK_PT = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Lê o campo "hours" do formulário (ex.: "terça a sábado, das 9h às 19h").
    Padrão sem campo: terça a sábado, 9h às 19h (Bella Donna). */
function parseHours(s) {
  const out = { days: [2, 3, 4, 5, 6], open: '09:00', close: '19:00', text: String(s || '').trim() || 'terça a sábado, das 9h às 19h' };
  const t = String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!t) return out;
  // v13.23: abreviações (seg a sáb) —  impede casar dentro de palavra maior ("ter" não pega "terca")
  const DAY = { domingo: 0, dom: 0, segunda: 1, seg: 1, terca: 2, ter: 2, quarta: 3, qua: 3, quinta: 4, qui: 4, sexta: 5, sex: 5, sabado: 6, sab: 6 };
  if (/24\s*h|24 horas/.test(t)) { out.days = [0, 1, 2, 3, 4, 5, 6]; out.open = '00:00'; out.close = '23:59'; return out; }
  if (/todos os dias|todos dias|segunda a domingo/.test(t)) out.days = [0, 1, 2, 3, 4, 5, 6];
  else {
const m = t.match(/\b(segunda|terca|quarta|quinta|sexta|sabado|domingo|seg|ter|qua|qui|sex|sab|dom)\s*(?:a|ate|-)\s*(segunda|terca|quarta|quinta|sexta|sabado|domingo|seg|ter|qua|qui|sex|sab|dom)\b/); // v13.23
    if (m) { const a = DAY[m[1]], b = DAY[m[2]]; out.days = []; for (let d = a; ; d = (d + 1) % 7) { out.days.push(d); if (d === b) break; } }
    else {
const found = [...t.matchAll(/\b(segunda|terca|quarta|quinta|sexta|sabado|domingo|seg|ter|qua|qui|sex|sab|dom)s?\b/g)].map(x => DAY[x[1]]); // v13.23
      if (found.length) out.days = [...new Set(found)].sort((a, b) => a - b);
    }
  }
  const tm = t.match(/(\d{1,2})(?:[:h](\d{2}))?\s*h?\s*(?:as|ate|a|-)\s*(\d{1,2})(?:[:h](\d{2}))?\s*h?/);
  if (tm) { out.open = String(tm[1]).padStart(2, '0') + ':' + (tm[2] || '00'); out.close = String(tm[3]).padStart(2, '0') + ':' + (tm[4] || '00'); }
  return out;
}
const agWkNum = d => AG_WK_EN[d.toLocaleDateString('en-GB', { timeZone: AG_TZ, weekday: 'long' }).toLowerCase()];
const agDateKey = d => d.toLocaleDateString('en-CA', { timeZone: AG_TZ }); // YYYY-MM-DD
const agHourStr = d => d.toLocaleTimeString('en-GB', { timeZone: AG_TZ, hour: '2-digit', minute: '2-digit', hour12: false }); // HH:MM
const agNoon = key => new Date(key + 'T12:00:00-03:00'); // âncora estável (sem DST em Fortaleza)
const fmtHM = hm => { const p = String(hm).split(':'); return String(parseInt(p[0], 10)) + 'h' + (p[1] !== '00' ? p[1] : ''); };
const fmtDDMM = key => key.slice(8, 10) + '/' + key.slice(5, 7);

/** Horas ocupadas do dia (HH), ignorando cancelados. */
async function occupiedHours(key) {
  try {
    const r = await query(
      `SELECT scheduled_for FROM appointments
        WHERE scheduled_for >= $1 AND scheduled_for <= $2 AND status <> 'cancelado'`,
      [new Date(key + 'T00:00:00-03:00').toISOString(), new Date(key + 'T23:59:59-03:00').toISOString()]);
    return new Set(r.rows.map(x => agHourStr(new Date(x.scheduled_for)).slice(0, 2)));
  } catch { return new Set(); }
}

/** Até 4 horários livres do dia (dentro do funcionamento, futuro, livres). */
async function freeSlotsText(key, hours) {
  if (!hours.days.includes(agWkNum(agNoon(key)))) return '';
  const occ = await occupiedHours(key);
  const oh = parseInt(hours.open, 10), ch = parseInt(hours.close, 10), om = parseInt(hours.close.slice(3, 5), 10) || 0;
  const now = Date.now();
  const free = [];
  for (let h = oh; h < ch || (h === ch && om > 0); h++) {
    const hh = String(h).padStart(2, '0');
    if (occ.has(hh)) continue;
    if (new Date(key + 'T' + hh + ':00:00-03:00').getTime() <= now) continue;
    free.push(fmtHM(hh + ':00'));
    if (free.length >= 4) break;
  }
  return free.length ? free.join(', ').replace(/, ([^,]*)$/, ' ou $1') : '';
}

/** v13.16 — A TRAVA: devolve a MENSAGEM de aviso (com sugestões) se o slot
    violar o funcionamento ou cair em hora ocupada; null se pode gravar. */
async function slotProblem(slot, hours) {
  const key = agDateKey(slot);
  if (!hours.days.includes(agWkNum(slot))) {
    for (let i = 1; i <= 7; i++) {
      const k2 = agDateKey(new Date(agNoon(key).getTime() + i * 86400000));
      const free = await freeSlotsText(k2, hours);
      if (free) return `📅 ${fmtDDMM(key)} (${AG_WK_PT[agWkNum(slot)]}) estamos fechados — atendemos ${hours.text}. Posso te encaixar ${AG_WK_PT[agWkNum(agNoon(k2))]}, ${fmtDDMM(k2)}, às ${free}. Qual prefere?`;
    }
    return `📅 ${fmtDDMM(key)} (${AG_WK_PT[agWkNum(slot)]}) estamos fechados — atendemos ${hours.text}. Me diz outro dia que eu vejo a agenda!`;
  }
  const hm = agHourStr(slot), mins = parseInt(hm.slice(0, 2), 10) * 60 + parseInt(hm.slice(3, 5), 10);
  const [oh, om] = [parseInt(hours.open, 10), parseInt(hours.open.slice(3, 5), 10) || 0];
  const [ch, cm] = [parseInt(hours.close, 10), parseInt(hours.close.slice(3, 5), 10) || 0];
  if (mins < oh * 60 + om || mins >= ch * 60 + cm) {
    const free = await freeSlotsText(key, hours);
    return free ? `⏰ Às ${fmtHM(hm)} já saímos do horário de atendimento (${hours.open} às ${hours.close}). Horários livres em ${fmtDDMM(key)}: ${free}. Qual prefere?`
                : `⏰ Às ${fmtHM(hm)} já saímos do horário de atendimento (${hours.text}). Me diz outro horário que eu vejo a agenda!`;
  }
  if ((await occupiedHours(key)).has(hm.slice(0, 2))) {
    const free = await freeSlotsText(key, hours);
    if (free) return `⏰ Às ${fmtHM(hm)} a agenda já está ocupada. Horários livres em ${fmtDDMM(key)}: ${free}. Qual prefere?`;
    // v13.17: dia cheio -> próximo dia com horários livres
    for (let i = 1; i <= 7; i++) {
      const k2 = agDateKey(new Date(agNoon(key).getTime() + i * 86400000));
      const f2 = await freeSlotsText(k2, hours);
      if (f2) return `⏰ Às ${fmtHM(hm)} a agenda de ${fmtDDMM(key)} já está cheia. Próximo dia com horários livres: ${AG_WK_PT[agWkNum(agNoon(k2))]}, ${fmtDDMM(k2)}, às ${f2}. Qual prefere?`;
    }
    return `⏰ Às ${fmtHM(hm)} a agenda já está ocupada e os próximos dias estão cheios. Me diz outro dia que eu vejo a agenda!`;
  }
  return null;
}

/** v13.17 — horário que já passou: responde SEMPRE, com o próximo slot livre. */
async function pastSlotMsg(slot, hours) {
  const hoje = agDateKey(new Date());
  if (agDateKey(slot) === hoje) {
    const free = await freeSlotsText(hoje, hours);
    if (free) return `📅 Esse horário já passou 🙂 Ainda hoje tenho: ${free}. Qual prefere?`;
  }
  for (let i = 1; i <= 7; i++) {
    const k2 = agDateKey(new Date(agNoon(hoje).getTime() + i * 86400000));
    const f2 = await freeSlotsText(k2, hours);
    if (f2) return `📅 Esse horário já passou 🙂 Próximo dia com horários livres: ${AG_WK_PT[agWkNum(agNoon(k2))]}, ${fmtDDMM(k2)}, às ${f2}. Qual prefere?`;
  }
  return '📅 Esse horário já passou 🙂 Me diz outro dia e horário que eu vejo a agenda!';
}

/** Resumo curto dos horários livres (hoje + amanhã) p/ a IA oferecer. */
async function availabilitySummary(hours) {
  try {
    const hoje = agDateKey(new Date());
    const parts = [];
    for (let i = 0; i < 2; i++) {
      const k = agDateKey(new Date(agNoon(hoje).getTime() + i * 86400000));
      const label = (i === 0 ? 'hoje' : 'amanhã') + ` (${AG_WK_PT[agWkNum(agNoon(k))]})`;
      if (!hours.days.includes(agWkNum(agNoon(k)))) { parts.push(`${label}: fechado`); continue; }
      const free = await freeSlotsText(k, hours);
      parts.push(`${label}: ${free ? free + ' livres' : 'agenda cheia'}`);
    }
    return `Atendemos ${hours.text} · ` + parts.join(' · '); // v13.17: funcionamento aberto no sumário
  } catch { return ''; }
}


process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e?.message || e));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e?.message || e));

// ---- Provedor de WhatsApp (mesmo contrato nas duas camadas) ----
const PROVIDER = (process.env.WHATSAPP_PROVIDER || 'uazapi').toLowerCase();
const wa = PROVIDER === 'evolution' ? evolution : uazapi;

// v13.9.4: "digitando..." (presence composing) — melhor esforço, nunca trava
// o fluxo nem loga erro: se o provedor não tiver sendTyping, não faz nada.
function showTyping(to) {
  try { Promise.resolve(wa.sendTyping?.(to)).catch(() => {}); } catch (_) {}
}

// v13.10: WHITE-LABEL — nome do negócio, atendente, cores, boas-vindas e
// persona editáveis NO PAINEL (tabela app_settings). A IA e o painel leem
// daqui; sem registro no banco, tudo segue o padrão do código.
const BRAND_KEYS = ['business_name', 'attendant_name', 'welcome_msg',
  'persona_extra', 'brand_ai', 'brand_ai_deep', 'brand_side', 'brand_side2', 'brand_bg'];
async function loadBranding() {
  try {
    const r = await query(`SELECT key, value FROM app_settings`);
    return Object.fromEntries(r.rows.map((x) => [x.key, x.value]));
  } catch (_) { return {}; } // tabela ainda ausente — usa o padrão do código
}

const app = express();
app.use(express.json({ limit: '12mb' })); // webhooks com mídia/base64 podem ser grandes
mountProspect(app); // módulo de prospecção ativa (rotas /api/prospect/* + worker de disparo)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ---------------- LOGIN DO PAINEL (v11) ----------------
   PANEL_USER + PANEL_PASS no Environment → painel e APIs pedem login.
   Sem as variáveis → painel aberto (modo demo). O /api/health e o
   webhook ficam sempre livres (monitoramento e a API de WhatsApp não têm login). */
const PANEL_USER = process.env.PANEL_USER || '';
const PANEL_PASS = process.env.PANEL_PASS || '';
// v13.10.1: senha de DESENVOLVEDOR — destrava a EDIÇÃO da marca no painel
// (nome, cores, boas-vindas, persona). É OUTRA senha: quem tem PANEL_PASS
// vê o painel pintado; só quem tem DEV_PASS muda a roupa.
const DEV_PASS = process.env.DEV_PASS || '';
function requirePanelAuth(req, res, next) {
  if (!PANEL_USER || !PANEL_PASS) return next();
  const hdr = req.headers.authorization || '';
  const ok = hdr.startsWith('Basic ') &&
    Buffer.from(hdr.slice(6), 'base64').toString() === `${PANEL_USER}:${PANEL_PASS}`;
  if (ok) return next();
  res.setHeader('WWW-Authenticate', 'Basic realm="NEON CRM"');
  return res.status(401).send('Login necessário');
}

/* ---------------- Janela de horário da IA (v11) ----------------
   Resposta automática só dentro desta janela (horário de Aracaju, UTC-3).
   Fora dela, a sugestão fica pronta no painel p/ envio manual. */
const AI_WINDOW = (process.env.AI_WINDOW || '0-24').split('-').map(Number); // v13.24: 24h por padrão (env AI_WINDOW ainda vence)
// v13.24: FILA GLOBAL DE IA — no máx 2 chamadas OpenAI simultâneas (largadas
// com 900ms de espaçamento). Burst de 5 clientes = 10 chamadas de uma vez
// estourava o rate limit e matava respostas em silêncio.
const aiQueue = { running: 0, lastStart: 0, waiters: [] };
async function withAiSlot(task) {
  if (aiQueue.running >= 2) await new Promise(r => aiQueue.waiters.push(r));
  const gap = 900 - Math.min(900, Date.now() - aiQueue.lastStart);
  if (gap > 0) await new Promise(r => setTimeout(r, gap));
  aiQueue.lastStart = Date.now();
  aiQueue.running++;
  try { return await task(); }
  finally {
    aiQueue.running--;
    const next = aiQueue.waiters.shift();
    if (next) next();
  }
// v13.25: WhatsApp responde 400 exists:false para números que não existem
// (números de teste fictícios / cadastro errado) — log claro em vez de críptico.
const waNaoExiste = m => /"exists"\s*:\s*false|exists\s*[:=]\s*false/i.test(String(m));
}
// v13.9.1: conversas com o MODO TRADUTOR ligado (números). Em memória:
// reinício do serviço = modo desligado (o aluno liga de novo com 1 comando).
const translatorMode = new Set();
// v13.9.4: MODO EMBAIXADOR (por conversa, em memória — igual ao tradutor):
// o dono manda a fala, o sistema corrige em inglês e devolve NA VOZ DELE
// (clonada via ElevenLabs). "quero o embaixador" liga, "sair do
// embaixador" desliga. Ferramenta do dono — NUNCA citar como serviço.
const embaixadorMode = new Set();
// v13.9.3: mp3s do TTS aguardando envio (token → Buffer), expiram em 5 min.
// O sendMedia da Evolution exige mídia como "url or base64" — e o base64
// quebra dentro dela, então a voz viaja por URL pública efêmera.
const audioUrls = new Map();
const PUBLIC_BASE = (process.env.APP_URL || 'https://crm.oliverglassservice.com').replace(/\/$/, '');
function withinAiHours() {
  const now = new Date();
  const h = (now.getUTCHours() + 24 - 3) % 24;
  const dow = now.getUTCDay(); // 0 = domingo
  return dow !== 0 && h >= AI_WINDOW[0] && h < AI_WINDOW[1];
}

/* ---------------- API: saúde (sempre aberta) ---------------- */
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

/* ---------------- API: MODO DEV p/ demonstrações (v13.18, X-Dev-Pass) ---------------- */
app.post('/api/dev/wipe', async (req, res) => {
  try {
    if (!DEV_PASS) return res.status(500).json({ error: 'DEV_PASS não configurada no Environment — wipe travado' });
    if (req.headers['x-dev-pass'] !== DEV_PASS) return res.status(401).json({ error: 'senha de desenvolvedor incorreta' });
    // apaga TODO o histórico de atendimento (reset p/ demo) — preserva usuários,
    // marca (app_settings) e configuração; identity reiniciada p/ contagem limpa
    await query(`TRUNCATE message_embeddings, messages, thread_state, appointments, deals, activities, conversations, contacts, prospect_leads RESTART IDENTITY CASCADE`);
    console.log('[dev] 🧹 histórico de atendimento apagado (reset de demonstração)');
    res.json({ ok: true, wiped: ['messages', 'thread_state', 'appointments', 'deals', 'activities', 'conversations', 'contacts', 'prospect_leads'] });
  } catch (e) { res.status(500).json({ error: String(e.message) }); }
});

app.get('/api/dev/debug', async (req, res) => {
  try {
    if (!DEV_PASS) return res.status(500).json({ error: 'DEV_PASS não configurada' });
    if (req.headers['x-dev-pass'] !== DEV_PASS) return res.status(401).json({ error: 'senha de desenvolvedor incorreta' });
    const [cts, cvs, msgs, aps] = await Promise.all([
      query(`SELECT id, wa_id, name, opt_out, score, status FROM contacts ORDER BY id`),
      query(`SELECT id, contact_id, wa_chat_id, unread, last_msg_at FROM conversations ORDER BY id`),
      query(`SELECT id, conversation_id, direction, kind, body, created_at FROM messages ORDER BY id`),
      query(`SELECT id, conversation_id, service, scheduled_for, status FROM appointments ORDER BY id`),
    ]);
    res.json({ ok: true, contacts: cts.rows, conversations: cvs.rows, messages: msgs.rows, appointments: aps.rows });
  } catch (e) { res.status(500).json({ error: String(e.message) }); }
});

/* ---------------- APIs protegidas por login ---------------- */
app.use('/api', (req, res, next) => (req.path === '/health' ? next() : requirePanelAuth(req, res, next)));

/* ---------------- API: diagnóstico de Environment (sem expor segredos) ---------------- */
app.get('/api/debug/env', (_req, res) => res.json({
  provider: PROVIDER,
  auto_respond: process.env.AUTO_RESPOND || null,
  uazapi_url: process.env.UAZAPI_URL || null,
  evolution_url: process.env.EVOLUTION_URL || null,
  evolution_instance: process.env.EVOLUTION_INSTANCE || null,
  app_url: process.env.APP_URL || null,
  webhook_secret_definido: !!process.env.WEBHOOK_SECRET,
  openai_key_definida: !!process.env.OPENAI_API_KEY,
  whatsapp_key_definida: !!(process.env.UAZAPI_TOKEN || process.env.EVOLUTION_API_KEY),
  panel_login_ativo: !!(PANEL_USER && PANEL_PASS),
  ai_window: `${AI_WINDOW[0]}h-${AI_WINDOW[1]}h`,
}));


/* ---------------- API: métricas do negócio (v13.5) ---------------- */
app.get('/api/metrics', async (_req, res) => {
  try {
    const m = (await query(`
      SELECT
        (SELECT count(*)::int FROM contacts)  AS contatos,
        (SELECT count(*)::int FROM contacts WHERE opt_out)  AS opt_outs,
        (SELECT count(*)::int FROM conversations)  AS conversas,
        (SELECT count(*)::int FROM conversations WHERE last_msg_at > now() - interval '7 days') AS conversas_7d,
        (SELECT count(*)::int FROM messages WHERE direction = 'in'  AND created_at > now() - interval '7 days') AS msgs_in_7d,
        (SELECT count(*)::int FROM messages WHERE direction = 'out' AND created_at > now() - interval '7 days') AS msgs_out_7d,
        (SELECT count(*)::int FROM conversations WHERE EXISTS (
            SELECT 1 FROM messages mm WHERE mm.conversation_id = conversations.id AND mm.direction = 'in'
        )) AS conversas_com_resposta,
        (SELECT count(*)::int FROM deals WHERE stage NOT IN ('ganho','perdido')) AS deals_abertos,
        (SELECT COALESCE(sum(value_cents),0)::bigint FROM deals WHERE stage NOT IN ('ganho','perdido')) AS pipeline_cents,
        (SELECT count(*)::int FROM appointments WHERE status = 'confirmado' AND scheduled_for > now()) AS agendamentos_futuros
    `)).rows[0];
    const prospeccao = Object.fromEntries((await query(
      `SELECT status, count(*)::int AS n FROM prospect_leads GROUP BY status`
    )).rows.map(r => [r.status, r.n]));
    const disparos_hoje = (await query(
      `SELECT count(*)::int AS n FROM prospect_leads WHERE last_sent_at::date = now()::date`
    )).rows[0].n;
    res.json({
      ...m,
      taxa_resposta: m.conversas ? Math.round(100 * m.conversas_com_resposta / m.conversas) : 0,
      prospeccao,
      disparos_hoje,
      gerado_em: new Date().toISOString(),
    });
  } catch (e) { res.status(500).json({ error: String(e.message) }); }
});

/* ---------------- API: white-label (v13.10) — marca editável no painel ---------------- */
app.get('/api/branding', async (_req, res) => {
  res.json(await loadBranding());
});
app.post('/api/branding', async (req, res) => {
  try {
    // v13.10.1: TRANCO — sem a senha de desenvolvedor, ninguém salva marca
    if (!DEV_PASS) return res.status(500).json({ error: 'DEV_PASS não configurada no Environment — edição de marca travada' });
    if (req.headers['x-dev-pass'] !== DEV_PASS) return res.status(401).json({ error: 'senha de desenvolvedor incorreta' });
    const body = req.body || {};
    for (const k of BRAND_KEYS) {
      if (body[k] === undefined) continue;
      await query(
        `INSERT INTO app_settings (key, value) VALUES ($1,$2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [k, String(body[k]).slice(0, 4000)]
      );
    }
    console.log('[branding] ✅ marca atualizada pelo painel');
    res.json({ ok: true, branding: await loadBranding() });
  } catch (e) { res.status(500).json({ error: String(e.message) }); }
});

/** v13.10.1: valida a senha do desenvolvedor SEM salvar nada — o painel
 *  chama ao abrir a aba Configurações (destrava a edição na sessão). */
app.post('/api/branding/unlock', async (req, res) => {
  if (!DEV_PASS) return res.status(500).json({ error: 'DEV_PASS não configurada no Environment' });
  if (req.headers['x-dev-pass'] !== DEV_PASS) return res.status(401).json({ error: 'senha incorreta' });
  res.json({ ok: true });
});

/* ---------------- API: importação do formulário (v13.11) ----------------
 *  Recebe o JSON gerado pelo Formulário de Configuração do cliente
 *  (formulario-configuracao-crm.html) e formata o CRM num único POST.
 *  MESMA tranca do POST /api/branding (X-Dev-Pass): o cliente nunca
 *  importa nada — a operação é do escritório. */
const FORM_EXTRA_KEYS = ['owner_name', 'city', 'address', 'hours', 'whatsapp',
  'nicho', 'nicho_custom', 'missao', 'nunca', 'diferenciais', 'mais',
  'catalog', 'faq_extra'];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

app.post('/api/branding/import', async (req, res) => {
  try {
    if (!DEV_PASS) return res.status(500).json({ error: 'DEV_PASS não configurada no Environment — importação travada' });
    if (req.headers['x-dev-pass'] !== DEV_PASS) return res.status(401).json({ error: 'senha de desenvolvedor incorreta' });
    const b = req.body || {};
    const missing = [];
    if (!String(b.business_name || '').trim()) missing.push('business_name');
    if (!String(b.attendant_name || '').trim()) missing.push('attendant_name');
    if (missing.length) return res.status(400).json({ error: 'JSON do formulário incompleto — faltando: ' + missing.join(', ') });
    const colors = (b.colors && typeof b.colors === 'object') ? b.colors : {};
    for (const [k, v] of Object.entries(colors)) {
      if (!HEX_RE.test(String(v))) return res.status(400).json({ error: 'cor inválida em colors.' + k + ' (esperado #RRGGBB)' });
    }
    // 1) campos da marca (BRAND_KEYS) — só sobrescreve o que veio preenchido
    const map = {};
    for (const k of BRAND_KEYS) {
      if (b[k] === undefined || b[k] === null) continue;
      const s = String(b[k]).trim();
      if (s) map[k] = s.slice(0, 4000);
    }
    // 2) campos extras do formulário — guardados em app_settings e já
    //    viajam dentro do branding (loadBranding lê TODAS as chaves),
    //    prontos para o ai.js evoluir sem nova migração
    for (const k of FORM_EXTRA_KEYS) {
      const v = b[k];
      if (v === undefined || v === null) continue;
      let s = Array.isArray(v) ? v.map(String).filter(x => x.trim()).join('\n')
             : typeof v === 'string' ? v.trim() : String(v);
      s = s.slice(0, 4000);
      if (s) map[k] = s;
    }
    // 3) cores (vindas do bloco colors do formulário)
    for (const k of ['brand_ai', 'brand_ai_deep', 'brand_side', 'brand_side2', 'brand_bg']) {
      if (colors[k]) map[k] = colors[k];
    }
    if (!Object.keys(map).length) return res.status(400).json({ error: 'nada a importar — JSON vazio ou sem campos reconhecidos' });
    for (const [k, v] of Object.entries(map)) {
      await query(
        `INSERT INTO app_settings (key, value) VALUES ($1,$2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [k, v]
      );
    }
    console.log('[branding] ✅ configuração importada do formulário (' + Object.keys(map).length + ' campos): ' + (map.business_name || ''));
    res.json({ ok: true, imported: Object.keys(map).length, branding: await loadBranding() });
  } catch (e) { res.status(500).json({ error: String(e.message) }); }
});

/* ---------------- API: agenda (v13.12) — o painel vê e gere ---------------- */
app.get('/api/appointments', requirePanelAuth, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 21, 1), 90);
    const r = await query(
      `SELECT a.id, a.service, a.scheduled_for, a.status, a.created_at,
              cv.id AS conversation_id, cv.contact_id, ct.name AS contact_name, ct.wa_id
         FROM appointments a
         JOIN conversations cv ON cv.id = a.conversation_id
         LEFT JOIN contacts ct ON ct.id = cv.contact_id
        WHERE a.scheduled_for >= now() - interval '7 days'
          AND a.scheduled_for <= now() + ($1 || ' days')::interval
        ORDER BY a.scheduled_for ASC LIMIT 500`,
      [days]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: String(e.message) }); }
});

app.post('/api/appointments', requirePanelAuth, async (req, res) => {
  try {
    const b = req.body || {};
    if (!String(b.name || '').trim() || !String(b.wa_id || '').trim())
      return res.status(400).json({ error: 'nome e wa_id do cliente são obrigatórios' });
    const when = new Date(b.scheduled_for || '');
    if (isNaN(when)) return res.status(400).json({ error: 'scheduled_for inválido (ISO com fuso, ex.: 2026-10-17T14:00:00-03:00)' });
    // acha o contato pelo WhatsApp (cria se for novo) e a conversa dele
    let ct = (await query(`SELECT id FROM contacts WHERE wa_id = $1`, [b.wa_id])).rows[0];
    if (!ct) ct = (await query(
      `INSERT INTO contacts (wa_id, name) VALUES ($1,$2) RETURNING id`,
      [b.wa_id, String(b.name).slice(0, 120)])).rows[0];
    let cv = (await query(
      `SELECT id FROM conversations WHERE contact_id = $1 ORDER BY id DESC LIMIT 1`,
      [ct.id])).rows[0];
    if (!cv) cv = (await query(
      `INSERT INTO conversations (contact_id, wa_chat_id) VALUES ($1,$2) RETURNING id`,
      [ct.id, b.wa_id.includes('@') ? b.wa_id : b.wa_id + '@s.whatsapp.net'])).rows[0];
    const status = ['confirmado', 'pendente', 'concluido', 'cancelado'].includes(b.status) ? b.status : 'confirmado';
    const ins = await query(
      `INSERT INTO appointments (conversation_id, service, scheduled_for, status)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING *`,
      [cv.id, String(b.service || '').slice(0, 200) || null, when.toISOString(), status]);
    if (!ins.rows[0]) return res.status(409).json({ error: 'já existe agendamento idêntico para esta conversa' });
    res.json(ins.rows[0]);
  } catch (e) { res.status(500).json({ error: String(e.message) }); }
});

app.patch('/api/appointments/:id', requirePanelAuth, async (req, res) => {
  try {
    const b = req.body || {};
    const sets = [], vals = [];
    if (b.service !== undefined) { sets.push(`service = $${sets.length + 1}`); vals.push(String(b.service).slice(0, 200)); }
    if (b.scheduled_for !== undefined) {
      const d = new Date(b.scheduled_for);
      if (isNaN(d)) return res.status(400).json({ error: 'scheduled_for inválido' });
      sets.push(`scheduled_for = $${sets.length + 1}`); vals.push(d.toISOString());
    }
    if (b.status !== undefined) {
      if (!['confirmado', 'pendente', 'concluido', 'cancelado'].includes(b.status))
        return res.status(400).json({ error: 'status inválido (confirmado|pendente|concluido|cancelado)' });
      sets.push(`status = $${sets.length + 1}`); vals.push(b.status);
    }
    if (!sets.length) return res.status(400).json({ error: 'nada para atualizar' });
    vals.push(req.params.id);
    const up = await query(`UPDATE appointments SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (!up.rows[0]) return res.status(404).json({ error: 'agendamento não encontrado' });
    res.json(up.rows[0]);
  } catch (e) { res.status(500).json({ error: String(e.message) }); }
});

app.delete('/api/appointments/:id', requirePanelAuth, async (req, res) => {
  try {
    const del = await query(`DELETE FROM appointments WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!del.rows[0]) return res.status(404).json({ error: 'agendamento não encontrado' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e.message) }); }
});

/* ---------------- API: contatos ---------------- */
app.get('/api/contacts', async (_req, res) => {
  const r = await query(`SELECT * FROM contacts ORDER BY score DESC, name`);
  res.json(r.rows);
});
app.post('/api/contacts', async (req, res) => {
  const { name, company, role, email, wa_id } = req.body;
  const r = await query(
    `INSERT INTO contacts (name, company, role, email, wa_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [name, company || '', role || '', email || '', wa_id || null]
  );
  res.json(r.rows[0]);
});

/** v13.5.6: REATIVAR contato que pediu SAIR — somente por ação humana no painel
 *  (reconsentimento explícito, LGPD-friendly). Deixa a Mariana responder e o
 *  disparo voltar a incluir o número. */
app.post('/api/contacts/:id/reactivate', async (req, res) => {
  const r = await query(
    `UPDATE contacts SET opt_out = FALSE, consent_lgpd = TRUE WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (r.rows[0]) console.log('[optout] ✅ contato REATIVADO pelo painel:', r.rows[0].wa_id);
  res.json(r.rows[0] || {});
});

/* ---------------- API: funil ---------------- */
app.get('/api/deals', async (_req, res) => {
  const r = await query(
    `SELECT d.*, c.name AS contact_name, c.company FROM deals d
     LEFT JOIN contacts c ON c.id = d.contact_id ORDER BY d.stage, d.probability DESC`
  );
  res.json(r.rows);
});
app.patch('/api/deals/:id', async (req, res) => {
  const { stage, probability, status_note } = req.body;
  const r = await query(
    `UPDATE deals SET
       stage        = COALESCE($2, stage),
       probability  = COALESCE($3, probability),
       status_note  = COALESCE($4, status_note),
       updated_at   = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, stage || null, probability ?? null, status_note || null]
  );
  res.json(r.rows[0] || {});
});

/* ---------------- API: conversas (inbox) ---------------- */
app.get('/api/threads', async (_req, res) => {
  const r = await query(
    `SELECT cv.id, cv.wa_chat_id, cv.unread, cv.last_msg_at,
            ct.id AS contact_id, ct.name, ct.company, ct.score,
            ts.summary, ts.tone, ts.intent, ts.next_suggestion, ts.suggestion_reason,
            (SELECT body FROM messages m WHERE m.conversation_id = cv.id ORDER BY m.created_at DESC LIMIT 1) AS last_body
     FROM conversations cv
     JOIN contacts ct ON ct.id = cv.contact_id
     LEFT JOIN thread_state ts ON ts.conversation_id = cv.id
     ORDER BY cv.last_msg_at DESC NULLS LAST`
  );
  res.json(r.rows);
});

app.get('/api/threads/:id/messages', async (req, res) => {
  const id = Number(req.params.id);
  const r = await query(
    `SELECT id, direction, kind, body, created_at FROM messages
     WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 200`,
    [id]
  );
  await query(`UPDATE conversations SET unread = 0 WHERE id = $1`, [id]);
  res.json(r.rows);
});

/** IA: gera sugestão de resposta para o vendedor */
app.post('/api/threads/:id/suggest', async (req, res) => {
  const id = Number(req.params.id);
  const msgs = (await query(
    `SELECT direction, body FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10`, [id]
  )).rows.reverse();
  const ctx = (await query(
    `SELECT ct.name, ct.company, ct.score, ct.status FROM conversations cv
     JOIN contacts ct ON ct.id = cv.contact_id WHERE cv.id = $1`, [id]
  )).rows[0] || {};
  const suggestion = await ai.suggestReply(msgs, { ...ctx, branding: await loadBranding() });
  await query(
    `UPDATE thread_state SET next_suggestion = $2, updated_at = now() WHERE conversation_id = $1`,
    [id, suggestion]
  );
  res.json({ suggestion });
});

/** IA: resumo p/ troca de turno */
app.post('/api/threads/:id/summary', async (req, res) => {
  const id = Number(req.params.id);
  const msgs = (await query(
    `SELECT direction, body FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 100`, [id]
  )).rows;
  const contact = (await query(
    `SELECT ct.name FROM conversations cv JOIN contacts ct ON ct.id = cv.contact_id WHERE cv.id = $1`, [id]
  )).rows[0]?.name || 'Cliente';
  const summary = await ai.summarizeThread(msgs, contact);
  await query(`UPDATE thread_state SET summary = $2, updated_at = now() WHERE conversation_id = $1`, [id, summary]);
  res.json({ summary });
});

/** Envia mensagem pelo WhatsApp real e persiste */
app.post('/api/messages/send', async (req, res) => {
  const { conversation_id, text } = req.body;
  const conv = (await query(`SELECT * FROM conversations WHERE id = $1`, [conversation_id])).rows[0];
  if (!conv) return res.status(404).json({ error: 'conversa não encontrada' });
  try {
    const out = await wa.sendText(conv.wa_chat_id, text);
    await query(
      `INSERT INTO messages (conversation_id, direction, kind, body, wa_message_id)
       VALUES ($1,'out','text',$2,$3)`,
      [conversation_id, text, out?.id ? String(out.id) : (out?.key?.id ? String(out.key.id) : null)]
    );
    await query(`UPDATE conversations SET last_msg_at = now() WHERE id = $1`, [conversation_id]);
    await query(
      `UPDATE thread_state SET next_suggestion = NULL WHERE conversation_id = $1`,
      [conversation_id]
    );
    res.json({ ok: true, out });
  } catch (e) {
    res.status(502).json({ error: String(e.message) });
  }
});

/* ---------------- WEBHOOK WhatsApp (Uazapi | Evolution — mesmo handler) ---------------- */
async function waWebhook(req, res) {
  if (req.query.secret !== process.env.WEBHOOK_SECRET) return res.status(401).send('forbidden');
  res.json({ ok: true }); // responde rápido; a IA roda em background
  try {
    const msg = wa.parseWebhook(req.body);
    if (!msg) return;
    console.log('[webhook]', msg.eventType, msg.chatId, msg.kind);

    // ---- DEDUPE: a API pode reenviar o mesmo evento ----
    if (msg.waMessageId) {
      const dup = await query(`SELECT 1 FROM messages WHERE wa_message_id = $1 LIMIT 1`, [String(msg.waMessageId)]);
      if (dup.rowCount > 0) {
        console.log('[webhook] evento duplicado ignorado:', msg.waMessageId);
        return;
      }
    }

    const { contact, conversation } = await ensureContactAndConversation(msg.chatId.split('@')[0], msg.senderName);

    // v11: se o remetente é um lead de prospecção, marca "respondeu" na fila de caça
    const waNumber = msg.chatId.split('@')[0];
    if (!msg.fromMe) {
      await query(
        `UPDATE prospect_leads SET status='respondeu' WHERE phone=$1 AND status IN ('fila','enviado')`,
        [waNumber]
      );
    }

    let body = msg.text;
    // v12/v13.3: áudio → baixa mídia + transcreve com Whisper.
    // v13.3: se transcrever, o áudio SEGUE o fluxo normal da IA (ela responde de volta!).
    if (msg.kind === 'audio' && !body && msg.waMessageId) {
      try {
        const buf = await wa.downloadMedia(msg);
        const txt = (await ai.transcribeAudio(buf)) || '';
        if (txt.trim()) {
          body = txt;
          msg.kind = 'text'; // transcrito → tratado como texto: a IA responde
          console.log('[audio] transcrito:', body.slice(0, 60));
        } else {
          body = '[áudio sem texto]';
        }
      } catch (e) {
        console.error('[audio] falha ao transcrever:', e.message);
        body = '[áudio recebido]';
      }
    }
    await query(
      `INSERT INTO messages (conversation_id, direction, kind, body, wa_message_id, raw)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [conversation.id, msg.fromMe ? 'out' : 'in', msg.kind, body, msg.waMessageId, JSON.stringify(msg.raw)]
    );
    await query(
      `UPDATE conversations SET last_msg_at = now(), unread = unread + $2 WHERE id = $1`,
      [conversation.id, msg.fromMe ? 0 : 1]
    );

    if (msg.fromMe || msg.kind !== 'text') return;

    // ---- v13.5/v13.6.2: OPT-OUT (LGPD) — pedido de saída é honrado na hora, sem IA.
    // v13.6.2: detetor por PALAVRAS-CHAVE (ai.detectOptOut, custo zero, pega
    // "STOP", "quero parar de receber mensagens de vocês", "me descadastra de
    // tudo", "me tira da lista"…) + palavras-soltas clássicas por segurança.
    // v13.9.4: GUARD — saída de MODO do dono ("sair do tradutor/embaixador",
    // "sair da aula") NUNCA é opt-out LGPD. O bug real de 07/10 marcou o
    // dono por engano ao sair da aula; a saída de modo é tratada nos blocos
    // de modo logo abaixo — aqui ela simplesmente não derruba o contato.
    const norm = body.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const saidaDeModo = /sair do (modo )?(tradutor|embaixador)|sair da aula/i.test(body);
    if (!saidaDeModo && (ai.detectOptOut(body) || /^(sair|parar|pare|parem|descadastrar)$/.test(norm))) {
      await query(`UPDATE contacts SET opt_out = TRUE, consent_lgpd = FALSE WHERE id = $1`, [contact.id]);
      await query(`UPDATE prospect_leads SET status = 'optout' WHERE phone = $1`, [waNumber]);
      const confirmMsg = 'Registrado! A partir de agora não vou mais te mandar mensagem. Se um dia mudar de ideia, estarei por aqui.';
      try {
        await wa.sendText(waNumber, confirmMsg);
        await query(
          `INSERT INTO messages (conversation_id, direction, kind, body) VALUES ($1,'out','text',$2)`,
          [conversation.id, confirmMsg]
        );
      } catch (_) { /* confirmação falhou — o registro de opt-out já vale */ }
      console.log('[optout] ✅ contato', waNumber, 'marcado — não recebe mais automação nenhuma');
      return;
    }

    // ---- v13.9.1: MODO TRADUTOR (antes da IA comercial; a aula vence) ----
    if (!msg.fromMe) {
      try {
        if (ai.detectTranslatorOn(body)) translatorMode.add(waNumber);
        const desligando = translatorMode.has(waNumber) &&
          (ai.detectTranslatorOff(body) || /modo_tradutor_desligado/i.test(body));

        if (translatorMode.has(waNumber)) {
          await query(`UPDATE thread_state SET intent = 'tradutor', updated_at = now() WHERE conversation_id = $1`, [conversation.id]);

          if (desligando) {
            translatorMode.delete(waNumber);
            const bye = 'Modo tradutor desligado! 🎓 Foi bom estudar com você — quando quiser voltar, é só dizer "quero o tradutor". Aqui é a Mariana, à disposação 😊';
            try { await wa.sendText(waNumber, bye); } catch (_) { /* segue */ }
            await query(`INSERT INTO messages (conversation_id, direction, kind, body) VALUES ($1,'out','text',$2)`, [conversation.id, bye]);
            console.log('[tradutor] modo desligado p/ conversa', conversation.id);
            return;
          }

          // aula: a próxima fala do Professor Bilíngue
          // v13.9.4: "digitando..." na tela do aluno enquanto o professor pensa
          showTyping(waNumber);
          const recentT = (await query(
            `SELECT direction, body FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10`,
            [conversation.id])).rows.reverse();
          const professor = await ai.translatorReply(recentT, contact.name);

          if (/modo_tradutor_desligado/i.test(professor)) {
            translatorMode.delete(waNumber);
            const bye2 = 'Aula encerrada! 🎓 Me chama de novo com "quero o tradutor" quando quiser praticar. Aqui é a Mariana 😊';
            try { await wa.sendText(waNumber, bye2); } catch (_) { /* segue */ }
            await query(`INSERT INTO messages (conversation_id, direction, kind, body) VALUES ($1,'out','text',$2)`, [conversation.id, bye2]);
            return;
          }

          // 1º a VOZ (foco da conversação) — sem áudio possível, cai para texto
          let textEnviado = false; // v13.9.2: o texto sai UMA vez só (era a duplicação)
          try {
            // v13.9.3: a voz lê SÓ a fala — sem a linha 🇧🇷 e sem o marcador ✅
            const fala = professor
              .split('\n').filter((l) => !/^\s*🇧🇷/.test(l)).join('\n')
              .replace(/✅\s*Mais natural:\s*/gi, 'Better: ')
              .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu, '')
              .trim();
            const buf = await ai.synthesizeSpeech(fala);
            const token = Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
            audioUrls.set(token, { buf });
            setTimeout(() => audioUrls.delete(token), 5 * 60 * 1000); // a URL morre sozinha
            await wa.sendAudio(waNumber, `${PUBLIC_BASE}/media/${token}.mp3`);
            await query(`INSERT INTO messages (conversation_id, direction, kind, body) VALUES ($1,'out','audio',$2)`, [conversation.id, professor]);
          } catch (eAud) {
            console.error('[tradutor] áudio falhou, mando em texto UMA vez:', eAud.message);
            try { await wa.sendText(waNumber, professor); textEnviado = true; } catch (_) { /* segue */ }
            await query(`INSERT INTO messages (conversation_id, direction, kind, body) VALUES ($1,'out','text',$2)`, [conversation.id, professor]);
          }
          // 2º o TEXTO de apoio SÓ quando a VOZ saiu e há correção (✅) ou tradução (🇧🇷)
          if (!textEnviado && /[\u2705\uD83C\uDDE7\uD83C\uDDF7]/.test(professor)) {
            try { await wa.sendText(waNumber, professor); } catch (_) { /* a voz já saiu */ }
          }
          console.log('[tradutor] aula entregue p/ conversa', conversation.id);
          return; // no modo aula, a Mariana comercial não entra
        }
      } catch (eT) { console.error('[tradutor] erro no modo:', eT.message); }
    }

    // ---- v13.9.4: MODO EMBAIXADOR (ferramenta do dono — nunca citar como serviço) ----
    // Fluxo: fala do dono (áudio transcrito no topo OU texto) → polishEnglish
    // (inglês natural de negócios, mesmo sentido e tom) → speakWithClonedVoice
    // (ElevenLabs, voz clonada) → áudio na voz dele + notas ✅ (máx. 2).
    if (!msg.fromMe) {
      try {
        if (ai.detectEmbaixadorOn(body)) {
          // sem voz clonada configurada → aviso honesto e nem entra no modo
          if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) {
            const falta = 'O embaixador precisa da sua voz clonada, que ainda não está configurada. Configuro em minutos: conta ElevenLabs + clonagem da voz — quando estiver no ar, o "quero o embaixador" já funciona. Aqui é a Mariana, à disposação 😊';
            try { await wa.sendText(waNumber, falta); } catch (_) { /* segue */ }
            await query(`INSERT INTO messages (conversation_id, direction, kind, body) VALUES ($1,'out','text',$2)`, [conversation.id, falta]);
            console.log('[embaixador] ativação sem voz configurada — aviso enviado p/ conversa', conversation.id);
            return;
          }
          embaixadorMode.add(waNumber);
          const oiEmb = 'Modo embaixador ligado! 🎙️ Manda a fala (áudio ou texto) que eu devolvo em inglês natural, na SUA voz, pronta pra encaminhar. Pra sair: "sair do embaixador".';
          try { await wa.sendText(waNumber, oiEmb); } catch (_) { /* segue */ }
          await query(`INSERT INTO messages (conversation_id, direction, kind, body) VALUES ($1,'out','text',$2)`, [conversation.id, oiEmb]);
          console.log('[embaixador] modo ligado p/ conversa', conversation.id);
          return;
        }

        const desligandoEmb = embaixadorMode.has(waNumber) &&
          (ai.detectEmbaixadorOff(body) || /modo_embaixador_desligado/i.test(body));

        if (embaixadorMode.has(waNumber)) {
          await query(`UPDATE thread_state SET intent = 'embaixador', updated_at = now() WHERE conversation_id = $1`, [conversation.id]);

          if (desligandoEmb) {
            embaixadorMode.delete(waNumber);
            const byeEmb = 'Modo embaixador desligado! 🎙️ Quando quiser lapidar uma fala em inglês, é só dizer "quero o embaixador". Aqui é a Mariana, à disposação 😊';
            try { await wa.sendText(waNumber, byeEmb); } catch (_) { /* segue */ }
            await query(`INSERT INTO messages (conversation_id, direction, kind, body) VALUES ($1,'out','text',$2)`, [conversation.id, byeEmb]);
            console.log('[embaixador] modo desligado p/ conversa', conversation.id);
            return;
          }

          // a fala do dono já está em `body` (áudio transcrito ou texto)
          showTyping(waNumber);
          const { corrected, notes } = await ai.polishEnglish(body);
          try {
            const bufEmb = await ai.speakWithClonedVoice(corrected);
            const tokenEmb = Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
            audioUrls.set(tokenEmb, { buf: bufEmb });
            setTimeout(() => audioUrls.delete(tokenEmb), 5 * 60 * 1000);
            await wa.sendAudio(waNumber, `${PUBLIC_BASE}/media/${tokenEmb}.mp3`);
            await query(`INSERT INTO messages (conversation_id, direction, kind, body) VALUES ($1,'out','audio',$2)`, [conversation.id, corrected]);
          } catch (eAud) {
            console.error('[embaixador] áudio falhou, mando em texto:', eAud.message);
            try { await wa.sendText(waNumber, corrected); } catch (_) { /* segue */ }
            await query(`INSERT INTO messages (conversation_id, direction, kind, body) VALUES ($1,'out','text',$2)`, [conversation.id, corrected]);
          }
          if (notes && !/nenhuma/i.test(notes)) {
            const notaEmb = `📝 Pronto pra encaminhar\n${notes}`;
            try { await wa.sendText(waNumber, notaEmb); } catch (_) { /* segue */ }
          }
          console.log('[embaixador] fala corrigida entregue p/ conversa', conversation.id);
          return; // no modo, a Mariana comercial não entra
        }
      } catch (eE) { console.error('[embaixador] erro no modo:', eE.message); }
    }

    // ---- IA em background: intenção + sugestão (+ auto-resposta opcional) ----
    (async () => {
      try {
        // v13.5: opt-out vence TUDO — contato marcado nunca mais recebe IA
        const ou = (await query(`SELECT opt_out FROM contacts WHERE id = $1`, [contact.id])).rows[0];
        if (ou?.opt_out) { console.log('[ia] contato opt-out — IA dispensada'); return; }

        // v13.9.4: "digitando..." já na tela do cliente enquanto a IA pensa
        showTyping(waNumber);

        // v11: lead de prospecção? → a IA troca de persona (vende o Mais Automação)
        const isProspect = (await query(
          `SELECT 1 FROM prospect_leads WHERE phone=$1 AND status IN ('fila','enviado','respondeu') LIMIT 1`,
          [waNumber]
        )).rowCount > 0;

        // v13.6.2: usa o texto final da mensagem (texto digitado OU transcrição
        // de áudio — antes ia msg.text, que é vazio em áudio transcrito).
        const recent = (await query(
          `SELECT direction, body FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10`,
          [conversation.id])).rows.reverse();

        // v13.9.4: LLMs em PARALELO (Promise.all) — intenção e resposta num
        // round-trip só (antes: fila, 2 esperas seguidas = o dobro do tempo).
        const t0 = Date.now();
        const branding = await loadBranding();
        const agHours = parseHours(branding && branding.hours); // v13.16: funcionamento (formulário → branding)
        // v13.22: TENTATIVA DUPLA — falha transitória da OpenAI (429/limite de
        // concorrência/rede) NÃO pode deixar mensagem sem resposta em silêncio
        // (6 mensagens da demo morreram assim). 2ª tentativa após 1,5s.
        const gerarIA = async () => Promise.all([
          ai.classifyIntent(body),
          ai.suggestReply(recent, {
            name: contact.name, company: contact.company, is_prospect: isProspect,
            branding,
            agenda: await availabilitySummary(agHours), // v13.16: horários livres reais
          }),
        ]);
        let intentRaw, suggestion, lastErrIA = null;
        for (let tent = 1; tent <= 3; tent++) {
          try {
            [intentRaw, suggestion] = await withAiSlot(gerarIA);
            lastErrIA = null; break;
          } catch (eIA) {
            lastErrIA = eIA;
            console.error('[ia] tentativa ' + tent + '/3 falhou (' + eIA.message + ')' + (tent < 3 ? ' — nova tentativa em ' + (tent * 3) + 's' : ''));
            if (tent < 3) await new Promise(r => setTimeout(r, tent * 3000));
          }
        }
        if (lastErrIA) {
          console.error('[ia] ❌ IA indisponível após 3 tentativas — mensagem ficará sem resposta automática:', lastErrIA.message);
          return; // v13.24: fim limpo — o log carrega o motivo exato
        }
        let intent = intentRaw;
        if (ai.detectEscalation(body)) {
          intent = 'escalacao'; // vence a classificação leve — humano precisa saber
          console.log('[escalacao] 🚨 conversa pede humano — intent marcada no painel:', waNumber);
        }
        await query(`UPDATE thread_state SET intent = $2, updated_at = now() WHERE conversation_id = $1`,
          [conversation.id, intent]);
        await query(
          `UPDATE thread_state SET next_suggestion = $2, updated_at = now() WHERE conversation_id = $1`,
          [conversation.id, suggestion]);
        console.log(`[ia] intenção + resposta prontas em ${Date.now() - t0} ms p/ conversa`, conversation.id,
          isProspect ? '(persona: vendas Mais Automação)' : '(persona: atendente do negócio)');

        // v13.2: AGENDA REAL — se a intenção é agendamento, extrai data/hora e grava
        // v13.13: CAPTURA COM CONTEXTO — a intent chega de UMA mensagem ("Sim",
        // "amanhã às 8h" não carregam palavra de agenda), então a captura também
        // dispara quando as últimas mensagens carregam sinal de agenda (regex,
        // custo zero; o parseAppointment continua sendo quem decide).
        let apptConfirmed = false; // evita mensagem dupla (confirmação 📅 + auto-resposta)
        const agendHint = /\b(agend\w*|hor[áa]rio\w*|marcar\w*|marcando|encaix\w*|reserv\w*|disponibilidade|amanh[ãa]|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)\b|\b\d{1,2}\s*(h|hrs|horas)\b/i.test(
          recent.map(m => m.body || '').join(' '));
          const lastInBody = String((recent.filter(m => m.direction === 'in').pop() || {}).body || '');
          // v13.26: APROVAÇÃO CURTA — "sim"/"quero" só abrem a captura em mensagem
          // curta (≤24 caracteres); "quero saber quem é o presidente dos USA" é
          // pergunta, não aprovação de horário (antes: reabria e disparava canned).
          const approvalSig = (/^(sim|ss|s|pode|pode ser|fechado|fechou|quero|bora|vamos)\b/i.test(lastInBody.trim()) && lastInBody.trim().length <= 24);
          const lastSig = /(agend\w*|marcar\w*|marcando|encaix\w*|reserv\w*|hor[áa]rio|disponibilidade|\bdia\s+\d{1,2}\b|\d{1,2}\/\d{1,2}\b|\b(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo|amanh[ãa]|hoje)\b|\b\d{1,2}\s*(h|hrs|horas)\b|\b\d{1,2}:\d{2}\b)/i.test(lastInBody.trim()) || approvalSig;
          // v13.25: declarado ANTES do gate (o gate o usa; antes: 'lastSig is not defined')
        // v13.26: VETO ANTI-INSISTÊNCIA — reclamação ("pare de forçar agendamento")
        // NUNCA abre a captura: antes casava "agendamento" e a pessoa recebia o
        // canned "já está na agenda" sem a IA jamais ler a reclamação.
        const vetoSig = /\b(pare|para|parar|chega|desisti)\w*\s+(de\s+)?(for[çc]a\w*|insist\w*|mandar|enviar|encher|agend\w*|marcar)|for[çc]ando|insistindo|n[ãa]o\s+(force|for[çc]a|insista|quero\s+agend|precisa\s+agend)/i.test(lastInBody);
        if (!vetoSig && (intent === 'agendamento' || lastSig)) { // v13.26: veto vence — v13.20: gate na ÚLTIMA mensagem (contexto não re-abre)
          // v13.15: parser LLM + normalização + fallback LOCAL (regex na última
          // mensagem da cliente) + log de captura — nada mais falha em silêncio.
          // v13.20: GATE — a captura só abre quando a PRÓPRIA mensagem pede
          // agenda (intent) ou traz sinal nela (dia, hora ou aprovação);
          // agradecimento/fecho NÃO re-abre (o LLM alucinava pelo contexto).
          const localAppt = parseApptLocal(lastInBody);
          const apptLLM = normAppt(await ai.parseAppointment(recent, contact.name));
          // v13.20: LOCAL vence SEMPRE (determinístico, à prova de alucinação)
          const appt = localAppt || apptLLM;
          console.log(`[agenda] captura avaliada (conv ${conversation.id}): intent=${intent} hint=${agendHint} parse=${appt ? appt.date + ' ' + appt.time : 'null'}`);
          if (appt) {
            const slot = new Date(`${appt.date}T${appt.time}:00-03:00`); // horário de Aracaju
            if (!isNaN(slot)) {
              // v13.17: nada em silêncio — horário passado TAMBÉM responde, com o próximo slot livre
              // v13.19: slot já capturado por ESTA conversa = "já anotei", não "ocupada"
              const own = await query(`SELECT 1 FROM appointments WHERE conversation_id = $1 AND scheduled_for = $2 LIMIT 1`, [conversation.id, slot.toISOString()]);
              if (own.rowCount > 0) {
                const conf = '📅 Esse horário já está na agenda! Qualquer ajuste é só me chamar 😊';
                await query(`INSERT INTO messages (conversation_id, direction, kind, body) VALUES ($1,'out','text',$2)`, [conversation.id, conf]);
                try { await wa.sendText(conversation.wa_chat_id, conf); apptConfirmed = true; } catch (_) { /* segue */ }
                console.log('[agenda] slot repetido da própria conversa — "já anotei" enviado');
                return;
              }
              const problem = slot.getTime() <= Date.now() ? await pastSlotMsg(slot, agHours) : await slotProblem(slot, agHours);
              const ins = problem ? { rowCount: 0 } : await query(
                `INSERT INTO appointments (conversation_id, service, scheduled_for)
                 VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id`,
                [conversation.id, appt.service, slot.toISOString()]);
              if (problem) {
                await query(`INSERT INTO messages (conversation_id, direction, kind, body)
                             VALUES ($1,'out','text',$2)`, [conversation.id, problem]);
                await query(`UPDATE conversations SET last_msg_at = now() WHERE id = $1`, [conversation.id]);
                try {
                  await wa.sendText(conversation.wa_chat_id, problem);
                  apptConfirmed = true; // v13.16: o aviso já respondeu — auto-resposta dispensada
                  console.log('[agenda] ⚠ fora do funcionamento — aviso enviado, nada gravado:', appt.date, appt.time);
                } catch (e2) {
                  console.error('[agenda] aviso montado, mas falhou o envio:', e2.message);
            if (waNaoExiste(e2.message)) console.error('[wa] ⚠ NÚMERO NÃO EXISTE no WhatsApp (exists:false) — número de teste ou cadastro inválido; sugestão fica no painel p/ envio manual');
                }
              } else if (ins.rowCount > 0) {
                const conf = `📅 Agendado! ${appt.service ? appt.service + ' — ' : ''}${appt.date.split('-').reverse().join('/')} às ${appt.time} (horário de Aracaju). Te mando um lembrete antes, e qualquer ajuste é só me chamar`;
                await query(`INSERT INTO messages (conversation_id, direction, kind, body)
                             VALUES ($1,'out','text',$2)`, [conversation.id, conf]);
                await query(`UPDATE thread_state SET next_suggestion = NULL WHERE conversation_id = $1`,
                  [conversation.id]);
                await query(`UPDATE conversations SET last_msg_at = now() WHERE id = $1`, [conversation.id]);
                try {
                  await wa.sendText(conversation.wa_chat_id, conf);
                  apptConfirmed = true; // 📅 já saiu — a auto-resposta vira redundante
                  console.log('[agenda] ✅ agendamento gravado e confirmado:', appt.date, appt.time);
                } catch (e2) {
                  console.error('[agenda] gravado no painel, mas falhou o envio da confirmação:', e2.message);
                  if (waNaoExiste(e2.message)) console.error('[wa] ⚠ NÚMERO NÃO EXISTE no WhatsApp (exists:false) — número de teste ou cadastro inválido; sugestão fica no painel p/ envio manual');
                }
              }
            }
          }
        }

        // ---- AUTO-RESPOSTA (interruptor AUTO_RESPOND=true + janela de horário) ----
        // v13.2: se o 📅 de confirmação já saiu, NÃO manda a sugestão também (era a duplicidade)
        if (apptConfirmed) {
          console.log('[auto] agendamento já confirmado — auto-resposta dispensada (sem duplicar)');
        } else if ((process.env.AUTO_RESPOND || 'false') === 'true') {
          if (!withinAiHours()) {
            console.log('[auto] fora da janela de horário — resposta fica como sugestão p/ envio manual');
          } else {
            // proteção anti-duplicidade: não reenvia resposta idêntica em menos de 90s
            const dupSend = await query(
              `SELECT 1 FROM messages WHERE conversation_id = $1 AND direction = 'out'
               AND body = $2 AND created_at > now() - interval '90 seconds' LIMIT 1`,
              [conversation.id, suggestion]);
            if (dupSend.rowCount > 0) {
              console.log('[auto] resposta idêntica enviada há pouco — reenvio ignorado');
            } else {
              console.log('[auto] enviando resposta automática p/ conversa', conversation.id);
              try {
                const sent = await wa.sendText(conversation.wa_chat_id, suggestion);
                await query(
                  `INSERT INTO messages (conversation_id, direction, kind, body, wa_message_id)
                   VALUES ($1,'out','text',$2,$3)`,
                  [conversation.id, suggestion, sent?.id ? String(sent.id) : (sent?.key?.id ? String(sent.key.id) : null)]
                );
                await query(`UPDATE conversations SET last_msg_at = now() WHERE id = $1`, [conversation.id]);
                await query(`UPDATE thread_state SET next_suggestion = NULL WHERE conversation_id = $1`,
                  [conversation.id]);
                console.log('[auto] ✅ resposta enviada automaticamente p/ conversa', conversation.id);
              } catch (sendErr) {
                console.error('[auto] ❌ FALHA ao enviar:', sendErr.message,
                  '— sugestão mantida p/ envio manual');
                if (waNaoExiste(sendErr.message)) console.error('[wa] ⚠ NÚMERO NÃO EXISTE no WhatsApp (exists:false) — sugestão mantida no painel');
              }
            }
          }
        } else {
          console.log('[auto] AUTO_RESPOND desativado — sugestão aguardando o vendedor');
        }
      } catch (e) { console.error('[ia] falha ao gerar sugestão:', e.message); }
    })();
  } catch (e) {
    console.error('[webhook] erro:', e.message);
  }
}
app.post('/webhooks/uazapi', waWebhook);
app.post('/webhooks/evolution', waWebhook);

/* ---------------- v13.9.3: hospedagem efêmera do áudio (sem login) ----------------
   A Evolution desta instância só aceita mídia como "url or base64" e o
   base64 quebra dentro dela — então o mp3 do TTS fica 5 minutos aqui,
   sob token aleatório (invés de adivinhar), igual ao webhook: sem login.
   O token expira do Map sozinho — a URL não fica válida para sempre. */
app.get('/media/:token', (req, res) => {
  const item = audioUrls.get(String(req.params.token).replace(/\.mp3$/, ''));
  if (!item) return res.status(404).send('audio expirado');
  res.setHeader('Content-Type', 'audio/mpeg');
  res.send(item.buf);
});

/* ---------------- UI (protegida por login quando configurado) ---------------- */
app.use(requirePanelAuth);
// HTML sempre fresco (sem cache de navegador) — evita "painel velho" após Deploy.
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
  },
}));

const PORT = process.env.PORT || 3000;
await migrate();
// v13.10: tabela da marca (white-label) — criada cedo; nunca derruba o boot
try { await query(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`); }
catch (e) { console.error('[branding] tabela app_settings:', e.message); }

/* ---------------- FASE 4: lembretes automáticos (D-1 e 2h antes) ---------------- */
const REMINDER_D1 = 'Oi! Passando para lembrar do seu horário amanhã 📅 Qualquer imprevisto, me avisa por aqui, tá?';
const REMINDER_H2 = 'Oi! Seu horário é daqui a 2 horas ⏰ Já a caminho? Qualquer coisa, me chama!';
setInterval(async () => {
  try {
    if (!withinAiHours()) return; // lembretes só na janela social
    const d1 = await query(
      `SELECT a.id, cv.wa_chat_id FROM appointments a
       JOIN conversations cv ON cv.id = a.conversation_id
       WHERE a.status = 'confirmado' AND a.reminder_1_sent IS NULL
         AND a.scheduled_for BETWEEN now() + interval '23 hours' AND now() + interval '25 hours'
       LIMIT 5`);
    for (const r of d1.rows) {
      try {
        await wa.sendText(r.wa_chat_id, REMINDER_D1);
        await query(`UPDATE appointments SET reminder_1_sent = now() WHERE id = $1`, [r.id]);
        console.log('[lembrete] D-1 enviado (appt', r.id + ')');
      } catch (e) { console.error('[lembrete] falha D-1 appt', r.id, ':', e.message); }
    }
    const h2 = await query(
      `SELECT a.id, cv.wa_chat_id FROM appointments a
       JOIN conversations cv ON cv.id = a.conversation_id
       WHERE a.status = 'confirmado' AND a.reminder_2_sent IS NULL
         AND a.scheduled_for BETWEEN now() + interval '2 hours' AND now() + interval '2 hours 10 minutes'
       LIMIT 5`);
    for (const r of h2.rows) {
      try {
        await wa.sendText(r.wa_chat_id, REMINDER_H2);
        await query(`UPDATE appointments SET reminder_2_sent = now() WHERE id = $1`, [r.id]);
        console.log('[lembrete] 2h enviado (appt', r.id + ')');
      } catch (e) { console.error('[lembrete] falha 2h appt', r.id, ':', e.message); }
    }
  } catch (e) { console.error('[lembrete] erro no worker:', e.message); }
}, 5 * 60 * 1000);

console.log(`[boot] NEON CRM v13.10 no ar | provider=${PROVIDER} | AUTO_RESPOND=${process.env.AUTO_RESPOND || '(NÃO definido!)'} | login_painel=${PANEL_USER && PANEL_PASS ? 'ATIVO' : 'desativado'} | janela_IA=${AI_WINDOW[0]}h-${AI_WINDOW[1]}h | opt-out: LIGADO (palavras-chave) | escalação: LIGADA | IA paralela + digitando... + tradutor + embaixador: LIGADOS | tranco_dev=${DEV_PASS ? 'ATIVO' : 'FECHADO (DEV_PASS ausente!)'}`);
app.listen(PORT, () => console.log(`NEON CRM no ar em ${process.env.APP_URL || 'http://localhost:' + PORT}`));

process.on('SIGTERM', () => { pool.end().then(() => process.exit(0)); });

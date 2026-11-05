/**
 * Módulo H: Drawer Lateral de Planos & Descoberta Contextual (src/ui/proDrawer.js)
 * - Descoberta Contextual (Peeking UI): Se um usuário gratuito clicar em uma função PRO,
 *   desliza suavemente um drawer lateral minimalista mostrando uma prévia da funcionalidade
 *   e o convite opcional. Sem pop-ups invasivos.
 * - Apresenta os 3 planos comerciais atualizados:
 *   1. Pro Mensal: R$ 15 / mês
 *   2. Pro Anual: R$ 120 / ano (R$ 10 / mês)
 *   3. Pro Vitalício: R$ 300 (pagamento único via PIX ou em até 12x)
 * - Botões de checkout para o Asaas e link direto para ativação gratuita de acessibilidade PcD (Lei Federal nº 13.146/2015).
 */

export const PRO_PLANS = [
  {
    id: 'mensal',
    name: 'Pro Mensal',
    priceDisplay: 'R$ 15',
    periodDisplay: '/ mês',
    subtitle: 'Renovação mensal flexível, cancele quando quiser.',
    badge: null,
    featured: false,
    checkoutUrl: 'https://www.asaas.com/c/planalto-plus-pro-mensal',
    ctaLabel: 'Assinar Mensal (R$ 15/mês)',
  },
  {
    id: 'anual',
    name: 'Pro Anual',
    priceDisplay: 'R$ 120',
    periodDisplay: '/ ano',
    equivalentMonthly: 'R$ 10 / mês',
    subtitle: 'Melhor custo-benefício para preparação contínua.',
    badge: 'Mais Escolhido • R$ 10 / mês',
    featured: true,
    checkoutUrl: 'https://www.asaas.com/c/planalto-plus-pro-anual',
    ctaLabel: 'Assinar Anual — R$ 120/ano (R$ 10/mês)',
  },
  {
    id: 'vitalicio',
    name: 'Pro Vitalício',
    priceDisplay: 'R$ 300',
    periodDisplay: 'pagamento único',
    equivalentMonthly: 'PIX ou até 12x',
    subtitle: 'Acesso definitivo sem mensalidades a todos os recursos atuais e futuros.',
    badge: 'Pagamento Único • Sem Mensalidades',
    featured: false,
    checkoutUrl: 'https://www.asaas.com/c/planalto-plus-pro-vitalicio',
    ctaLabel: 'Garantir Vitalício — R$ 300 (PIX ou 12x)',
  },
];

export const PEEKING_FEATURE_PREVIEWS = {
  podcast: {
    id: 'podcast',
    tag: 'Podcast Panorâmico da Lei Inteira',
    title: 'Ouvir Panorama da Lei (15 min)',
    description:
      'Ouça um episódio didático de 12 a 15 minutos cobrindo o objetivo e contexto da norma, explicação extensiva dos conceitos e o Top 7 artigos mais cobrados em prova (sintetizado com Google Cloud TTS WaveNet e salvo em cache global).',
    previewPoints: [
      'Roteiro completo gerado com Inteligência Artificial para estudo panorâmico',
      'Voz neural Google Cloud TTS WaveNet (pt-BR-Wavenet-B)',
      'Seletor de velocidade de 0.75x a 2x e transcrição sincronizada',
    ],
  },
  tts_article: {
    id: 'tts_article',
    tag: 'Leitura Ativa por Áudio',
    title: '🔊 Ouvir Artigo (Voz Neural / Acessibilidade)',
    description:
      'Escute qualquer artigo com voz neural WaveNet de alta naturalidade no plano PRO, ou ative gratuitamente a leitura por áudio nativa caso seja pessoa com deficiência visual.',
    previewPoints: [
      'PRO: Google Cloud TTS WaveNet (pt-BR-Wavenet-B) com Cache Global',
      'Acessibilidade PcD: 100% Gratuito e ilimitado via síntese nativa local',
      'Leitura inteligente de parágrafos, incisos e alíneas',
    ],
  },
  edital_multi: {
    id: 'edital_multi',
    tag: 'Analisador Multi-Legislações',
    title: '📄 Destaques Automáticos em Todas as Leis do Edital',
    description:
      'No modo gratuito (BYOK), o edital destaca a lei aberta no momento. No PRO, o edital inteiro é mapeado para múltiplas leis simultaneamente (CF/88, Código Penal, Lei 8.112, etc.) e destaca os artigos automaticamente conforme você navega.',
    previewPoints: [
      'Mapeamento simultâneo de todas as leis do conteúdo programático',
      'Destaques automáticos ao abrir qualquer lei prevista no edital',
      'IA nativa pronta para uso sem precisar configurar chaves',
    ],
  },
  cloud_sync: {
    id: 'cloud_sync',
    tag: 'Sincronização em Nuvem Local-First',
    title: '☁️ Backup e Sincronização Entre Computadores',
    description:
      'Seus grifos, notas e progresso da Trilha do Edital continuam salvos localmente com latência zero (0ms) e sincronizam automaticamente em segundo plano com criptografia e proteção Row-Level Security (RLS).',
    previewPoints: [
      'Latência zero (0ms) com escrita Local-First offline',
      'Sincronização automática entre casa, trabalho e notebook',
      'Resolução inteligente baseada em updated_at',
    ],
  },
  oab_trail: {
    id: 'oab_trail',
    tag: 'Mapeador OAB & Trilha do Edital',
    title: '🎯 Incidência FGV/OAB e Metas Diárias de Leitura',
    description:
      'Visualize imediatamente quais artigos mais caem no Exame de Ordem (FGV) e acompanhe sua meta diária de artigos lidos com marcação automática durante a rolagem.',
    previewPoints: [
      'Preset oficial de recorrência FGV/OAB com histórico de exames',
      'Cálculo automático de meta diária de artigos e tempo estimado',
      'Marcação automática de leitura via IntersectionObserver',
    ],
  },
};

export function getFeaturePreview(featureKey = 'podcast') {
  return (
    PEEKING_FEATURE_PREVIEWS[featureKey] || PEEKING_FEATURE_PREVIEWS.podcast
  );
}

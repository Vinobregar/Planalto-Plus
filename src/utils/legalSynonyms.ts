/**
 * Brazilian Legal Synonyms Dictionary for smart search
 */

function normalizeTerm(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export const LEGAL_SYNONYMS: Record<string, string[]> = {
  brasileiro: ['nacional', 'cidadao', 'cidadão', 'povo', 'nato', 'naturalizado', 'população'],
  cidadao: ['brasileiro', 'eleitor', 'nacional', 'administrado', 'indivíduo', 'população'],
  cidadão: ['brasileiro', 'eleitor', 'nacional', 'administrado', 'indivíduo', 'população'],
  estrangeiro: ['não nacional', 'alienígena', 'imigrante', 'apátrida'],
  presidente: ['chefe de estado', 'chefe do executivo', 'mandatário', 'presidência'],
  deputado: ['parlamentar', 'congressista', 'legislador', 'câmara dos deputados', 'câmara'],
  senador: ['parlamentar', 'congressista', 'senado federal', 'legislador', 'senado'],
  ministro: ['magistrado', 'membro do tribunal', 'auxiliar do presidente', 'ministério'],
  servidor: ['funcionário', 'agente público', 'empregado público', 'cargo público', 'função pública', 'estatutário'],
  trabalhador: ['empregado', 'obreiro', 'trabalhador urbano', 'trabalhador rural', 'laborador', 'avulso'],
  empregador: ['empresa', 'patrão', 'tomador de serviços'],
  tributo: ['imposto', 'taxa', 'contribuição', 'tarifa', 'emolumento', 'fisco'],
  imposto: ['tributo', 'taxa', 'contribuição', 'fisco', 'arrecadação'],
  voto: ['sufrágio', 'escrutínio', 'eleição', 'plebiscito', 'referendo', 'capacidade eleitoral'],
  eleição: ['pleito', 'votação', 'sufrágio', 'mandato eletivo'],
  liberdade: ['direito fundamental', 'garantia', 'livre iniciativa', 'autonomia'],
  propriedade: ['posse', 'bens', 'patrimônio', 'domínio', 'titularidade', 'desapropriação'],
  crime: ['delito', 'infração', 'contravenção', 'ilícito', 'conduta criminosa', 'tipo penal'],
  pena: ['sanção', 'reclusão', 'detenção', 'multa', 'penalidade', 'punição', 'condenação'],
  prisão: ['detenção', 'cárcere', 'reclusão', 'custódia', 'flagrante', 'preventiva', 'segregação'],
  dolo: ['intenção', 'intencional', 'deliberado', 'vontade', 'ânimo'],
  culpa: ['negligência', 'imprudência', 'imperícia', 'culposo', 'falta'],
  prazo: ['termo', 'tempestividade', 'tempestivo', 'dias', 'meses', 'anos', 'prorrogação'],
  revogado: ['revogação', 'derrogação', 'ab-rogação', 'invalidação', 'extinto', 'cessado'],
  competência: ['atribuição', 'jurisdição', 'incumbe', 'compete', 'faculdade', 'privativo'],
  indenização: ['reparação', 'ressarcimento', 'compensação', 'dano', 'perdas e danos'],
  isenção: ['imunidade', 'anistia', 'remissão', 'desoneração', 'não incidência'],
  recurso: ['apelação', 'agravo', 'embargos', 'impugnação', 'reexame', 'mandado de segurança'],
  remuneração: ['vencimento', 'subsídio', 'salário', 'proventos', 'estipêndio', 'retribuição'],
  estabilidade: ['vitaliciedade', 'efetividade', 'inamovibilidade'],
  mandato: ['mandado', 'procuração', 'representação', 'outorga', 'investidura'],
  vigência: ['vigor', 'eficácia', 'validade', 'aplicabilidade'],
  veto: ['vetado', 'rejeição', 'recusa', 'sanção'],
  licitação: ['concorrência', 'pregão', 'concurso', 'leilão', 'edital', 'dispensa', 'inexigibilidade'],
  contrato: ['pacto', 'acordo', 'convenção', 'ajuste', 'termo de cooperação'],
  processo: ['procedimento', 'rito', 'ação', 'demanda', 'lide', 'autos'],
  testemunha: ['depoente', 'testemunho', 'declaração', 'oitiva'],
  herança: ['sucessão', 'legado', 'espólio', 'herdeiro', 'quinhão'],
  família: ['casamento', 'união estável', 'cônjuge', 'companheiro', 'filiação', 'entidade familiar'],
  juiz: ['magistrado', 'julgador', 'tribunal', 'vara', 'desembargador', 'relator'],
  advogado: ['defensor', 'patrono', 'procurador', 'advocacia', 'defensoria'],
  menor: ['criança', 'adolescente', 'incapaz', 'tutela', 'curatela'],
  saúde: ['sistema único de saúde', 'sus', 'médico', 'sanitário', 'tratamento'],
  educação: ['ensino', 'escola', 'universidade', 'docente', 'pedagógico'],
  segurança: ['segurança pública', 'polícia', 'ordem pública', 'defesa social'],
  orçamento: ['lei orçamentária', 'loa', 'ldo', 'ppa', 'receita', 'despesa', 'dotação'],
  ambiente: ['meio ambiente', 'ecológico', 'ambiental', 'sustentabilidade', 'preservação', 'recursos naturais'],
};

export function getSynonymsForQuery(term: string): string[] {
  const clean = term.toLowerCase().trim();
  if (!clean || clean.length < 2) return clean ? [clean] : [];

  const normClean = normalizeTerm(clean);
  const synonyms = new Set<string>();
  synonyms.add(clean);

  // Plural/singular strip for root matching
  const root = normClean.endsWith('s') && normClean.length > 3 ? normClean.slice(0, -1) : normClean;

  for (const [key, list] of Object.entries(LEGAL_SYNONYMS)) {
    const normKey = normalizeTerm(key);
    const keyRoot = normKey.endsWith('s') && normKey.length > 3 ? normKey.slice(0, -1) : normKey;

    const matchesKey =
      normKey === normClean ||
      keyRoot === root ||
      normKey.includes(normClean) ||
      normClean.includes(normKey);

    const matchesList = list.some((item) => {
      const normItem = normalizeTerm(item);
      const itemRoot = normItem.endsWith('s') && normItem.length > 3 ? normItem.slice(0, -1) : normItem;
      return (
        normItem === normClean ||
        itemRoot === root ||
        normItem.includes(normClean) ||
        normClean.includes(normItem)
      );
    });

    if (matchesKey || matchesList) {
      synonyms.add(key);
      for (const item of list) {
        synonyms.add(item);
      }
    }
  }

  return Array.from(synonyms);
}

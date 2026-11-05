/**
 * Brazilian Legal Synonyms Dictionary for smart search
 */
export const LEGAL_SYNONYMS: Record<string, string[]> = {
  dolo: ['intenção', 'intencional', 'deliberado', 'vontade'],
  culpa: ['negligência', 'imprudência', 'imperícia', 'culposo'],
  prazo: ['termo', 'tempestividade', 'tempestivo', 'dias', 'meses', 'anos', 'prorrogação'],
  revogado: ['revogação', 'derrogação', 'ab-rogação', 'invalidação', 'extinto', 'cessado'],
  pena: ['sanção', 'reclusão', 'detenção', 'multa', 'penalidade', 'punição', 'condenação'],
  competência: ['atribuição', 'jurisdição', 'incumbe', 'compete', 'faculdade'],
  prisão: ['detenção', 'cárcere', 'reclusão', 'custódia', 'flagrante', 'preventiva'],
  propriedade: ['posse', 'bens', 'patrimônio', 'domínio', 'titularidade'],
  tributo: ['imposto', 'taxa', 'contribuição', 'tarifa', 'emolumento', 'fisco'],
  servidor: ['funcionário', 'agente público', 'empregado público', 'cargo público', 'função pública'],
  crime: ['delito', 'infração', 'contravenção', 'ilícito', 'conduta criminosa'],
  indenização: ['reparação', 'ressarcimento', 'compensação', 'dano'],
  isenção: ['imunidade', 'anistia', 'remissão', 'desoneração'],
  recurso: ['apelação', 'agravo', 'embargos', 'impugnação', 'reexame'],
  remuneração: ['vencimento', 'subsídio', 'salário', 'proventos', 'estipêndio'],
  estabilidade: ['vitaliciedade', 'efetividade', 'inamovibilidade'],
  mandato: ['mandado', 'procuração', 'representação', 'outorga'],
  vigência: ['vigor', 'eficácia', 'validade', 'aplicabilidade'],
  veto: ['vetado', 'rejeição', 'recusa'],
  licitação: ['concorrência', 'pregão', 'concurso', 'leilão', 'edital', 'dispensa'],
  contrato: ['pacto', 'acordo', 'convenção', 'ajuste'],
  processo: ['procedimento', 'rito', 'ação', 'demanda', 'lide'],
  testemunha: ['depoente', 'testemunho', 'declaração'],
  herança: ['sucessão', 'legado', 'espólio', 'herdeiro'],
  família: ['casamento', 'união estável', 'cônjuge', 'companheiro', 'filiação'],
  juiz: ['magistrado', 'julgador', 'tribunal', 'vara'],
  advogado: ['defensor', 'patrono', 'procurador', 'advocacia'],
  menor: ['criança', 'adolescente', 'incapaz', 'tutela'],
};

export function getSynonymsForQuery(term: string): string[] {
  const clean = term.toLowerCase().trim();
  const synonyms = new Set<string>();
  synonyms.add(clean);

  for (const [key, list] of Object.entries(LEGAL_SYNONYMS)) {
    if (key === clean || list.includes(clean)) {
      synonyms.add(key);
      for (const item of list) {
        synonyms.add(item);
      }
    }
  }
  return Array.from(synonyms);
}

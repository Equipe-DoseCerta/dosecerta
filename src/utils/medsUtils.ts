// src/utils/medsUtils.ts - VERSÃO OTIMIZADA

/**
 * Mapa de siglas/abreviações de formas farmacêuticas para nomes completos.
 * Inclui variações comuns, erros de digitação e formas alternativas.
 */
const FORMA_FARMACEUTICA_MAP: Record<string, string> = {
  // === COMPRIMIDOS ===
  'com': 'Comprimido',
  'com rev': 'Comprimido Revestido',
  'com mast': 'Comprimido Mastigável',
  'com efev': 'Comprimido Efervescente',
  'com sus': 'Comprimido para Suspensão',
  'com oro': 'Comprimido Orodispersível',
  'com orodisp': 'Comprimido Orodispersível',
  'com subl': 'Comprimido Sublingual',
  'com vag': 'Comprimido Vaginal',
  'com lib prol': 'Comprimido de Liberação Prolongada',
  'com lib retard': 'Comprimido de Liberação Retardada',
  'com lib lenta': 'Comprimido de Liberação Lenta',
  'com lib cont': 'Comprimido de Liberação Controlada',
  'com lib mod': 'Comprimido de Liberação Modificada',

  // === CÁPSULAS ===
  'cap': 'Cápsula',
  'cap dura': 'Cápsula Dura',
  'cap mole': 'Cápsula Mole',
  'cap lib prol': 'Cápsula de Liberação Prolongada',
  'cap lib retard': 'Cápsula de Liberação Retardada',
  'cap lib lenta': 'Cápsula de Liberação Lenta',
  'cap dura c/ mgran retard': 'Cápsula Dura com Microgrânulos de Liberação Retardada',
  'cap dura c/ mgran': 'Cápsula Dura com Microgrânulos',

  // === GRANULADOS ===
  'gran': 'Granulado',
  'gran sus or': 'Granulado para Suspensão Oral',
  'gran orodisp': 'Granulado Orodispersível',

  // === PÓS ===
  'pó liof sol inj': 'Pó Liofilizado para Solução Injetável',
  'pó sol inj': 'Pó para Solução Injetável',
  'pó liof inj': 'Pó Liofilizado para Injeção',
  'pó inj': 'Pó para Injeção',
  'pó sus inj': 'Pó para Suspensão Injetável',
  'pó sus inj lib prol': 'Pó para Suspensão Injetável de Liberação Prolongada',
  'pó sus or': 'Pó para Suspensão Oral',
  'po uso top': 'Pó de Uso Tópico',
  'po inal or': 'Pó para Inalação Oral',

  // === SOLUÇÕES ===
  'sol': 'Solução',
  'sol or': 'Solução Oral',
  'sol inj': 'Solução Injetável',
  'sol inj infus': 'Solução Injetável para Infusão',
  'sol dil inf': 'Solução para Infusão',
  'sol infus': 'Solução para Infusão',
  'sol oft': 'Solução Oftálmica',
  'sol derm': 'Solução Dermatológica',
  'sol nas': 'Solução Nasal',
  'sol got': 'Solução em Gotas',
  'sol capilar': 'Solução Capilar',
  'sol cap': 'Solução Capilar',
  'sol inal': 'Solução Inalatória',
  'sol aer dosif': 'Solução Aerossol Dosificada (Inalatória Oral)',
  'sol aer inal or': 'Solução Aerossol Inalatória Oral (com inalador)',
  'sol spr nas': 'Solução Spray Nasal',

  // === SUSPENSÕES ===
  'sus': 'Suspensão',
  'sus or': 'Suspensão Oral',
  'sus got': 'Suspensão em Gotas',
  'sus nas': 'Suspensão Nasal',
  'sus spr nas': 'Suspensão Nasal / Spray Nasal',
  'sus oft': 'Suspensão Oftálmica',
  'sus inj': 'Suspensão Injetável',
  'sus inj lib prol': 'Suspensão Injetável de Liberação Prolongada',
  'sus derm': 'Suspensão Dermatológica',

  // === XAROPES E ELIXIRES ===
  'xpe': 'Xarope',
  'elx': 'Elixir',
  'elx infantil': 'Elixir Infantil',
  'elx adulto': 'Elixir Adulto',

  // === GÉIS ===
  'gel': 'Gel',
  'gel or': 'Gel Oral',
  'gel derm': 'Gel Dermatológico',
  'gel vag': 'Gel Vaginal',
  'gel oft': 'Gel Oftálmico',

  // === POMADAS E CREMES ===
  'pom': 'Pomada',
  'pom derm': 'Pomada Dermatológica',
  'pom oft': 'Pomada Oftálmica',
  'crem': 'Creme',
  'crem derm': 'Creme Dermatológico',
  'crem vag': 'Creme Vaginal',

  // === EMULSÕES ===
  'emu': 'Emulsão',
  'emu derm': 'Emulsão Dermatológica',
  'emu oft': 'Emulsão Oftálmica',
  'emul inj': 'Emulsão Injetável',
  'emul got': 'Emulsão em Gotas',

  // === OUTROS ===
  'colut': 'Colutório Oral',
  'colut spr': 'Colutório Spray',
  'past': 'Pastilha',
  'pas dura': 'Pastilha Dura',
  'sup ret': 'Supositório Retal',
  'ovl': 'Óvulo Vaginal',
  'ades': 'Adesivo Transdérmico',
  'ades transd': 'Adesivo Transdérmico',
  'impl': 'Implante Subcutâneo',
  'impl sc': 'Implante Subcutâneo',
  'disp intra-uterino': 'Dispositivo Intrauterino (DIU)',
  'diu': 'Dispositivo Intrauterino (DIU)',
  'esm': 'Espuma',
  'shampoo': 'Shampoo Medicamentoso',
  'loção derm': 'Loção Dermatológica',
  'pasta': 'Pasta Tópica',
  'goma': 'Goma de Uso Oral',
  'fil': 'Filme / Película',
};

/**
 * Correções de erros comuns de digitação
 */
const TYPO_CORRECTIONS: Record<string, string> = {
  'comrimido': 'Comprimido',
  'compimido': 'Comprimido',
  'comprido': 'Comprimido',
  'capsula': 'Cápsula',
  'xaropre': 'Xarope',
  'solucao': 'Solução',
  'suspencao': 'Suspensão',
};

/**
 * Expande sigla/abreviação de forma farmacêutica para nome completo.
 * @param forma - Sigla ou abreviação da forma farmacêutica
 * @returns Nome completo da forma farmacêutica
 * 
 * @example
 * expandFormaFarmaceutica('com rev') // => 'Comprimido Revestido'
 * expandFormaFarmaceutica('sol inj') // => 'Solução Injetável'
 * expandFormaFarmaceutica('comrimido') // => 'Comprimido' (corrige erro)
 */
export const expandFormaFarmaceutica = (forma: string): string => {
  // Validação de entrada
  if (!forma || typeof forma !== 'string') {
    return 'Desconhecido';
  }

  const normalized = forma.trim().toLowerCase();

  // Se vazio após trim
  if (!normalized) {
    return 'Desconhecido';
  }

  // Verifica correções de erros comuns
  const typoKey = Object.keys(TYPO_CORRECTIONS).find(
    key => normalized.includes(key)
  );
  if (typoKey) {
    return TYPO_CORRECTIONS[typoKey];
  }

  // Busca no mapa principal
  const expandedForm = FORMA_FARMACEUTICA_MAP[normalized];
  if (expandedForm) {
    return expandedForm;
  }

  // Capitaliza primeira letra se não encontrar
  return forma.charAt(0).toUpperCase() + forma.slice(1).trim();
};

/**
 * Normaliza e expande múltiplas formas separadas por vírgula.
 * @param formas - String com formas separadas por vírgula
 * @returns String com formas expandidas separadas por vírgula
 * 
 * @example
 * expandMultipleFormas('com rev, sol or') 
 * // => 'Comprimido Revestido, Solução Oral'
 */
export const expandMultipleFormas = (formas: string): string => {
  if (!formas || typeof formas !== 'string') {
    return 'Desconhecido';
  }

  return formas
    .split(',')
    .map(forma => expandFormaFarmaceutica(forma.trim()))
    .filter(forma => forma !== 'Desconhecido') // Remove formas inválidas
    .join(', ');
};

/**
 * Valida se uma forma farmacêutica é reconhecida
 * @param forma - Forma farmacêutica a validar
 * @returns true se for reconhecida, false caso contrário
 */
export const isFormaValida = (forma: string): boolean => {
  if (!forma || typeof forma !== 'string') {
    return false;
  }

  const normalized = forma.trim().toLowerCase();
  return normalized in FORMA_FARMACEUTICA_MAP;
};

/**
 * Retorna todas as formas farmacêuticas disponíveis
 * @returns Array com todas as formas expandidas
 */
export const getFormasDisponiveis = (): string[] => {
  return Array.from(new Set(Object.values(FORMA_FARMACEUTICA_MAP))).sort();
};

/**
 * Busca formas farmacêuticas por termo parcial
 * @param termo - Termo de busca
 * @returns Array de formas que correspondem ao termo
 * 
 * @example
 * searchFormas('comprimido') 
 * // => ['Comprimido', 'Comprimido Revestido', 'Comprimido Mastigável', ...]
 */
export const searchFormas = (termo: string): string[] => {
  if (!termo || typeof termo !== 'string') {
    return [];
  }

  const normalized = termo.trim().toLowerCase();
  const formasUnicas = new Set(Object.values(FORMA_FARMACEUTICA_MAP));

  return Array.from(formasUnicas)
    .filter(forma => forma.toLowerCase().includes(normalized))
    .sort();
};
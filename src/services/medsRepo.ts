// src/services/medsRepo.ts - REPOSITÓRIO OTIMIZADO
// Funções de acesso ao banco SQLite local

import { initDB } from '../database/db';

/**
 * Interface do Medicamento
 */
export interface Medicamento {
  id: number;
  nome: string;
  principio_ativo?: string | null;
  concentracao?: string | null;
  via?: string | null;
  fabricante?: string | null;
  apresentacaoExpandida?: string | null;
  raw_json?: string | null;
  updated_at?: string | null;
}

/**
 * Converte row do SQLite para objeto Medicamento
 */
function rowToMedicamento(row: any): Medicamento {
  return {
    id: row.id,
    nome: row.nome,
    principio_ativo: row.principio_ativo,
    concentracao: row.concentracao,
    via: row.via,
    fabricante: row.fabricante,
    apresentacaoExpandida: row.apresentacaoExpandida,
    raw_json: row.raw_json,
    updated_at: row.updated_at,
  };
}

/**
 * Insere ou atualiza um medicamento (upsert)
 * @param med - Medicamento a ser salvo
 */
export async function insertOrReplaceMedicamento(med: Medicamento): Promise<void> {
  const db = await initDB();
  
  const query = `
    INSERT OR REPLACE INTO medicamentos
    (id, nome, principio_ativo, concentracao, via, fabricante, apresentacaoExpandida, raw_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
  
  const params = [
    med.id,
    med.nome,
    med.principio_ativo ?? null,
    med.concentracao ?? null,
    med.via ?? null,
    med.fabricante ?? null,
    med.apresentacaoExpandida ?? null,
    med.raw_json ?? JSON.stringify(med),
    med.updated_at ?? new Date().toISOString(),
  ];
  
  await db.executeSql(query, params);
  console.log(`[REPO] ✅ Medicamento salvo: ${med.nome}`);
}

/**
 * Insere múltiplos medicamentos em uma transação (mais rápido)
 * @param meds - Array de medicamentos a serem salvos
 */
export async function bulkUpsert(meds: Medicamento[]): Promise<void> {
  if (!meds || meds.length === 0) {
    console.warn('[REPO] ⚠️ Array vazio, nada a inserir');
    return;
  }

  const db = await initDB();
  
  console.log(`[REPO] 💾 Inserindo ${meds.length} medicamentos em lote...`);
  
  await db.transaction(async (tx) => {
    const query = `
      INSERT OR REPLACE INTO medicamentos
      (id, nome, principio_ativo, concentracao, via, fabricante, apresentacaoExpandida, raw_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    
    for (const med of meds) {
      const params = [
        med.id,
        med.nome,
        med.principio_ativo ?? null,
        med.concentracao ?? null,
        med.via ?? null,
        med.fabricante ?? null,
        med.apresentacaoExpandida ?? null,
        med.raw_json ?? JSON.stringify(med),
        med.updated_at ?? new Date().toISOString(),
      ];
      
      // @ts-ignore - tx.executeSql existe mas TypeScript não reconhece
      await tx.executeSql(query, params);
    }
  });
  
  console.log(`[REPO] ✅ ${meds.length} medicamentos salvos com sucesso`);
}

/**
 * Lista todos os medicamentos ordenados por nome
 * @returns Array de medicamentos
 */
export async function listMedicamentos(): Promise<Medicamento[]> {
  const db = await initDB();
  
  const query = `SELECT * FROM medicamentos ORDER BY nome COLLATE NOCASE;`;
  const [result] = await db.executeSql(query);
  
  const medicamentos: Medicamento[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    medicamentos.push(rowToMedicamento(result.rows.item(i)));
  }
  
  console.log(`[REPO] 📋 ${medicamentos.length} medicamentos carregados`);
  return medicamentos;
}

/**
 * Busca medicamentos por nome ou princípio ativo
 * @param query - Termo de busca
 * @returns Array de medicamentos filtrados
 */
export async function searchMedicamentos(query: string): Promise<Medicamento[]> {
  if (!query || query.trim().length === 0) {
    return listMedicamentos();
  }

  const db = await initDB();
  
  const sql = `
    SELECT * FROM medicamentos 
    WHERE 
      nome LIKE ? OR 
      principio_ativo LIKE ? OR
      fabricante LIKE ? OR
      concentracao LIKE ?
    ORDER BY nome COLLATE NOCASE;
  `;
  
  const like = `%${query.trim()}%`;
  const [result] = await db.executeSql(sql, [like, like, like, like]);
  
  const medicamentos: Medicamento[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    medicamentos.push(rowToMedicamento(result.rows.item(i)));
  }
  
  console.log(`[REPO] 🔍 Busca por "${query}": ${medicamentos.length} resultado(s)`);
  return medicamentos;
}

/**
 * Busca medicamentos por via de administração
 * @param via - Via de administração (Oral, Injetável, Tópica, etc)
 * @returns Array de medicamentos filtrados
 */
export async function searchByVia(via: string): Promise<Medicamento[]> {
  const db = await initDB();
  
  const query = `
    SELECT * FROM medicamentos 
    WHERE via LIKE ?
    ORDER BY nome COLLATE NOCASE;
  `;
  
  const [result] = await db.executeSql(query, [`%${via}%`]);
  
  const medicamentos: Medicamento[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    medicamentos.push(rowToMedicamento(result.rows.item(i)));
  }
  
  console.log(`[REPO] 💉 Via "${via}": ${medicamentos.length} medicamento(s)`);
  return medicamentos;
}

/**
 * Busca medicamento por ID
 * @param id - ID do medicamento
 * @returns Medicamento encontrado ou null
 */
export async function getMedicamentoById(id: number): Promise<Medicamento | null> {
  const db = await initDB();
  
  const query = `SELECT * FROM medicamentos WHERE id = ?;`;
  const [result] = await db.executeSql(query, [id]);
  
  if (result.rows.length > 0) {
    return rowToMedicamento(result.rows.item(0));
  }
  
  console.warn(`[REPO] ⚠️ Medicamento ID ${id} não encontrado`);
  return null;
}

/**
 * Conta total de medicamentos no banco
 * @returns Número total de medicamentos
 */
export async function countMedicamentos(): Promise<number> {
  const db = await initDB();
  
  const query = `SELECT COUNT(*) as total FROM medicamentos;`;
  const [result] = await db.executeSql(query);
  
  const total = result.rows.item(0).total;
  console.log(`[REPO] 📊 Total de medicamentos: ${total}`);
  
  return total;
}

/**
 * Deleta medicamento por ID
 * @param id - ID do medicamento a deletar
 */
export async function deleteMedicamento(id: number): Promise<void> {
  const db = await initDB();
  
  const query = `DELETE FROM medicamentos WHERE id = ?;`;
  await db.executeSql(query, [id]);
  
  console.log(`[REPO] 🗑️ Medicamento ID ${id} removido`);
}

/**
 * Deleta todos os medicamentos
 */
export async function deleteAllMedicamentos(): Promise<void> {
  const db = await initDB();
  
  const query = `DELETE FROM medicamentos;`;
  await db.executeSql(query);
  
  console.log('[REPO] 🗑️ Todos os medicamentos removidos');
}

/**
 * Retorna medicamentos mais recentes (últimos atualizados)
 * @param limit - Número máximo de resultados
 * @returns Array de medicamentos
 */
export async function getRecentMedicamentos(limit: number = 10): Promise<Medicamento[]> {
  const db = await initDB();
  
  const query = `
    SELECT * FROM medicamentos 
    ORDER BY updated_at DESC 
    LIMIT ?;
  `;
  
  const [result] = await db.executeSql(query, [limit]);
  
  const medicamentos: Medicamento[] = [];
  for (let i = 0; i < result.rows.length; i++) {
    medicamentos.push(rowToMedicamento(result.rows.item(i)));
  }
  
  return medicamentos;
}

/**
 * Retorna estatísticas do banco de dados
 */
export async function getStats(): Promise<{
  total: number;
  porVia: Record<string, number>;
  ultimaAtualizacao: string | null;
}> {
  const db = await initDB();
  
  // Total
  const [totalResult] = await db.executeSql('SELECT COUNT(*) as total FROM medicamentos;');
  const total = totalResult.rows.item(0).total;
  
  // Por via
  const [viaResult] = await db.executeSql(`
    SELECT via, COUNT(*) as count 
    FROM medicamentos 
    WHERE via IS NOT NULL 
    GROUP BY via;
  `);
  
  const porVia: Record<string, number> = {};
  for (let i = 0; i < viaResult.rows.length; i++) {
    const row = viaResult.rows.item(i);
    porVia[row.via] = row.count;
  }
  
  // Última atualização
  const [updateResult] = await db.executeSql(`
    SELECT MAX(updated_at) as ultima 
    FROM medicamentos;
  `);
  const ultimaAtualizacao = updateResult.rows.item(0).ultima;
  
  return { total, porVia, ultimaAtualizacao };
}
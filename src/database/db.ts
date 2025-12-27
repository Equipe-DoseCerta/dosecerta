// db.ts - VERSÃO COMPLETA E CORRIGIDA
import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';
import { expandFormaFarmaceutica } from '../utils/medsUtils';

SQLite.DEBUG(false);
SQLite.enablePromise(true);

let dbInstance: SQLiteDatabase | null = null;

export async function initDB(): Promise<SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await SQLite.openDatabase({
      name: 'dosecerta.db',
      location: 'default',
    });

    console.log('[DB] ✅ Banco inicializado');
    return dbInstance;
  } catch (error) {
    console.error('[DB] ❌ Erro ao inicializar:', error);
    throw error;
  }
}

export async function closeDB(): Promise<void> {
  if (!dbInstance) return;

  try {
    await dbInstance.close();
    console.log('[DB] 🔒 Conexão fechada');
    dbInstance = null;
  } catch (error) {
    console.warn('[DB] ⚠️ Falha ao fechar:', error);
  }
}

/**
 * Migra o schema da tabela medicamentos se necessário
 */
export async function migrateTables(): Promise<void> {
  const db = await initDB();
  
  try {
    // Verifica se a coluna apresentacaoExpandida existe
    const [result] = await db.executeSql(
      "PRAGMA table_info(medicamentos);"
    );
    
    const columns = [];
    for (let i = 0; i < result.rows.length; i++) {
      columns.push(result.rows.item(i).name);
    }
    
    // Se a coluna não existir, altera a tabela
    if (!columns.includes('apresentacaoExpandida')) {
      console.log('[DB] 🔄 Migrando schema: adicionando coluna apresentacaoExpandida');
      
      await db.executeSql(`
        ALTER TABLE medicamentos 
        ADD COLUMN apresentacaoExpandida TEXT;
      `);
      
      console.log('[DB] ✅ Schema migrado com sucesso');
    }
    
  } catch (error) {
    console.error('[DB] ❌ Erro na migração:', error);
    throw error;
  }
}

/**
 * Cria tabelas + tabela de METADADOS para controle de sync
 */
export async function createTables(): Promise<void> {
  const db = await initDB();

  const createMedicamentosTable = `
    CREATE TABLE IF NOT EXISTS medicamentos (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      principio_ativo TEXT,
      concentracao TEXT,
      via TEXT,
      fabricante TEXT,
      apresentacaoExpandida TEXT,
      raw_json TEXT,
      updated_at TEXT
    );
  `;

  const createMetadataTable = `
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndex = `
    CREATE INDEX IF NOT EXISTS idx_nome ON medicamentos(nome);
  `;

  try {
    await db.executeSql(createMedicamentosTable);
    await db.executeSql(createMetadataTable);
    await db.executeSql(createIndex);
    
    // Executa migração após criar tabelas
    await migrateTables();
    
    console.log('[DB] ✅ Tabelas e índices criados/verificados');
  } catch (error) {
    console.error('[DB] ❌ Erro ao criar tabelas:', error);
    throw error;
  }
}

/**
 * Salva metadado (última sync, versão, etc)
 */
export async function setMetadata(key: string, value: string): Promise<void> {
  const db = await initDB();
  const query = `
    INSERT OR REPLACE INTO app_metadata (key, value, updated_at)
    VALUES (?, ?, datetime('now'));
  `;
  await db.executeSql(query, [key, value]);
}

/**
 * Recupera metadado
 */
export async function getMetadata(key: string): Promise<string | null> {
  const db = await initDB();
  const query = `SELECT value FROM app_metadata WHERE key = ?;`;
  const [result] = await db.executeSql(query, [key]);

  if (result.rows.length > 0) {
    return result.rows.item(0).value;
  }
  return null;
}

/**
 * Verifica se é a primeira carga (DB vazio ou sem última sync)
 */
export async function isPrimeiraLeitura(): Promise<boolean> {
  const db = await initDB();
  
  // Verifica se existe algum medicamento
  const [countResult] = await db.executeSql('SELECT COUNT(*) as total FROM medicamentos;');
  const total = countResult.rows.item(0).total;

  if (total === 0) return true;

  // Verifica se já houve sync anterior
  const lastSync = await getMetadata('last_sync');
  return lastSync === null;
}

/**
 * Limpa TODOS os medicamentos (usado apenas em sync completa)
 */
export async function clearAllMedicamentos(): Promise<void> {
  const db = await initDB();
  await db.executeSql('DELETE FROM medicamentos;');
  console.log('[DB] 🗑️ Todos os medicamentos removidos');
}

/**
 * Insere medicamento com forma farmacêutica expandida
 */
export async function insertMedicamento(
  nome: string,
  principioAtivo: string,
  fabricante: string,
  concentracao: string,
  formaFarmaceutica: string,
  via: string,
  syncTimestamp: number
): Promise<void> {
  const db = await initDB();

  const apresentacaoExpandida = expandFormaFarmaceutica(formaFarmaceutica);

  const query = `
    INSERT OR REPLACE INTO medicamentos
    (nome, principio_ativo, fabricante, concentracao, apresentacaoExpandida, via, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `;

  const params = [
    nome,
    principioAtivo,
    fabricante,
    concentracao,
    apresentacaoExpandida,
    via,
    new Date(syncTimestamp).toISOString(),
  ];

  await db.executeSql(query, params);
}

/**
 * Executa query genérica
 */
export async function executeQuery(query: string, params: any[] = []): Promise<any> {
  const db = await initDB();
  return await db.executeSql(query, params);
}

/**
 * Reset completo do banco de dados (útil para desenvolvimento)
 */
export async function resetDatabase(): Promise<void> {
  try {
    const db = await initDB();
    
    console.log('[DB] ♻️ Resetando banco de dados...');
    
    await db.executeSql('DROP TABLE IF EXISTS medicamentos;');
    await db.executeSql('DROP TABLE IF EXISTS app_metadata;');
    
    console.log('[DB] ✅ Tabelas removidas');
    
    // Recria as tabelas com schema atualizado
    await createTables();
    
    console.log('[DB] ✅ Banco de dados resetado com sucesso');
    
  } catch (error) {
    console.error('[DB] ❌ Erro ao resetar banco:', error);
    throw error;
  }
}

/**
 * Verifica a estrutura atual da tabela medicamentos (para debug)
 */
export async function debugTableStructure(): Promise<void> {
  const db = await initDB();
  
  try {
    const [result] = await db.executeSql("PRAGMA table_info(medicamentos);");
    
    console.log('[DB] 🔍 Estrutura da tabela medicamentos:');
    for (let i = 0; i < result.rows.length; i++) {
      const column = result.rows.item(i);
      console.log(`[DB]   - ${column.name} (${column.type})`);
    }
    
    // Conta registros
    const [countResult] = await db.executeSql('SELECT COUNT(*) as total FROM medicamentos;');
    console.log(`[DB] 📊 Total de registros: ${countResult.rows.item(0).total}`);
    
  } catch (error) {
    console.error('[DB] ❌ Erro ao verificar estrutura:', error);
  }
}

/**
 * Backup dos metadados atuais (útil para migrações)
 */
export async function backupMetadata(): Promise<Record<string, string>> {
  // Removida a variável 'db' não utilizada
  try {
    const [result] = await executeQuery('SELECT * FROM app_metadata;');
    
    const metadata: Record<string, string> = {};
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      metadata[row.key] = row.value;
    }
    
    console.log('[DB] 💾 Backup de metadados realizado');
    return metadata;
    
  } catch (error) {
    console.error('[DB] ❌ Erro no backup de metadados:', error);
    return {};
  }
}

/**
 * Restaura metadados de backup
 */
export async function restoreMetadata(metadata: Record<string, string>): Promise<void> {
  // Removida a variável 'db' não utilizada
  try {
    for (const [key, value] of Object.entries(metadata)) {
      await setMetadata(key, value);
    }
    
    console.log('[DB] 🔄 Metadados restaurados do backup');
    
  } catch (error) {
    console.error('[DB] ❌ Erro ao restaurar metadados:', error);
    throw error;
  }
}
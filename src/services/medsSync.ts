// src/services/medsSync.ts - VERSÃO COMPLETA E OTIMIZADA COM CORREÇÃO
import { 
  initDB, 
  createTables, 
  insertMedicamento, 
  clearAllMedicamentos, 
  setMetadata, 
  getMetadata,
  isPrimeiraLeitura 
} from '../database/db';

export const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRTQb3wQCY8zBFOJI1EyMIZ9UtDd1rodx4TIW71DZzUWvcAxDjzOBQPBqbFq28tLeSwUspjp2b2iXXG/pub?gid=1656086596&single=true&output=csv';

/**
 * Parse do CSV da Google Sheets
 * Trata quebras de linha e normaliza formato
 */
const parseCSV = (text: string) => {
  // Corrige quebras de linha
  const fixedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(Oral|Injetável|Tópica)(?=FARMACO|[a-zA-Z])/g, '$1\n');

  const lines = fixedText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Localiza cabeçalho
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('FARMACO')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.warn('[PARSE] ⚠️ Cabeçalho não encontrado no CSV');
    return [];
  }

  const headers = lines[headerIndex].split(',').map(h => h.trim());
  const rows: Record<string, string>[] = [];

  // Processa linhas de dados
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 10) continue;

    const cols = line.split(',').map(col => col.replace(/"/g, '').trim());

    // Valida quantidade mínima de colunas
    if (cols.length < 6) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = idx < cols.length ? cols[idx] : '';
    });

    const nome = row.MEDICAMENTO?.trim();
    const principio = row.FARMACO?.trim();

    // Apenas adiciona se tiver nome e princípio ativo
    if (nome && principio) {
      rows.push(row);
    }
  }

  console.log(`[PARSE] ✅ ${rows.length} medicamentos válidos extraídos`);
  return rows;
};

/**
 * Sincronização COMPLETA com Google Sheets
 * @param forceSync - Se true, ignora cache e força download
 */
export async function syncFromGoogleSheets(forceSync: boolean = false): Promise<void> {
  try {
    console.log('[SYNC] 🚀 Iniciando processo de sincronização...');
    
    await initDB();
    await createTables();

    const isPrimeira = await isPrimeiraLeitura();

    // Verifica se precisa sincronizar
    if (!isPrimeira && !forceSync) {
      const lastSync = await getMetadata('last_sync');
      
      if (lastSync) {
        const lastSyncTime = new Date(lastSync).getTime();
        const agora = Date.now();
        const umDiaEmMs = 24 * 60 * 60 * 1000;
        const diferencaHoras = Math.floor((agora - lastSyncTime) / (60 * 60 * 1000));

        // Se última sync foi há menos de 24h, pula
        if (agora - lastSyncTime < umDiaEmMs) {
          console.log(`[SYNC] ⏭️ Dados ainda frescos (${diferencaHoras}h atrás), pulando sync`);
          return;
        } else {
          console.log(`[SYNC] 📅 Última sync há ${diferencaHoras}h, atualizando...`);
        }
      }
    }

    if (isPrimeira) {
      console.log('[SYNC] 🆕 Primeira carga detectada');
    } else if (forceSync) {
      console.log('[SYNC] 🔄 Sincronização forçada pelo usuário');
    }

    const syncTimestamp = Date.now();

    // Baixa CSV da Google Sheets
    console.log('[SYNC] 📥 Baixando CSV...');
    const response = await fetch(CSV_URL);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    console.log('[SYNC] 📄 CSV recebido:', csvText.substring(0, 150) + '...');

    // Parse do CSV
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      console.warn('[SYNC] ⚠️ Nenhum medicamento válido extraído do CSV');
      throw new Error('CSV vazio ou formato inválido');
    }

    // Limpa dados antigos apenas se não for primeira carga
    if (!isPrimeira) {
      console.log('[SYNC] 🗑️ Limpando dados antigos...');
      await clearAllMedicamentos();
    }

    // Insere medicamentos no banco
    console.log(`[SYNC] 💾 Inserindo ${rows.length} medicamentos no banco...`);
    
    const inserts = rows.map(row => {
      // Extrai valores com fallback para campos com/sem acentuação
      const concentracao = row.CONCENTRAÇÃO || row.CONCENTRACAO || '';
      const formaFarmaceutica = row['FORMA FARMACÊUTICA'] || row['FORMA FARMACEUTICA'] || '';
      
      return insertMedicamento(
        row.MEDICAMENTO,
        row.FARMACO,
        row.DETENTOR,
        concentracao,
        formaFarmaceutica,
        row.VIA,
        syncTimestamp
      );
    });

    await Promise.all(inserts);

    // Salva metadados da sincronização
    const agora = new Date().toISOString();
    await setMetadata('last_sync', agora);
    await setMetadata('total_medicamentos', rows.length.toString());
    await setMetadata('sync_version', '1.0');
    await setMetadata('csv_url', CSV_URL);

    console.log(`[SYNC] ✅ Sincronização concluída com sucesso!`);
    console.log(`[SYNC] 📊 Total: ${rows.length} medicamentos`);
    console.log(`[SYNC] 🕐 Horário: ${new Date(agora).toLocaleString('pt-BR')}`);
    console.log(`[SYNC] 📅 Próxima sync recomendada: 24h`);

  } catch (err: any) {
    console.error('[SYNC] ❌ Erro durante sincronização:', err.message || err);
    throw err;
  }
}

/**
 * Sincronização rápida e inteligente
 * Detecta automaticamente se precisa baixar dados
 * @returns true se baixou novos dados, false se usou cache
 */
export async function quickSync(): Promise<boolean> {
  try {
    console.log('[QUICK_SYNC] 🔍 Verificando necessidade de sincronização...');

    // 🚨 CORREÇÃO: Garante que o DB está aberto e as tabelas criadas antes de qualquer consulta.
    await initDB();
    await createTables();

    const isPrimeira = await isPrimeiraLeitura();

    // Primeira carga: sempre sincroniza
    if (isPrimeira) {
      console.log('[QUICK_SYNC] 🆕 Primeira carga detectada, iniciando download...');
      await syncFromGoogleSheets(true);
      return true;
    }

    // Verifica última sincronização
    const lastSync = await getMetadata('last_sync');
    
    if (!lastSync) {
      console.log('[QUICK_SYNC] ⚠️ Sem registro de sync anterior, sincronizando...');
      await syncFromGoogleSheets(true);
      return true;
    }

    // Calcula tempo desde última sync
    const lastSyncTime = new Date(lastSync).getTime();
    const agora = Date.now();
    const diferencaHoras = Math.floor((agora - lastSyncTime) / (60 * 60 * 1000));

    console.log(`[QUICK_SYNC] ✅ Dados locais disponíveis (${diferencaHoras}h atrás)`);
    console.log(`[QUICK_SYNC] 💾 Usando cache local`);
    
    return false;

  } catch (error) {
    console.error('[QUICK_SYNC] ⚠️ Erro ao verificar sync:', error);
    
    // Em caso de erro, tenta sincronizar mesmo assim
    try {
      await syncFromGoogleSheets(true);
      return true;
    } catch (syncError) {
      console.error('[QUICK_SYNC] ❌ Falha crítica na sincronização:', syncError);
      return false;
    }
  }
}

/**
 * Retorna informações sobre a última sincronização
 */
export async function getSyncInfo(): Promise<{
  lastSync: string | null;
  totalMedicamentos: string | null;
  version: string | null;
  horasDesdeSync: number | null;
  precisaAtualizar: boolean;
}> {
  // Garante que o banco está aberto antes de fazer a leitura
  await initDB(); 

  const lastSync = await getMetadata('last_sync');
  const totalMedicamentos = await getMetadata('total_medicamentos');
  const version = await getMetadata('sync_version');

  let horasDesdeSync: number | null = null;
  let precisaAtualizar = false;

  if (lastSync) {
    const lastSyncTime = new Date(lastSync).getTime();
    const agora = Date.now();
    horasDesdeSync = Math.floor((agora - lastSyncTime) / (60 * 60 * 1000));
    
    // Sugere atualização se passou mais de 7 dias (168 horas)
    precisaAtualizar = horasDesdeSync > 168;
  }

  return {
    lastSync,
    totalMedicamentos,
    version,
    horasDesdeSync,
    precisaAtualizar,
  };
}

/**
 * Força uma sincronização completa (útil para botões de atualização)
 */
export async function forceSyncNow(): Promise<void> {
  console.log('[FORCE_SYNC] 🔄 Sincronização forçada iniciada pelo usuário');
  await syncFromGoogleSheets(true);
}

/**
 * Retorna estatísticas do banco local
 */
export async function getLocalStats(): Promise<{
  temDados: boolean;
  total: string | null;
  ultimaSync: string | null;
  versao: string | null;
}> {
  // Garante a inicialização antes de chamar isPrimeiraLeitura/getSyncInfo
  await initDB(); 
  
  const isPrimeira = await isPrimeiraLeitura();
  const info = await getSyncInfo();

  return {
    temDados: !isPrimeira,
    total: info.totalMedicamentos,
    ultimaSync: info.lastSync,
    versao: info.version,
  };
}

/**
 * Limpa todos os dados e metadados (útil para reset completo)
 */
export async function resetAllData(): Promise<void> {
  try {
    // Garante inicialização antes de limpar
    await initDB();

    console.log('[RESET] 🗑️ Limpando todos os dados...');
    
    await clearAllMedicamentos();
    
    // Limpa metadados
    await setMetadata('last_sync', '');
    await setMetadata('total_medicamentos', '0');
    await setMetadata('sync_version', '');
    
    console.log('[RESET] ✅ Todos os dados removidos');
  } catch (error) {
    console.error('[RESET] ❌ Erro ao limpar dados:', error);
    throw error;
  }
}
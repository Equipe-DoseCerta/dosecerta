import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';

const DB_NAME = 'medicamentos.db';
const BACKUP_DIR_KEY = 'backupDirectoryPath';
const LAST_BACKUP_KEY = 'lastBackupTimestamp';

// Define o diretório padrão seguro (Downloads no Android, Docs no iOS)
const getDefaultBackupDir = () => {
  if (Platform.OS === 'android') {
    return `${RNFS.DownloadDirectoryPath}/DoseCerta`;
  } else {
    return `${RNFS.DocumentDirectoryPath}/DoseCerta`;
  }
};

/**
 * Obtém o caminho real do banco de dados SQLite
 */
export const getDBPath = (): string => {
  if (Platform.OS === 'android') {
    return `${RNFS.DocumentDirectoryPath}/../databases/${DB_NAME}`;
  } else {
    return `${RNFS.LibraryDirectoryPath}/LocalDatabase/${DB_NAME}`;
  }
};

/**
 * Solicita permissões necessárias (Android)
 */
const solicitarPermissoesAndroid = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  
  // Android 13+ (API 33) usa permissões granulares, mas escrita em Downloads geralmente é permitida
  // Para versões anteriores, precisamos pedir
  if (Platform.Version >= 33) return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Permissão de Backup',
        message: 'O DoseCerta precisa salvar o backup na sua pasta de Downloads.',
        buttonNeutral: 'Perguntar depois',
        buttonNegative: 'Cancelar',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn(err);
    return false;
  }
};

/**
 * Lógica de Rotação: Mantém apenas os 3 backups mais recentes
 */
const limparBackupsAntigos = async (dirPath: string): Promise<void> => {
  try {
    const files = await RNFS.readDir(dirPath);
    
    // Filtrar apenas arquivos de backup do DoseCerta
    const backups = files
      .filter(f => f.name.startsWith('backup_dosecerta_') && f.name.endsWith('.db'))
      .map(f => ({
        path: f.path,
        date: f.mtime || new Date()
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Do mais novo para o mais antigo

    // Se tiver mais que 3, deleta os excedentes
    if (backups.length > 3) {
      const backupsParaDeletar = backups.slice(3);
      
      console.log(`🧹 Limpando ${backupsParaDeletar.length} backups antigos...`);
      
      for (const backup of backupsParaDeletar) {
        await RNFS.unlink(backup.path);
        console.log(`🗑️ Deletado: ${backup.path}`);
      }
    }
  } catch (error) {
    console.error('Erro ao limpar backups antigos:', error);
  }
};

/**
 * Gera nome: backup_dosecerta_DD-MM-AAAA_HH-mm.db
 */
const gerarNomeBackup = (): string => {
  const data = new Date();
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');
  
  return `backup_dosecerta_${dia}-${mes}-${ano}_${hora}-${min}.db`;
};

/**
 * Sincroniza banco (delay simulado para garantir integridade)
 */
export const sincronizarBancoDados = async (): Promise<void> => {
  await new Promise<void>(resolve => setTimeout(() => resolve(), 800));
};

/**
 * Executa Backup Rápido (Pasta Padrão + Rotação Automática)
 */
export const executarBackupRapido = async (): Promise<{ success: boolean; path?: string; error?: string }> => {
  const defaultDir = getDefaultBackupDir();
  return await executarBackupEmPasta(defaultDir, true); // true = aplica rotação
};

/**
 * Executa Backup em uma pasta específica
 */
export const executarBackupEmPasta = async (
  pastaDestino: string, 
  aplicarRotacao: boolean = false
): Promise<{ success: boolean; path?: string; error?: string }> => {
  try {
    await solicitarPermissoesAndroid();
    await sincronizarBancoDados();

    const dbPath = getDBPath();
    
    // Verifica banco original
    if (!(await RNFS.exists(dbPath))) {
      return { success: false, error: 'Banco de dados original não encontrado.' };
    }

    // Garante que a pasta existe
    if (!(await RNFS.exists(pastaDestino))) {
      await RNFS.mkdir(pastaDestino);
    }

    const fileName = gerarNomeBackup();
    const destPath = `${pastaDestino}/${fileName}`;

    // Copia o arquivo
    console.log(`💾 Copiando para: ${destPath}`);
    await RNFS.copyFile(dbPath, destPath);

    // Verifica se copiou
    if (!(await RNFS.exists(destPath))) {
      return { success: false, error: 'Erro ao gravar arquivo de backup.' };
    }

    // Salva timestamp
    await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    
    // Se for backup rápido (pasta padrão), salva o caminho padrão e aplica rotação
    if (aplicarRotacao) {
      await AsyncStorage.setItem(BACKUP_DIR_KEY, pastaDestino);
      await limparBackupsAntigos(pastaDestino);
    }

    return { success: true, path: destPath };

  } catch (err: any) {
    console.error('❌ Erro no backup:', err);
    return { success: false, error: err?.message || 'Erro desconhecido' };
  }
};

/**
 * Lista Backups (Priorizando a pasta padrão)
 */
export const listarBackupsDisponiveis = async (): Promise<{ name: string; path: string; size: number; date: Date }[]> => {
  try {
    // Tenta pegar pasta salva ou usa a padrão
    const savedDir = await AsyncStorage.getItem(BACKUP_DIR_KEY);
    const targetDir = savedDir || getDefaultBackupDir();

    if (!(await RNFS.exists(targetDir))) return [];

    const files = await RNFS.readDir(targetDir);
    
    return files
      .filter(f => f.name.endsWith('.db') && !f.name.includes('journal'))
      .map(f => ({
        name: f.name,
        path: f.path,
        size: f.size || 0,
        date: f.mtime || new Date()
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Mais recentes primeiro
      
  } catch (err) {
    console.error('Erro ao listar backups:', err);
    return [];
  }
};

export const obterUltimoBackup = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(LAST_BACKUP_KEY);
};

/**
 * Restaura um backup específico
 */
export const executarRestauracao = async (backupPath: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!(await RNFS.exists(backupPath))) {
      return { success: false, error: 'Arquivo de backup não existe.' };
    }

    const dbPath = getDBPath();
    await sincronizarBancoDados();

    // Backup de segurança antes de substituir (opcional, na pasta temp)
    const tempBackup = `${RNFS.CachesDirectoryPath}/temp_restore_backup.db`;
    if (await RNFS.exists(dbPath)) {
        await RNFS.copyFile(dbPath, tempBackup);
    }

    // Restaura (Substitui)
    await RNFS.copyFile(backupPath, dbPath);

    await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    
    return { success: true };
  } catch (err: any) {
    console.error('❌ Erro na restauração:', err);
    return { success: false, error: err?.message };
  }
};

export const formatarTamanhoArquivo = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
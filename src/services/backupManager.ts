// backupManager.ts - Versão Refatorada e Corrigida
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';
import { fecharBancoDados } from '../database/database';

const DB_NAME = 'medicamentos.db';
const BACKUP_DIR_KEY = 'backupDirectoryPath';
const LAST_BACKUP_KEY = 'lastBackupTimestamp';
const ROOT_BACKUP_FOLDER = 'DoseCerta'; 
const MAX_BACKUPS = 3; 

/**
 * Obtém o caminho raiz do dispositivo para backup (Documents)
 */
const getRootPath = (): string => {
  return Platform.OS === 'android' 
    ? `${RNFS.ExternalStorageDirectoryPath}/Documents` 
    : RNFS.DocumentDirectoryPath;
};

/**
 * Obtém o diretório padrão de backup: Documents/DoseCerta
 */
const getDefaultBackupDir = (): string => {
  const root = getRootPath();
  return `${root}/${ROOT_BACKUP_FOLDER}`;
};

/**
 * Obtém o caminho real do banco de dados SQLite
 */
export const getDBPath = async (): Promise<string> => {
  if (Platform.OS === 'android') {
    return `/data/data/com.dosecerta/databases/${DB_NAME}`;
  } else {
    return `${RNFS.LibraryDirectoryPath}/LocalDatabase/${DB_NAME}`;
  }
};

/**
 * Solicita permissões de armazenamento (Android)
 */
const solicitarPermissoesAndroid = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  try {
    if (Platform.Version >= 30) return true;
    
    const permissions = [
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    ];

    const granted = await PermissionsAndroid.requestMultiple(permissions);
    
    return (
      granted['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (err) {
    console.error('Erro permissão:', err);
    return false;
  }
};

/**
 * Mantém apenas os 3 backups mais recentes
 */
const limparBackupsAntigos = async (dirPath: string): Promise<void> => {
  try {
    if (dirPath.startsWith('content://')) return;
    const exists = await RNFS.exists(dirPath);
    if (!exists) return;
    const files = await RNFS.readDir(dirPath);
    const backups = files
      .filter(f => f.name.startsWith('backup_dosecerta_') && f.name.endsWith('.db'))
      .map(f => ({
        path: f.path,
        date: f.mtime || new Date(0)
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    if (backups.length > MAX_BACKUPS) {
      const paraRemover = backups.slice(MAX_BACKUPS);
      for (const backup of paraRemover) {
        try {
          if (await RNFS.exists(backup.path)) {
            await RNFS.unlink(backup.path);
          }
        } catch {
          // Silencioso
        }
      }
    }
  } catch (error) {
    console.error('Erro ao limpar backups:', error);
  }
};

const gerarNomeBackup = (): string => {
  const data = new Date();
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');
  return `backup_dosecerta_${ano}-${mes}-${dia}_${hora}-${min}.db`;
};

export const sincronizarBancoDados = async (): Promise<void> => {
  await new Promise<void>(resolve => {
    setTimeout(() => resolve(), 1000);
  });
};

const garantirPastaRaiz = async (): Promise<string> => {
  const defaultDir = getDefaultBackupDir();
  try {
    const exists = await RNFS.exists(defaultDir);
    if (!exists) {
      await RNFS.mkdir(defaultDir);
    }
    return defaultDir;
  } catch (err) {
    console.error('Erro ao criar pasta DoseCerta:', err);
    const fallbackDir = `${RNFS.DocumentDirectoryPath}/DoseCerta`;
    if (!(await RNFS.exists(fallbackDir))) {
      await RNFS.mkdir(fallbackDir);
    }
    return fallbackDir;
  }
};

export const executarBackupRapido = async (): Promise<{ 
  success: boolean; 
  path?: string; 
  error?: string 
}> => {
  try {
    const hasPermission = await solicitarPermissoesAndroid();
    if (!hasPermission) {
      return { success: false, error: 'Permissão de armazenamento negada.' };
    }
    const defaultDir = await garantirPastaRaiz();
    return await executarBackupEmPasta(defaultDir, true);
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao criar backup rápido' };
  }
};

export const executarBackupEmPasta = async (
  pastaDestino: string, 
  ehPastaPadrao: boolean = false
): Promise<{ success: boolean; path?: string; error?: string }> => {
  try {
    await solicitarPermissoesAndroid();
    await sincronizarBancoDados();
    const dbPath = await getDBPath();
    const dbExists = await RNFS.exists(dbPath);
    
    if (!dbExists) {
      return { success: false, error: 'Banco de dados não encontrado.' };
    }

    const fileName = gerarNomeBackup();
    let destPath = '';

    if (pastaDestino.startsWith('content://')) {
      const cachePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      await RNFS.copyFile(dbPath, cachePath);
      try {
        await RNFS.copyFile(cachePath, `${pastaDestino}/${fileName}`);
        await RNFS.unlink(cachePath);
      } catch {
        throw new Error('Erro ao gravar na pasta selecionada. Tente a pasta padrão.');
      }
      destPath = `${pastaDestino}/${fileName}`;
    } else {
      if (!(await RNFS.exists(pastaDestino))) {
        await RNFS.mkdir(pastaDestino);
      }
      destPath = `${pastaDestino}/${fileName}`;
      if (await RNFS.exists(destPath)) await RNFS.unlink(destPath);
      await RNFS.copyFile(dbPath, destPath);
    }

    await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    if (ehPastaPadrao) await AsyncStorage.setItem(BACKUP_DIR_KEY, pastaDestino);
    if (!pastaDestino.startsWith('content://')) await limparBackupsAntigos(pastaDestino);

    return { success: true, path: destPath };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao realizar backup' };
  }
};

/**
 * Busca backups estritamente na pasta padrão (Documents/DoseCerta)
 */
export const buscarBackupsNaRaiz = async (): Promise<{
  name: string;
  path: string;
  size: number;
  date: Date;
}[]> => {
  try {
    await solicitarPermissoesAndroid();

    // Foco estrito no caminho solicitado: Documents/DoseCerta/
    const defaultDir = getDefaultBackupDir();
    
    try {
      const exists = await RNFS.exists(defaultDir);
      if (exists) {
        const files = await RNFS.readDir(defaultDir);
        return files
          .filter(f => f.name.startsWith('backup_dosecerta_') && f.name.endsWith('.db'))
          .map(f => ({
            name: f.name,
            path: f.path,
            size: f.size || 0,
            date: f.mtime || new Date()
          }))
          .sort((a, b) => b.date.getTime() - a.date.getTime());
      }
    } catch (err) {
      console.error('Erro ao ler diretório DoseCerta:', err);
    }

    return [];
  } catch {
    return [];
  }
};

export const obterUltimoBackup = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
};

/**
 * Restaura um backup substituindo o banco de dados atual.
 */
export const executarRestauracao = async (
  backupPath: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const hasPermission = await solicitarPermissoesAndroid();
    if (!hasPermission) {
      return { success: false, error: 'Permissão de acesso ao arquivo negada.' };
    }

    const dbPath = await getDBPath();
    let sourcePath = backupPath;
    
    if (backupPath.startsWith('content://')) {
      sourcePath = `${RNFS.CachesDirectoryPath}/restore_temp.db`;
      if (await RNFS.exists(sourcePath)) await RNFS.unlink(sourcePath);
      await RNFS.copyFile(backupPath, sourcePath);
    }

    if (!(await RNFS.exists(sourcePath))) {
      return { success: false, error: 'Arquivo de backup não encontrado.' };
    }

    await fecharBancoDados();
    await new Promise(resolve => {
      setTimeout(() => resolve(null), 1000);
    });

    const dbDir = dbPath.substring(0, dbPath.lastIndexOf('/'));
    if (!(await RNFS.exists(dbDir))) {
      await RNFS.mkdir(dbDir);
    }

    const filesToRemove = [dbPath, `${dbPath}-journal`, `${dbPath}-wal`, `${dbPath}-shm`];
    for (const f of filesToRemove) {
      try {
        if (await RNFS.exists(f)) await RNFS.unlink(f);
      } catch {
        // Silencioso
      }
    }
    
    await RNFS.copyFile(sourcePath, dbPath);
    
    if (backupPath.startsWith('content://')) {
      await RNFS.unlink(sourcePath);
    }

    await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    
    return { success: true };
  } catch (err: any) {
    return { 
      success: false, 
      error: 'Falha técnica ao restaurar: ' + (err?.message || 'Erro desconhecido') 
    };
  }
};

export const formatarTamanhoArquivo = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

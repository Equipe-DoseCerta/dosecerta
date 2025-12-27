// src/services/backupManager.ts
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';

const DB_NAME = 'medicamentos.db';
const BACKUP_DIR_KEY = 'backupDirectoryPath';
const LAST_BACKUP_KEY = 'lastBackupTimestamp';

/**
 * Obtém o caminho real do banco de dados SQLite
 * Este é o arquivo físico criado pelo react-native-sqlite-storage
 */
export const getDBPath = (): string => {
  if (Platform.OS === 'android') {
    // Android: /data/data/[package]/databases/medicamentos.db
    return `${RNFS.DocumentDirectoryPath}/../databases/${DB_NAME}`;
  } else {
    // iOS: Library/LocalDatabase/medicamentos.db
    return `${RNFS.LibraryDirectoryPath}/LocalDatabase/${DB_NAME}`;
  }
};

/**
 * Solicita permissões de armazenamento no Android
 */
const solicitarPermissoesAndroid = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    if (Platform.Version >= 33) {
      // Android 13+ não precisa de permissão para Downloads
      return true;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Permissão de Armazenamento',
        message: 'O app precisa de permissão para salvar backups',
        buttonNeutral: 'Perguntar depois',
        buttonNegative: 'Cancelar',
        buttonPositive: 'OK',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Erro ao solicitar permissões:', err);
    return false;
  }
};

/**
 * Abre o seletor de pasta para o usuário escolher onde salvar backups
 */
export const selecionarDiretorioBackup = async (): Promise<{
  success: boolean;
  path?: string;
  cancelled?: boolean;
  error?: string;
}> => {
  try {
    // Solicitar permissões primeiro
    const permissaoOk = await solicitarPermissoesAndroid();
    if (!permissaoOk) {
      return {
        success: false,
        error: 'Permissão de armazenamento negada',
      };
    }

    if (Platform.OS === 'android') {
      // No Android, usar pasta Downloads/DoseCerta como padrão
      const backupDir = `${RNFS.DownloadDirectoryPath}/DoseCerta`;
      
      // Criar pasta se não existir
      const exists = await RNFS.exists(backupDir);
      if (!exists) {
        await RNFS.mkdir(backupDir);
      }

      // Salvar configuração
      await AsyncStorage.setItem(BACKUP_DIR_KEY, backupDir);

      return {
        success: true,
        path: backupDir,
      };
    } else {
      // No iOS, usar pasta Documentos
      const backupDir = `${RNFS.DocumentDirectoryPath}/DoseCerta`;
      
      const exists = await RNFS.exists(backupDir);
      if (!exists) {
        await RNFS.mkdir(backupDir);
      }

      await AsyncStorage.setItem(BACKUP_DIR_KEY, backupDir);

      return {
        success: true,
        path: backupDir,
      };
    }
  } catch (err: any) {
    console.error('Erro ao selecionar diretório:', err);
    return {
      success: false,
      error: err?.message || 'Erro ao selecionar pasta',
    };
  }
};

/**
 * Obtém o diretório de backup configurado
 */
export const getBackupDirectory = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(BACKUP_DIR_KEY);
};

/**
 * Gera o nome do arquivo de backup: backup_dosecerta_DD-MM-AAAA.db
 */
const gerarNomeBackup = (): string => {
  const data = new Date();
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  
  return `backup_dosecerta_${dia}-${mes}-${ano}.db`;
};

/**
 * Sincroniza/aguarda o banco de dados
 */
export const sincronizarBancoDados = async (): Promise<void> => {
  try {
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
  } catch (err) {
    console.warn('Aviso ao sincronizar banco:', err);
  }
};

/**
 * Cria um backup do banco de dados
 */
export const executarBackup = async (): Promise<{
  success: boolean;
  path?: string;
  error?: string;
}> => {
  try {
    console.log('📄 Iniciando backup...');

    // 1. Obter diretório de backup
    const backupDir = await getBackupDirectory();
    if (!backupDir) {
      return {
        success: false,
        error: 'Diretório de backup não configurado',
      };
    }

    // 2. Sincronizar banco
    await sincronizarBancoDados();

    // 3. Obter caminho do banco real
    const dbPath = getDBPath();
    console.log('📂 Caminho DB:', dbPath);
    console.log('📂 Caminho Backup:', backupDir);

    // 4. Verificar se banco existe
    const dbExists = await RNFS.exists(dbPath);
    if (!dbExists) {
      return {
        success: false,
        error: `Banco de dados não encontrado em: ${dbPath}`,
      };
    }

    // 5. Garantir que diretório de backup existe
    const dirExists = await RNFS.exists(backupDir);
    if (!dirExists) {
      await RNFS.mkdir(backupDir);
    }

    // 6. Gerar nome do arquivo
    const backupFileName = gerarNomeBackup();
    let backupPath = `${backupDir}/${backupFileName}`;

    // 7. Se já existe backup nessa data, adicionar contador
    let contador = 1;
    while (await RNFS.exists(backupPath)) {
      const nomeBase = backupFileName.replace('.db', '');
      backupPath = `${backupDir}/${nomeBase}_${contador}.db`;
      contador++;
    }

    // 8. Copiar arquivo do banco
    console.log('💾 Copiando banco para:', backupPath);
    await RNFS.copyFile(dbPath, backupPath);

    // 9. Verificar se backup foi criado
    const backupCriado = await RNFS.exists(backupPath);
    if (!backupCriado) {
      return {
        success: false,
        error: 'Backup não foi criado corretamente',
      };
    }

    // 10. Salvar timestamp
    const isoTimestamp = new Date().toISOString();
    await AsyncStorage.setItem(LAST_BACKUP_KEY, isoTimestamp);

    console.log('✅ Backup criado com sucesso!');

    return {
      success: true,
      path: backupPath,
    };
  } catch (err: any) {
    console.error('❌ Erro ao executar backup:', err);
    return {
      success: false,
      error: err?.message || 'Erro desconhecido ao criar backup',
    };
  }
};

/**
 * Restaura um backup
 */
export const executarRestauracao = async (backupPath: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    console.log('🔄 Iniciando restauração...');
    console.log('📂 Arquivo backup:', backupPath);

    // 1. Verificar se backup existe
    const backupExists = await RNFS.exists(backupPath);
    if (!backupExists) {
      return {
        success: false,
        error: 'Arquivo de backup não encontrado',
      };
    }

    // 2. Obter caminho do banco
    const dbPath = getDBPath();

    // 3. Sincronizar
    await sincronizarBancoDados();

    // 4. Criar backup de emergência
    const backupDir = await getBackupDirectory();
    if (backupDir) {
      const emergencyBackup = `${backupDir}/emergency_backup_${Date.now()}.db`;
      const dbExists = await RNFS.exists(dbPath);
      
      if (dbExists) {
        console.log('🔒 Criando backup de emergência...');
        await RNFS.copyFile(dbPath, emergencyBackup);
      }
    }

    // 5. Copiar backup para substituir banco atual
    console.log('🔥 Restaurando banco de dados...');
    
    // Garantir que o diretório do banco existe
    const dbDir = dbPath.substring(0, dbPath.lastIndexOf('/'));
    const dbDirExists = await RNFS.exists(dbDir);
    if (!dbDirExists) {
      await RNFS.mkdir(dbDir);
    }

    await RNFS.copyFile(backupPath, dbPath);

    // 6. Atualizar timestamp
    const isoTimestamp = new Date().toISOString();
    await AsyncStorage.setItem(LAST_BACKUP_KEY, isoTimestamp);

    console.log('✅ Backup restaurado com sucesso!');

    return {
      success: true,
    };
  } catch (err: any) {
    console.error('❌ Erro ao restaurar backup:', err);
    return {
      success: false,
      error: err?.message || 'Erro desconhecido ao restaurar backup',
    };
  }
};

/**
 * Lista todos os backups disponíveis
 */
export const listarBackupsDisponiveis = async (): Promise<
  { name: string; path: string; size: number; date: Date }[]
> => {
  try {
    const backupDir = await getBackupDirectory();
    if (!backupDir) {
      return [];
    }

    const dirExists = await RNFS.exists(backupDir);
    if (!dirExists) {
      return [];
    }

    const files = await RNFS.readDir(backupDir);
    const backups = files
      .filter(file => file.name.endsWith('.db') && !file.name.includes('emergency'))
      .map(file => ({
        name: file.name,
        path: file.path,
        size: file.size || 0,
        date: new Date(file.mtime || 0),
      }));

    // Ordenar por data (mais recente primeiro)
    return backups.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (err) {
    console.error('Erro ao listar backups:', err);
    return [];
  }
};

/**
 * Obtém o timestamp do último backup
 */
export const obterUltimoBackup = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(LAST_BACKUP_KEY);
};

/**
 * Configura o diretório de backup
 */
export const configurarDiretorioBackup = async (): Promise<{
  success: boolean;
  path?: string;
  cancelled?: boolean;
  error?: string;
}> => {
  return await selecionarDiretorioBackup();
};

/**
 * Verifica se o diretório já foi configurado
 */
export const verificarDiretorioConfigurado = async (): Promise<boolean> => {
  const path = await AsyncStorage.getItem(BACKUP_DIR_KEY);
  return !!path;
};

/**
 * Formata o tamanho do arquivo
 */
export const formatarTamanhoArquivo = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
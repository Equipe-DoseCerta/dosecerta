// src/services/badgeService.ts
// Serviço para gerenciar badges (contadores) no menu drawer

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'unreadCounts';
const LAST_VIEW_KEY = 'lastViewTimestamps';
const LAST_SYNC_KEY = 'lastSyncTimestamp';

interface UnreadCount {
  [key: string]: number;
}

interface LastViewTimestamps {
  [key: string]: string; // ISO timestamp
}

/**
 * Serviço de Badges para Menu Drawer
 * Gerencia contadores de não lidas para cada seção do app
 */
export const BadgeService = {
  /**
   * Adiciona contadores de não lidas
   * @param screenKey - Chave da tela (ex: 'diretas', 'avisos')
   * @param count - Quantidade a adicionar (padrão: 1)
   */
  async addUnread(screenKey: string, count: number = 1): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const current: UnreadCount = stored ? JSON.parse(stored) : {};
      const currentCount = current[screenKey] || 0;
      current[screenKey] = currentCount + count;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      console.log(`✅ Badge adicionado: ${screenKey} +${count} = ${current[screenKey]}`);
    } catch (error) {
      console.warn('❌ Erro ao adicionar badge:', error);
    }
  },

  /**
   * Define número específico de não lidas
   * @param screenKey - Chave da tela
   * @param count - Número exato a definir
   */
  async setUnread(screenKey: string, count: number): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const current: UnreadCount = stored ? JSON.parse(stored) : {};
      current[screenKey] = count;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      console.log(`✅ Badge definido: ${screenKey} = ${count}`);
    } catch (error) {
      console.warn('❌ Erro ao definir badge:', error);
    }
  },

  /**
   * Limpa badge de uma tela (zera contador)
   * @param screenKey - Chave da tela a limpar
   */
  async clearUnread(screenKey: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const current: UnreadCount = stored ? JSON.parse(stored) : {};
      current[screenKey] = 0;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      
      // Atualiza timestamp de última visualização
      await this.updateLastViewTimestamp(screenKey);
      
      console.log(`✅ Badge limpo: ${screenKey}`);
    } catch (error) {
      console.warn('❌ Erro ao limpar badge:', error);
    }
  },

  /**
   * Limpa todos os badges
   */
  async clearAllUnread(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({}));
      console.log('✅ Todos os badges foram limpos');
    } catch (error) {
      console.warn('❌ Erro ao limpar todos os badges:', error);
    }
  },

  /**
   * Obtém contadores atuais de todas as telas
   * @returns Objeto com contadores por tela
   */
  async getUnreadCounts(): Promise<UnreadCount> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('❌ Erro ao obter badges:', error);
      return {};
    }
  },

  /**
   * Obtém contador de uma tela específica
   * @param screenKey - Chave da tela
   * @returns Número de não lidas
   */
  async getUnreadCount(screenKey: string): Promise<number> {
    try {
      const counts = await this.getUnreadCounts();
      return counts[screenKey] || 0;
    } catch (error) {
      console.warn('❌ Erro ao obter badge específico:', error);
      return 0;
    }
  },

  /**
   * Atualiza timestamp de última visualização
   * @param screenKey - Chave da tela
   */
  async updateLastViewTimestamp(screenKey: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(LAST_VIEW_KEY);
      const timestamps: LastViewTimestamps = stored ? JSON.parse(stored) : {};
      timestamps[screenKey] = new Date().toISOString();
      await AsyncStorage.setItem(LAST_VIEW_KEY, JSON.stringify(timestamps));
      console.log(`✅ Timestamp atualizado: ${screenKey} = ${timestamps[screenKey]}`);
    } catch (error) {
      console.warn('❌ Erro ao atualizar timestamp:', error);
    }
  },

  /**
   * Obtém timestamp da última visualização
   * @param screenKey - Chave da tela
   * @returns ISO timestamp ou null
   */
  async getLastViewTimestamp(screenKey: string): Promise<string | null> {
    try {
      const stored = await AsyncStorage.getItem(LAST_VIEW_KEY);
      if (!stored) return null;
      const timestamps: LastViewTimestamps = JSON.parse(stored);
      return timestamps[screenKey] || null;
    } catch (error) {
      console.warn('❌ Erro ao obter timestamp:', error);
      return null;
    }
  },

  /**
   * Obtém todos os timestamps de visualização
   * @returns Objeto com timestamps por tela
   */
  async getAllLastViewTimestamps(): Promise<LastViewTimestamps> {
    try {
      const stored = await AsyncStorage.getItem(LAST_VIEW_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('❌ Erro ao obter timestamps:', error);
      return {};
    }
  },

  /**
   * Atualiza timestamp da última sincronização
   */
  async updateLastSyncTimestamp(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp);
      console.log(`✅ Última sincronização: ${timestamp}`);
    } catch (error) {
      console.warn('❌ Erro ao atualizar timestamp de sync:', error);
    }
  },

  /**
   * Obtém timestamp da última sincronização
   * @returns ISO timestamp ou null
   */
  async getLastSyncTimestamp(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_SYNC_KEY);
    } catch (error) {
      console.warn('❌ Erro ao obter timestamp de sync:', error);
      return null;
    }
  },
};

export default BadgeService;
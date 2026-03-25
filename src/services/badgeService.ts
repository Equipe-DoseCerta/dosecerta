// src/services/badgeService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'unreadCounts';
const LAST_VIEW_KEY = 'lastViewTimestamps';
const LAST_SYNC_KEY = 'lastSyncTimestamp';
// ✅ NOVA CHAVE
const FIRST_OPEN_KEY = '@DoseCerta:first_open_done';

interface UnreadCount {
  [key: string]: number;
}

interface LastViewTimestamps {
  [key: string]: string;
}

export const BadgeService = {
  // ... (MANTIDO: Todos os métodos originais: addUnread, setUnread, clearUnread, etc.)
  async addUnread(screenKey: string, count: number = 1): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const current: UnreadCount = stored ? JSON.parse(stored) : {};
      const currentCount = current[screenKey] || 0;
      current[screenKey] = currentCount + count;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (error) {
      console.warn('❌ Erro ao adicionar badge:', error);
    }
  },

  async setUnread(screenKey: string, count: number): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const current: UnreadCount = stored ? JSON.parse(stored) : {};
      current[screenKey] = count;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (error) {
      console.warn('❌ Erro ao definir badge:', error);
    }
  },

  async clearUnread(screenKey: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const current: UnreadCount = stored ? JSON.parse(stored) : {};
      current[screenKey] = 0;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      await this.updateLastViewTimestamp(screenKey);
    } catch (error) {
      console.warn('❌ Erro ao limpar badge:', error);
    }
  },

  async clearAllUnread(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({}));
    } catch (error) {
      console.warn('❌ Erro ao limpar todos os badges:', error);
    }
  },

  async getUnreadCounts(): Promise<UnreadCount> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('❌ Erro ao obter badges:', error);
      return {};
    }
  },

  async getUnreadCount(screenKey: string): Promise<number> {
    try {
      const counts = await this.getUnreadCounts();
      return counts[screenKey] || 0;
    } catch (error) {
      console.warn('❌ Erro ao obter badge específico:', error);
      return 0;
    }
  },

  async updateLastViewTimestamp(screenKey: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(LAST_VIEW_KEY);
      const timestamps: LastViewTimestamps = stored ? JSON.parse(stored) : {};
      timestamps[screenKey] = new Date().toISOString();
      await AsyncStorage.setItem(LAST_VIEW_KEY, JSON.stringify(timestamps));
    } catch (error) {
      console.warn('❌ Erro ao atualizar timestamp:', error);
    }
  },

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

  async getAllLastViewTimestamps(): Promise<LastViewTimestamps> {
    try {
      const stored = await AsyncStorage.getItem(LAST_VIEW_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('❌ Erro ao obter timestamps:', error);
      return {};
    }
  },

  async updateLastSyncTimestamp(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp);
    } catch (error) {
      console.warn('❌ Erro ao atualizar timestamp de sync:', error);
    }
  },

  async getLastSyncTimestamp(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_SYNC_KEY);
    } catch (error) {
      console.warn('❌ Erro ao obter timestamp de sync:', error);
      return null;
    }
  },

  // ✅ NOVO MÉTODO: Inicializa badges na primeira abertura
  async initializeBadges(): Promise<void> {
    try {
      const isFirstOpen = await AsyncStorage.getItem(FIRST_OPEN_KEY);
      
      if (isFirstOpen === null) {
        console.log('🔔 Primeira abertura: Configurando badge do Mural');
        await this.setUnread('mural', 1);
        await AsyncStorage.setItem(FIRST_OPEN_KEY, 'true');
      }
    } catch (error) {
      console.warn('❌ Erro ao inicializar badges:', error);
    }
  },
};

export default BadgeService;
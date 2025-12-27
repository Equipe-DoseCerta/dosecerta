// src/services/badgeService.ts
// Serviço para gerenciar badges (contadores) no menu drawer

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'unreadCounts';

interface UnreadCount {
  [key: string]: number;
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
};

export default BadgeService;
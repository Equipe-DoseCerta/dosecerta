import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheData {
  data: any;
  timestamp: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em ms

class CacheService {
  private static readonly CACHE_PREFIX = '@app_cache_';

  /**
   * Salva dados no cache
   */
  static async setCache(key: string, data: any): Promise<void> {
    try {
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        `${this.CACHE_PREFIX}${key}`,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.error(`Erro ao salvar cache para ${key}:`, error);
    }
  }

  /**
   * Recupera dados do cache
   */
  static async getCache(key: string): Promise<any | null> {
    try {
      const cachedData = await AsyncStorage.getItem(
        `${this.CACHE_PREFIX}${key}`
      );

      if (!cachedData) return null;

      const parsed: CacheData = JSON.parse(cachedData);
      const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;

      if (isExpired) {
        await this.clearCache(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error(`Erro ao recuperar cache para ${key}:`, error);
      return null;
    }
  }

  /**
   * Limpa um cache específico
   */
  static async clearCache(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error(`Erro ao limpar cache para ${key}:`, error);
    }
  }

  /**
   * Limpa todos os caches
   */
  static async clearAllCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key =>
        key.startsWith(this.CACHE_PREFIX)
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Erro ao limpar todos os caches:', error);
    }
  }

  /**
   * Retorna tempo desde o último cache em horas
   */
  static async getCacheAge(key: string): Promise<number | null> {
    try {
      const cachedData = await AsyncStorage.getItem(
        `${this.CACHE_PREFIX}${key}`
      );

      if (!cachedData) return null;

      const parsed: CacheData = JSON.parse(cachedData);
      const ageInMs = Date.now() - parsed.timestamp;
      return Math.round(ageInMs / (1000 * 60 * 60)); // em horas
    } catch (error) {
      console.error(`Erro ao obter idade do cache para ${key}:`, error);
      return null;
    }
  }
}

export default CacheService;
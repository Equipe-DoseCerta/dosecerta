// GuiaRemediosScreen.tsx - VERSÃO SEM HEADER
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';

import { initDB, createTables } from '../database/db';
import { Medicamento, listMedicamentos, searchMedicamentos } from '../services/medsRepo';
import { quickSync, syncFromGoogleSheets, getSyncInfo } from '../services/medsSync';
import DetalhesMedicamentoScreen from './DetalhesMedicamentoScreen';

const { width } = Dimensions.get('window');

// Componente MedicamentoCard
const MedicamentoCard = React.memo(({ 
  item, 
  index, 
  onPress 
}: { 
  item: Medicamento; 
  index: number; 
  onPress: (item: Medicamento) => void;
}) => {
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      delay: index * 50,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [cardAnim, index]);

  const scale = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  return (
    <Animated.View style={[styles.cardWrapper, { opacity: cardAnim, transform: [{ scale }] }]}>
      <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.7}>
        <View style={styles.card}>
          <View style={styles.cardIconContainer}>
            <Text style={styles.cardIcon}>💊</Text>
          </View>
          
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.nome}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {item.apresentacaoExpandida || 'Forma não informada'}
            </Text>
            <View style={styles.cardBadge}>
              <Text style={styles.badgeText}>{item.concentracao || '---'}</Text>
            </View>
          </View>

          <View style={styles.cardArrow}>
            <Text style={styles.arrowIcon}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

MedicamentoCard.displayName = 'MedicamentoCard';

const GuiaRemediosScreen = () => {
  const [query, setQuery] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [itens, setItens] = useState<Medicamento[]>([]);
  const [detalheVisible, setDetalheVisible] = useState(false);
  const [medicamentoSelecionado, setMedicamentoSelecionado] = useState<Medicamento | null>(null);
  const [primeiraLeitura, setPrimeiraLeitura] = useState(false);
  const [syncInfo, setSyncInfo] = useState<{lastSync: string | null; totalMedicamentos: string | null}>({
    lastSync: null,
    totalMedicamentos: null,
  });

  // Animações
  const shimmerValue = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(searchAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, [searchAnim, shimmerValue]);

  const shimmerTranslate = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const abrirDetalhes = useCallback((item: Medicamento) => {
    setMedicamentoSelecionado(item);
    setDetalheVisible(true);
  }, []);

  const loadMedicamentos = useCallback(async () => {
    try {
      await initDB();
      await createTables();
      const data = query ? await searchMedicamentos(query) : await listMedicamentos();
      setItens(data);
    } catch (error) {
      console.error('[UI] Erro ao carregar medicamentos:', error);
    }
  }, [query]);

  /**
   * PRIMEIRA CARGA AUTOMÁTICA - Executa apenas na montagem
   */
  const inicializarDados = useCallback(async () => {
    setCarregando(true);
    try {
      // Tenta sincronização rápida
      const precisouSincronizar = await quickSync();
      
      if (precisouSincronizar) {
        setPrimeiraLeitura(true);
        console.log('[UI] 🆕 Primeira carga realizada com sucesso');
      } else {
        console.log('[UI] ✅ Usando dados em cache');
      }

      // Carrega medicamentos
      await loadMedicamentos();

      // Atualiza info de sync
      const info = await getSyncInfo();
      setSyncInfo(info);

    } catch (error) {
      console.error('[UI] ❌ Erro na inicialização:', error);
      Alert.alert(
        'Erro de Inicialização',
        'Não foi possível carregar os dados. Verifique sua conexão e tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setCarregando(false);
      setPrimeiraLeitura(false);
    }
  }, [loadMedicamentos]);

  /**
   * REFRESH MANUAL - Pull to refresh
   */
  const onRefresh = useCallback(async () => {
    setSincronizando(true);
    try {
      await syncFromGoogleSheets(true); // Força sincronização
      await loadMedicamentos();
      
      const info = await getSyncInfo();
      setSyncInfo(info);

      Alert.alert(
        '✅ Atualizado',
        `${info.totalMedicamentos || '0'} medicamentos sincronizados com sucesso!`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      console.error('[UI] Erro ao sincronizar:', e);
      Alert.alert(
        'Erro na Sincronização',
        'Não foi possível atualizar os dados. Tente novamente mais tarde.',
        [{ text: 'OK' }]
      );
    } finally {
      setSincronizando(false);
    }
  }, [loadMedicamentos]);

  // INICIALIZAÇÃO AUTOMÁTICA (apenas 1x na montagem)
  useEffect(() => {
    inicializarDados();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // RECARREGA quando query muda (busca local)
  useEffect(() => {
    if (!carregando) {
      loadMedicamentos();
    }
  }, [query, loadMedicamentos, carregando]);

  const renderSkeleton = useCallback(() => (
    <View style={styles.skeletonContainer}>
      {[...Array(6)].map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
          </View>
          <Animated.View
            style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerTranslate }] },
            ]}
          />
        </View>
      ))}
    </View>
  ), [shimmerTranslate]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>
        {query ? 'Nenhum resultado encontrado' : 'Nenhum medicamento disponível'}
      </Text>
      <Text style={styles.emptyText}>
        {query
          ? 'Tente buscar por outro nome ou princípio ativo'
          : 'Puxe para baixo para sincronizar os dados'}
      </Text>
    </View>
  ), [query]);

  const renderItem = useCallback(({ item, index }: { item: Medicamento; index: number }) => (
    <MedicamentoCard item={item} index={index} onPress={abrirDetalhes} />
  ), [abrirDetalhes]);

  const formatarDataSync = (isoDate: string | null): string => {
    if (!isoDate) return 'Nunca';
    const date = new Date(isoDate);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#F5F7FA" barStyle="dark-content" />

      {/* Busca Flutuante */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: searchAnim,
            transform: [
              {
                translateY: searchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar medicamento ou princípio ativo..."
            placeholderTextColor="#999"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>

      {/* Lista */}
      <FlatList
        data={itens}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={sincronizando}
            onRefresh={onRefresh}
            tintColor="#0066CC"
            colors={['#0066CC']}
          />
        }
        ListEmptyComponent={carregando ? renderSkeleton() : renderEmptyState()}
      />

      {/* Footer Status */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          {primeiraLeitura ? (
            <>
              <ActivityIndicator color="#4CAF50" size="small" />
              <Text style={styles.footerText}>Carregando dados pela primeira vez...</Text>
            </>
          ) : sincronizando ? (
            <>
              <ActivityIndicator color="#0066CC" size="small" />
              <Text style={styles.footerText}>Sincronizando...</Text>
            </>
          ) : carregando ? (
            <>
              <ActivityIndicator color="#666" size="small" />
              <Text style={styles.footerText}>Carregando lista...</Text>
            </>
          ) : (
            <>
              <Text style={styles.footerIcon}>✓</Text>
              <Text style={styles.footerText}>
                Última sync: {formatarDataSync(syncInfo.lastSync)}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Modal de Detalhes */}
      <DetalhesMedicamentoScreen
        visible={detalheVisible}
        medicamento={medicamentoSelecionado}
        onClose={() => setDetalheVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 12,
    backgroundColor: '#F5F7FA',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: '#999',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#0066CC',
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  cardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0066CC',
    letterSpacing: 0.3,
  },
  cardArrow: {
    marginLeft: 8,
  },
  arrowIcon: {
    fontSize: 28,
    color: '#CCC',
    fontWeight: '300',
  },

  skeletonContainer: {
    paddingTop: 8,
  },
  skeletonCard: {
    height: 80,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8E8E8',
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonTitle: {
    width: '70%',
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E8E8E8',
    marginBottom: 8,
  },
  skeletonSubtitle: {
    width: '40%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 62 : 50,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerIcon: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 8,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default GuiaRemediosScreen;
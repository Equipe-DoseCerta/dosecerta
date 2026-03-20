import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  LayoutAnimation,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
// ✅ IMPORTAÇÃO DIRETA DO SERVIÇO
import { getFAQData, FAQCategoria } from '../services/ajudaService';

const AjudaScreen = () => {
  // ✅ ESTADOS LOCAIS (antes gerenciados pelo hook)
  const [data, setData] = useState<FAQCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de UI para acordeão
  const [perguntaAberta, setPerguntaAberta] = useState<string | null>(null);
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);

  // ✅ FUNÇÃO DE CARREGAMENTO DIRETA
  const carregarDados = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Chama o serviço diretamente
      const faqData = await getFAQData(forceRefresh);
      setData(faqData);
    } catch (err: any) {
      console.error('Erro ao carregar FAQ:', err);
      setError('Não foi possível carregar as perguntas. Verifique sua conexão.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Carrega dados na montagem do componente
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Handlers de UI
  const togglePergunta = (categoriaIndex: number, perguntaIndex: number) => {
    const key = `${categoriaIndex}-${perguntaIndex}`;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPerguntaAberta(perguntaAberta === key ? null : key);
  };

  const toggleCategoria = (categoria: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCategoriaAberta(categoriaAberta === categoria ? null : categoria);
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:equipe.dosecerta.app@gmail.com');
  };

  // ✅ REFRESH MANUAL
  const onRefresh = async () => {
    setRefreshing(true);
    // Força a recarga ignorando o cache se necessário, ou apenas recarrega
    await carregarDados(true); 
  };

  return (
    <ScreenContainer showGradient={true}>
      {/* Header Modernizado */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerIcon}>💡</Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Central de Ajuda</Text>
            <Text style={styles.headerSubtitle}>Como podemos te ajudar hoje?</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FFC107']}
            tintColor="#FFC107"
            title="Atualizando..."
            titleColor="#FFC107"
          />
        }
      >
        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#FFC107" />
              <Text style={styles.loadingText}>Buscando informações...</Text>
            </View>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconCircle}>
              <Text style={styles.errorIcon}>⚠️</Text>
            </View>
            <Text style={styles.errorTitle}>Ops! Algo deu errado</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Perguntas Frequentes */}
        {!loading && !error && data.length > 0 && (
          <View style={styles.secao}>
            <View style={styles.secaoHeader}>
              <View style={styles.secaoIconBadge}>
                <Text style={styles.secaoIcone}>❓</Text>
              </View>
              <Text style={styles.secaoTitulo}>Perguntas Frequentes</Text>
            </View>
          
            <View style={styles.faqContainer}>
              {data.map((categoria, catIndex) => (
                <View key={catIndex} style={styles.categoriaWrapper}>
                  <TouchableOpacity
                    onPress={() => toggleCategoria(categoria.categoria)}
                    style={[
                      styles.categoriaHeader,
                      categoriaAberta === categoria.categoria && styles.categoriaHeaderAberta
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoriaTitleRow}>
                      <Text style={styles.categoriaIcone}>📋</Text>
                      <Text style={styles.categoriaTitulo}>{categoria.categoria}</Text>
                    </View>
                    <View style={[styles.expandIconCircle, categoriaAberta === categoria.categoria && styles.expandIconCircleActive]}>
                      <Text style={[styles.expandIconText, categoriaAberta === categoria.categoria && styles.expandIconTextActive]}>
                        {categoriaAberta === categoria.categoria ? '▲' : '▼'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {categoriaAberta === categoria.categoria && (
                    <View style={styles.perguntasCategoria}>
                      {categoria.perguntas.map((item, pergIndex) => {
                        const key = `${catIndex}-${pergIndex}`;
                        const isOpened = perguntaAberta === key;
                        return (
                          <View key={pergIndex} style={styles.faqItem}>
                            <TouchableOpacity 
                              onPress={() => togglePergunta(catIndex, pergIndex)} 
                              style={[
                                styles.faqPergunta,
                                isOpened && styles.faqPerguntaAberta
                              ]}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.faqPerguntaTexto, isOpened && styles.faqPerguntaTextoActive]}>
                                {item.pergunta}
                              </Text>
                              <Text style={[styles.smallExpandIcon, isOpened && styles.smallExpandIconActive]}>
                                {isOpened ? '−' : '+'}
                              </Text>
                            </TouchableOpacity>
                          
                            {isOpened && (
                              <View style={styles.faqRespostaContainer}>
                                <Text style={styles.faqResposta}>{item.resposta}</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Dicas Rápidas (Estático) */}
        {!loading && (
          <View style={styles.secao}>
            <View style={styles.secaoHeader}>
              <View style={styles.secaoIconBadgeDicas}>
                <Text style={styles.secaoIcone}>✨</Text>
              </View>
              <Text style={styles.secaoTituloDicas}>Dicas Rápidas</Text>
            </View>
          
            <View style={styles.dicasContainer}>
              <View style={styles.dicaCard}>
                <View style={styles.dicaIconCircle}>
                  <Text style={styles.dicaIcone}>💊</Text>
                </View>
                <Text style={styles.dicaTexto}>Use os alarmes para lembrar doses importantes</Text>
              </View>
            
              <View style={styles.dicaCard}>
                <View style={styles.dicaIconCircleVerde}>
                  <Text style={styles.dicaIcone}>🔒</Text>
                </View>
                <Text style={styles.dicaTexto}>Faça backups regulares para não perder seus dados</Text>
              </View>
            
              <View style={styles.dicaCard}>
                <View style={styles.dicaIconCircleLaranja}>
                  <Text style={styles.dicaIcone}>📅</Text>
                </View>
                <Text style={styles.dicaTexto}>Mantenha o histórico de uso sempre atualizado</Text>
              </View>
            </View>
          </View>
        )}

        {/* Fale Conosco */}
        {!loading && (
          <View style={styles.secao}>
            <View style={styles.secaoHeader}>
              <View style={styles.secaoIconBadgeContato}>
                <Text style={styles.secaoIcone}>📞</Text>
              </View>
              <Text style={styles.secaoTituloContato}>Fale Conosco</Text>
            </View>
          
            <TouchableOpacity 
              onPress={handleEmailPress} 
              style={styles.contatoButton}
              activeOpacity={0.8}
            >
              <View style={styles.contatoContent}>
                <View style={styles.contatoIconCircle}>
                  <Text style={styles.contatoIcone}>✉️</Text>
                </View>
                <View>
                  <Text style={styles.contatoTexto}>Suporte via E-mail</Text>
                  <Text style={styles.contatoSubtexto}>equipe.dosecerta.app@gmail.com</Text>
                </View>
              </View>
              <View style={styles.contatoArrowCircle}>
                <Text style={styles.contatoSeta}>→</Text>
              </View>
            </TouchableOpacity>
          
            <View style={styles.horarioCard}>
              <Text style={styles.horarioIcone}>⏰</Text>
              <Text style={styles.horarioTexto}>
                Atendimento de  <Text style={styles.bold}>segunda a sexta</Text>, das  <Text style={styles.bold}>9h às 18h</Text>
              </Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Dose Certa • Versão 1.5.0</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 5,
    paddingTop: Platform.OS === 'ios' ? 10 : 10,
    paddingBottom: 5,
    marginTop: -10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerIcon: { fontSize: 28 },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    width: '80%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  loadingText: {
    color: '#1E293B',
    fontSize: 15,
    marginTop: 16,
    fontWeight: '700',
  },
  errorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: { fontSize: 32 },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  errorText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secao: {
    marginHorizontal: -15,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  secaoIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  secaoIcone: { fontSize: 18 },
  secaoTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: -0.3,
  },
  faqContainer: { gap: 12 },
  categoriaWrapper: {
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  categoriaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  categoriaHeaderAberta: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
  },
  categoriaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoriaIcone: { fontSize: 18, marginRight: 12 },
  categoriaTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  expandIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandIconCircleActive: { backgroundColor: '#F59E0B' },
  expandIconText: { fontSize: 10, color: '#64748B' },
  expandIconTextActive: { color: '#FFFFFF' },
  perguntasCategoria: {
    paddingTop: 12,
    paddingHorizontal: 4,
    gap: 8,
  },
  faqItem: { marginBottom: 4 },
  faqPergunta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  faqPerguntaAberta: {
    borderColor: '#FEF3C7',
    backgroundColor: '#FFFDF5',
  },
  faqPerguntaTexto: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    fontWeight: '600',
    lineHeight: 20,
    paddingRight: 12,
  },
  faqPerguntaTextoActive: { color: '#92400E' },
  smallExpandIcon: { fontSize: 18, color: '#CBD5E1', fontWeight: '300' },
  smallExpandIconActive: { color: '#F59E0B' },
  faqRespostaContainer: {
    padding: 16,
    backgroundColor: '#FDFDFD',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#FEF3C7',
    marginTop: -4,
  },
  faqResposta: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  dicasContainer: { gap: 12 },
  dicaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dicaIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dicaIconCircleVerde: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dicaIconCircleLaranja: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dicaIcone: { fontSize: 20 },
  dicaTexto: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    flex: 1,
    fontWeight: '600',
  },
  contatoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  contatoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contatoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  contatoIcone: { fontSize: 22 },
  contatoTexto: {
    fontSize: 16,
    color: '#0369A1',
    fontWeight: '800',
  },
  contatoSubtexto: {
    fontSize: 12,
    color: '#0EA5E9',
    fontWeight: '500',
    marginTop: 2,
  },
  contatoArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contatoSeta: { fontSize: 14, color: '#FFFFFF', fontWeight: 'bold' },
  horarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  horarioIcone: { fontSize: 18, marginRight: 12 },
  horarioTexto: {
    fontSize: 13,
    color: '#9A3412',
    flex: 1,
    lineHeight: 18,
  },
  bold: { fontWeight: '800' },
  footer: {
    marginTop: 12,
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
    letterSpacing: 1,
  },
  secaoIconBadgeDicas: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  secaoTituloDicas: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4FC3F7',
    letterSpacing: -0.3,
  },
  secaoIconBadgeContato: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 138, 101, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  secaoTituloContato: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF8A65',
    letterSpacing: -0.3,
  },
});

export default AjudaScreen;
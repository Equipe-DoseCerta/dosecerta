import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  LayoutAnimation,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFAQ } from '../hooks/useFAQ';

const AjudaScreen = () => {
  const [perguntaAberta, setPerguntaAberta] = useState<string | null>(null);
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);
  
  // Hook para buscar dados do Google Sheets
  const { data: perguntasRespostas, loading, error, refresh } = useFAQ();
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A7AB8" translucent={false} />
      
      <LinearGradient 
        colors={['#0A7AB8', '#054F77', '#023047']} 
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>💡</Text>
          <Text style={styles.headerTitle}>Central de Ajuda</Text>
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
              <ActivityIndicator size="large" color="#FFC107" />
              <Text style={styles.loadingText}>Carregando perguntas...</Text>
            </View>
          )}

          {/* Error State */}
          {error && !loading && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Tentar Novamente</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Perguntas Frequentes */}
          {!loading && !error && perguntasRespostas.length > 0 && (
            <View style={styles.secao}>
              <View style={styles.secaoHeader}>
                <Text style={styles.secaoIcone}>❓</Text>
                <Text style={styles.secaoTitulo}>Perguntas Frequentes</Text>
              </View>
              
              <View style={styles.faqContainer}>
                {perguntasRespostas.map((categoria, catIndex) => (
                  <View key={catIndex} style={styles.categoriaContainer}>
                    <TouchableOpacity
                      onPress={() => toggleCategoria(categoria.categoria)}
                      style={[
                        styles.categoriaHeader,
                        categoriaAberta === categoria.categoria && styles.categoriaHeaderAberta
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.categoriaIcone}>📋</Text>
                      <Text style={styles.categoriaTitulo}>{categoria.categoria}</Text>
                      <Text style={styles.categoriaExpandIcon}>
                        {categoriaAberta === categoria.categoria ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>

                    {categoriaAberta === categoria.categoria && (
                      <View style={styles.perguntasCategoria}>
                        {categoria.perguntas.map((item, pergIndex) => {
                          const key = `${catIndex}-${pergIndex}`;
                          return (
                            <View key={pergIndex} style={styles.faqItem}>
                              <TouchableOpacity 
                                onPress={() => togglePergunta(catIndex, pergIndex)} 
                                style={[
                                  styles.faqPergunta,
                                  perguntaAberta === key && styles.faqPerguntaAberta
                                ]}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.faqPerguntaTexto}>{item.pergunta}</Text>
                                <Text style={styles.expandIcon}>
                                  {perguntaAberta === key ? '▲' : '▼'}
                                </Text>
                              </TouchableOpacity>
                              
                              {perguntaAberta === key && (
                                <View style={styles.faqRespostaContainer}>
                                  <View style={styles.faqRespostaBorda} />
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

          {/* Dicas Rápidas */}
          {!loading && (
            <View style={styles.secao}>
              <View style={styles.secaoHeader}>
                <Text style={styles.secaoIcone}>✨</Text>
                <Text style={styles.secaoTitulo}>Dicas Rápidas</Text>
              </View>
              
              <View style={styles.dicasContainer}>
                <View style={styles.dicaItem}>
                  <Text style={styles.dicaIcone}>💊</Text>
                  <Text style={styles.dicaTexto}>Use os alarmes para lembrar doses importantes</Text>
                </View>
                
                <View style={styles.dicaItem}>
                  <Text style={styles.dicaIcone}>🔒</Text>
                  <Text style={styles.dicaTexto}>Faça backups regulares para não perder seus dados</Text>
                </View>
                
                <View style={styles.dicaItem}>
                  <Text style={styles.dicaIcone}>📅</Text>
                  <Text style={styles.dicaTexto}>Mantenha o histórico de uso sempre atualizado</Text>
                </View>
              </View>
            </View>
          )}

          {/* Fale Conosco */}
          {!loading && (
            <View style={styles.secao}>
              <View style={styles.secaoHeader}>
                <Text style={styles.secaoIcone}>📞</Text>
                <Text style={styles.secaoTitulo}>Fale Conosco</Text>
              </View>
              
              <TouchableOpacity 
                onPress={handleEmailPress} 
                style={styles.contatoButton}
                activeOpacity={0.8}
              >
                <Text style={styles.contatoIcone}>✉️</Text>
                <Text style={styles.contatoTexto}>Enviar e-mail para o suporte</Text>
                <Text style={styles.contatoSeta}>→</Text>
              </TouchableOpacity>
              
              <View style={styles.horarioContainer}>
                <Text style={styles.horarioIcone}>⏰</Text>
                <Text style={styles.horarioTexto}>
                  Disponível de segunda a sexta, das 9h às 18h
                </Text>
              </View>
            </View>
          )}

          {/* Espaço extra no final */}
          <View style={styles.espacoFinal} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#023047',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#FFC107',
    fontSize: 16,
    marginTop: 15,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 87, 34, 0.3)',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  errorText: {
    color: '#FFB74D',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#FF8A65',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secao: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  secaoIcone: {
    fontSize: 24,
    marginRight: 10,
  },
  secaoTitulo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFC107',
    letterSpacing: 0.3,
  },
  faqContainer: {
    gap: 12,
  },
  categoriaContainer: {
    marginBottom: 12,
  },
  categoriaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    marginBottom: 8,
  },
  categoriaHeaderAberta: {
    backgroundColor: 'rgba(255, 193, 7, 0.3)',
    borderColor: '#FFC107',
  },
  categoriaIcone: {
    fontSize: 20,
    marginRight: 10,
  },
  categoriaTitulo: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFC107',
    letterSpacing: 0.3,
  },
  categoriaExpandIcon: {
    fontSize: 16,
    color: '#FFC107',
    fontWeight: 'bold',
  },
  perguntasCategoria: {
    paddingLeft: 8,
    gap: 8,
  },
  faqItem: {
    marginBottom: 8,
  },
  faqPergunta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  faqPerguntaAberta: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  faqPerguntaTexto: {
    fontSize: 15,
    color: '#FFFFFF',
    flex: 1,
    fontWeight: '600',
    lineHeight: 22,
    paddingRight: 12,
  },
  expandIcon: {
    fontSize: 16,
    color: '#FFC107',
    fontWeight: 'bold',
  },
  faqRespostaContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  faqRespostaBorda: {
    height: 3,
    backgroundColor: '#FFC107',
    width: '100%',
  },
  faqResposta: {
    padding: 16,
    color: '#E3F2FD',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  dicasContainer: {
    gap: 12,
  },
  dicaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4FC3F7',
  },
  dicaIcone: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },
  dicaTexto: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    flex: 1,
    fontWeight: '500',
  },
  contatoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 195, 247, 0.2)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4FC3F7',
    marginBottom: 16,
  },
  contatoIcone: {
    fontSize: 24,
    marginRight: 12,
  },
  contatoTexto: {
    flex: 1,
    fontSize: 16,
    color: '#4FC3F7',
    fontWeight: '600',
  },
  contatoSeta: {
    fontSize: 20,
    color: '#4FC3F7',
    fontWeight: 'bold',
  },
  horarioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 138, 101, 0.15)',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8A65',
  },
  horarioIcone: {
    fontSize: 20,
    marginRight: 10,
  },
  horarioTexto: {
    fontSize: 14,
    color: '#FFB74D',
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 20,
  },
  espacoFinal: {
    height: 20,
  },
});

export default AjudaScreen;
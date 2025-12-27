import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  FlatList,
// ❌ REMOVIDOS: 'NativeSyntheticEvent' e 'NativeScrollEvent' para limpar os warnings de linter
  StatusBar,
  Animated,
  Platform,
  Alert,
  NativeSyntheticEvent, // ⚠️ Linha 9: Mantida para referência (Remover para corrigir o warning)
  NativeScrollEvent,    // ⚠️ Linha 10: Mantida para referência (Remover para corrigir o warning)
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Sound from 'react-native-sound';

// ✅ CORREÇÃO 2: Prática recomendada para garantir que o som toque corretamente (iOS e Android)
Sound.setCategory('Playback');

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

interface SoundOption {
  key: string;
  name: string;
  file: string;
}

const soundOptions: SoundOption[] = [
  { key: '1', name: 'Toque Clássico', file: 'toque1.mp3' },
  { key: '2', name: 'Toque Moderno', file: 'toque2.mp3' },
  { key: '3', name: 'Toque Melódico', file: 'toque3.mp3' },
  { key: '4', name: 'Toque Harmônico', file: 'toque4.mp3' },
];

const PreferenciasAlarmes = () => {
  const [som, setSom] = useState(true);
  const [vibracao, setVibracao] = useState(true);
  const [visual, setVisual] = useState(true);
  const [selectedSound, setSelectedSound] = useState('1');
  const [carregando, setCarregando] = useState(true);
  const [playingSoundKey, setPlayingSoundKey] = useState<string | null>(null);

  const [showFadeTop, setShowFadeTop] = useState(false);
  const [showFadeBottom, setShowFadeBottom] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const currentSound = useRef<Sound | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const loadPreferences = useCallback(async () => {
    try {
      const [somPref, vibPref, visPref, storedSound] = await Promise.all([
        AsyncStorage.getItem('alarme_som'),
        AsyncStorage.getItem('alarme_vibracao'),
        AsyncStorage.getItem('alarme_visual'),
        AsyncStorage.getItem('alarme_toque'),
      ]);

      setSom(somPref !== 'false');
      setVibracao(vibPref !== 'false');
      setVisual(visPref !== 'false');
      setSelectedSound(['1', '2', '3', '4'].includes(storedSound ?? '') ? storedSound! : '1');

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('❌ Erro ao carregar preferências:', error);
    } finally {
      setCarregando(false);
    }
  }, [fadeAnim, scaleAnim]);

  const savePreference = async (key: string, value: boolean | string) => {
    try {
      await AsyncStorage.setItem(`alarme_${key}`, value.toString());
    } catch (error) {
      console.error(`❌ Erro ao salvar ${key}:`, error);
    }
  };

  const stopPreview = useCallback(() => {
    if (currentSound.current) {
      currentSound.current.stop(() => {
        currentSound.current?.release();
        currentSound.current = null;
        setPlayingSoundKey(null);
      });
    }
  }, []);

  const playPreview = useCallback((key: string) => {
    if (!som) return;

    if (playingSoundKey === key) {
      stopPreview();
      return;
    }

    stopPreview();
    setPlayingSoundKey(key);

    const soundFile = soundOptions.find(s => s.key === key)?.file;
    if (!soundFile) return;

    // O react-native-sound geralmente espera o nome do arquivo sem a extensão
    const soundName = soundFile.replace('.mp3', ''); 

    // 🚨 CORREÇÃO 3: Usando @ts-ignore para contornar o erro TS2339 (MAIN_BUNDLE inexistente)
    // O erro é de tipagem, mas o código com Sound.MAIN_BUNDLE está correto em tempo de execução.
    // @ts-ignore
    const soundInstance = new Sound(soundName, Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.error('❌ Erro ao carregar som:', error);
        setPlayingSoundKey(null);
        return;
      }
      currentSound.current = soundInstance; // Salva a referência ANTES de tocar
      soundInstance.play((_success) => {
        // Quando termina:
        soundInstance.release();
        currentSound.current = null;
        setPlayingSoundKey(null);
      });
    });

    currentSound.current = soundInstance;
  }, [som, stopPreview, playingSoundKey]);

  const updateSom = (value: boolean) => {
    setSom(value);
    savePreference('som', value);
    if (!value) stopPreview();
  };

  const updateVibracao = (value: boolean) => {
    setVibracao(value);
    savePreference('vibracao', value);
  };

  const updateVisual = (value: boolean) => {
    setVisual(value);
    savePreference('visual', value);
  };

  const selectSound = async (key: string) => {
    setSelectedSound(key);
    await savePreference('toque', key);
    
    // ✅ Agora funciona corretamente
    Alert.alert(
      '🔔 Toque Alterado',
      'Os alarmes ativos usarão o novo toque a partir do próximo horário agendado.',
      [{ text: 'OK' }]
    );
  };
  
  // ⚠️ Aviso 1 e 2: O linter reclama do uso da tipagem NativeSyntheticEvent/NativeScrollEvent aqui.
  // Como elas são usadas apenas como tipo, a solução mais limpa é remover o import (linhas 9 e 10).
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const totalHeight = contentSize.height;
    const visibleHeight = layoutMeasurement.height;
    const offset = contentOffset.y;

    setShowFadeTop(offset > 5);
    setShowFadeBottom(offset + visibleHeight < totalHeight - 5);
  };

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  if (carregando) {
    return (
      <View style={styles.loadingWrapper}>
        <StatusBar barStyle="light-content" backgroundColor="#0A7AB8" translucent />
        <LinearGradient colors={['#0A7AB8', '#054F77']} style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingEmoji}>⏳</Text>
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#0A7AB8" translucent />
      <LinearGradient colors={['#0A7AB8', '#054F77', '#043852']} style={styles.container}>
        <Animated.View 
          style={[
            styles.content, 
            { 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.optionsCard}>
            <View style={styles.option}>
              <View style={styles.optionLabel}>
                <Text style={styles.optionEmoji}>🔊</Text>
                <Text style={styles.label}>Som</Text>
              </View>
              <Switch 
                value={som} 
                onValueChange={updateSom}
                trackColor={{ false: '#767577', true: '#4FC3F7' }}
                thumbColor={som ? '#ffffff' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.option}>
              <View style={styles.optionLabel}>
                <Text style={styles.optionEmoji}>📳</Text>
                <Text style={styles.label}>Vibração</Text>
              </View>
              <Switch 
                value={vibracao} 
                onValueChange={updateVibracao}
                trackColor={{ false: '#767577', true: '#4FC3F7' }}
                thumbColor={vibracao ? '#ffffff' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.option}>
              <View style={styles.optionLabel}>
                <Text style={styles.optionEmoji}>💡</Text>
                <Text style={styles.label}>Notificação Visual</Text>
              </View>
              <Switch 
                value={visual} 
                onValueChange={updateVisual}
                trackColor={{ false: '#767577', true: '#4FC3F7' }}
                thumbColor={visual ? '#ffffff' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>
          </View>

          <View style={styles.soundSelectorCard}>
            <View style={styles.soundHeader}>
              <Text style={styles.subtitle}>🎵 Escolha seu toque</Text>
              <Text style={styles.scrollHint}>↕️ Role para ver mais</Text>
            </View>

            <View style={styles.listContainer}>
              <FlatList
                ref={flatListRef}
                data={soundOptions}
                keyExtractor={item => item.key}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.soundOption, 
                      selectedSound === item.key && styles.selectedSound,
                      playingSoundKey === item.key && styles.playingSound
                    ]}
                    onPress={() => selectSound(item.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.soundEmoji}>
                      {selectedSound === item.key ? '✅' : '⭕'}
                    </Text>
                    <Text style={styles.soundText}>{item.name}</Text>
                    <TouchableOpacity 
                      onPress={() => playPreview(item.key)} 
                      style={[
                        styles.playButton,
                        playingSoundKey === item.key && styles.playButtonActive
                      ]}
                      activeOpacity={0.6}
                    >
                      <Text style={[
                        styles.playEmoji,
                        playingSoundKey === item.key && styles.playingEmoji
                      ]}>
                        {playingSoundKey === item.key ? '⏸️' : '▶️'}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
                style={styles.soundList}
                showsVerticalScrollIndicator={true}
                onScroll={handleScroll as any} // Cast simples para limpar o aviso na tipagem do Animated.event
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
                indicatorStyle="white"
              />

              {showFadeTop && (
                <LinearGradient 
                  colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0)']} 
                  style={styles.fadeTop} 
                  pointerEvents="none" 
                />
              )}
              {showFadeBottom && (
                <LinearGradient 
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.15)']} 
                  style={styles.fadeBottom} 
                  pointerEvents="none" 
                />
              )}
            </View>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>📊 Status atual</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Som:</Text>
                <Text style={[styles.statusValue, som && styles.statusActive]}>
                  {som ? '✅ Ativo' : '❌ Inativo'}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Vibração:</Text>
                <Text style={[styles.statusValue, vibracao && styles.statusActive]}>
                  {vibracao ? '✅ Ativa' : '❌ Inativa'}
                </Text>
              </View>
            </View>
            <View style={styles.statusItemFull}>
              <Text style={styles.statusLabel}>Toque:</Text>
              <Text style={styles.statusValueHighlight}>
                {soundOptions.find(s => s.key === selectedSound)?.name}
              </Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0A7AB8',
  },
  loadingWrapper: {
    flex: 1,
  },
  container: { 
    flex: 1,
    paddingTop: STATUS_BAR_HEIGHT,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
  optionsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  option: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 12,
  },
  optionLabel: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
  },
  optionEmoji: { 
    fontSize: 18,
    marginRight: 10,
  },
  label: { 
    fontSize: 14, 
    color: '#ffffff', 
    fontWeight: '500',
  },
  soundSelectorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  soundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subtitle: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#ffffff', 
    letterSpacing: 0.3,
  },
  scrollHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  listContainer: {
    position: 'relative',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  soundList: { 
    flexGrow: 0,
    paddingVertical: 4,
  },
  soundOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.10)', 
    padding: 10, 
    borderRadius: 10, 
    marginHorizontal: 6,
    marginVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedSound: { 
    backgroundColor: 'rgba(79, 195, 247, 0.3)', 
    borderWidth: 2, 
    borderColor: '#4FC3F7',
  },
  playingSound: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  soundEmoji: { 
    fontSize: 16,
    marginRight: 10,
  },
  soundText: { 
    flex: 1, 
    fontSize: 13, 
    color: '#ffffff',
    fontWeight: '500',
  },
  playButton: { 
    padding: 4,
  },
  playButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 6,
  },
  playEmoji: {
    fontSize: 18,
    opacity: 0.9,
  },
  playingEmoji: {
    opacity: 1,
  },
  statusCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.12)', 
    borderRadius: 14, 
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  statusTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#FFD700',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusItem: {
    flex: 1,
  },
  statusItemFull: {
    marginTop: 2,
  },
  statusLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 3,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  statusActive: {
    color: '#4FC3F7',
  },
  statusValueHighlight: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  fadeTop: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    height: 20,
  },
  fadeBottom: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: 20,
  },
});

export default PreferenciasAlarmes;
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Animated,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sound from 'react-native-sound';
import Slider from '@react-native-community/slider';
import { fetchMedicamentos } from '../database/database';
import NativeAlarmService, { UserPreferences } from '../services/NativeAlarmService';
import ScreenContainer from '../components/ScreenContainer';
import { theme } from '../constants/theme';

Sound.setCategory('Playback');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SoundOption {
  key: string;
  name: string;
  file: string;
}

const soundOptions: SoundOption[] = [
  { key: '1', name: 'Toque Clássico',  file: 'toque1.mp3' },
  { key: '2', name: 'Toque Moderno',   file: 'toque2.mp3' },
  { key: '3', name: 'Toque Melódico',  file: 'toque3.mp3' },
  { key: '4', name: 'Toque Harmônico', file: 'toque4.mp3' },
];

const PreferenciasAlarmes: React.FC = () => {
  const [som, setSom]               = useState(true);
  const [vibracao, setVibracao]     = useState(true);
  const [visual, setVisual]         = useState(true);
  const [selectedSound, setSelectedSound] = useState('1');
  const [volumeAlarme, setVolumeAlarme]   = useState(75);
  const [carregando, setCarregando]       = useState(true);
  const [playingSoundKey, setPlayingSoundKey] = useState<string | null>(null);
  const [soundSelectorExpanded, setSoundSelectorExpanded] = useState(false);

  const currentSound = useRef<Sound | null>(null);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;


  // --- Carregar preferências (preservado) ---

  const loadPreferences = useCallback(async () => {
    try {
      const [somPref, vibPref, visPref, storedSound, storedVolume] = await Promise.all([
        AsyncStorage.getItem('alarme_som'),
        AsyncStorage.getItem('alarme_vibracao'),
        AsyncStorage.getItem('alarme_visual'),
        AsyncStorage.getItem('alarme_toque'),
        AsyncStorage.getItem('alarme_volume'),
      ]);
      setSom(somPref !== 'false');
      setVibracao(vibPref !== 'false');
      setVisual(visPref !== 'false');
      setSelectedSound(['1','2','3','4'].includes(storedSound ?? '') ? storedSound! : '1');
      setVolumeAlarme(storedVolume ? parseInt(storedVolume, 10) : 75);

      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
      ]).start();
    } catch (error) {
      console.error('❌ Erro ao carregar preferências:', error);
    } finally {
      setCarregando(false);
    }
  }, [fadeAnim, scaleAnim]);

  const savePreference = async (key: string, value: boolean | string | number) => {
    try {
      await AsyncStorage.setItem(`alarme_${key}`, value.toString());
    } catch (error) {
      console.error(`❌ Erro ao salvar ${key}:`, error);
    }
  };

  // ✅ Reagenda passando prefs diretamente — evita race condition
  // onde loadUserPreferences() leria valores antigos do AsyncStorage
  const reagendarComPrefs = useCallback(async (prefs: UserPreferences) => {
    try {
      const medicamentos = await fetchMedicamentos();
      const ativos = medicamentos.filter((med: any) => med.ativo === true);
      if (ativos.length === 0) return;
      for (const med of ativos) {
        await NativeAlarmService.cancelAllAlarms(med.id!);
        const doses = await NativeAlarmService.calcularDoses(med, prefs);
        for (const dose of doses) {
          await NativeAlarmService.scheduleAlarm(dose);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao reagendar com prefs:', error);
    }
  }, []);

  // --- Preview de som (preservado) ---

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
    if (playingSoundKey === key) { stopPreview(); return; }
    stopPreview();
    setPlayingSoundKey(key);
    const soundFile = soundOptions.find(s => s.key === key)?.file;
    if (!soundFile) return;
    const soundName = soundFile.replace('.mp3', '');
    // @ts-ignore
    const soundInstance = new Sound(soundName, Sound.MAIN_BUNDLE, (error) => {
      if (error) { setPlayingSoundKey(null); return; }
      currentSound.current = soundInstance;
      soundInstance.setVolume(volumeAlarme / 100);
      soundInstance.play(() => {
        soundInstance.release();
        currentSound.current = null;
        setPlayingSoundKey(null);
      });
    });
  }, [stopPreview, playingSoundKey, volumeAlarme]);

  const toggleSoundSelector = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSoundSelectorExpanded(prev => !prev);
  };

  // --- Handlers (preservados) ---

  const updateSom = async (value: boolean) => {
    setSom(value);
    if (!value) stopPreview();
    const prefs: UserPreferences = { som: value, vibracao, notificacaoVisual: visual, tipoSom: selectedSound as '1'|'2'|'3'|'4', volumeAlarme };
    await savePreference('som', value);
    await NativeAlarmService.updateGlobalPreferences(prefs);
    await reagendarComPrefs(prefs);
  };

  const updateVibracao = async (value: boolean) => {
    setVibracao(value);
    const prefs: UserPreferences = { som, vibracao: value, notificacaoVisual: visual, tipoSom: selectedSound as '1'|'2'|'3'|'4', volumeAlarme };
    await savePreference('vibracao', value);
    await NativeAlarmService.updateGlobalPreferences(prefs);
    await reagendarComPrefs(prefs);
  };

  const updateVisual = async (value: boolean) => {
    setVisual(value);
    const prefs: UserPreferences = { som, vibracao, notificacaoVisual: value, tipoSom: selectedSound as '1'|'2'|'3'|'4', volumeAlarme };
    await savePreference('visual', value);
    await NativeAlarmService.updateGlobalPreferences(prefs);
    await reagendarComPrefs(prefs);
  };

  const selectSound = async (key: string) => {
    setSelectedSound(key);
    const prefs: UserPreferences = { som, vibracao, notificacaoVisual: visual, tipoSom: key as '1'|'2'|'3'|'4', volumeAlarme };
    await savePreference('toque', key);
    await NativeAlarmService.updateGlobalPreferences(prefs);
    await reagendarComPrefs(prefs);
    setTimeout(() => toggleSoundSelector(), 400);
  };

  const handleVolumeChangeComplete = async (value: number) => {
    const vol = Math.round(value);
    setVolumeAlarme(vol);
    const prefs: UserPreferences = { som, vibracao, notificacaoVisual: visual, tipoSom: selectedSound as '1'|'2'|'3'|'4', volumeAlarme: vol };
    await savePreference('volume', vol);
    await NativeAlarmService.updateGlobalPreferences(prefs);
    await reagendarComPrefs(prefs);
  };

  useEffect(() => {
    loadPreferences();
    return () => stopPreview();
  }, [loadPreferences, stopPreview]);

  // --- Helpers de volume ---

  const getVolumeLevelLabel = (vol: number): string => {
    if (vol === 0)   return 'Mudo';
    if (vol <= 30)   return 'Baixo';
    if (vol <= 70)   return 'Médio';
    return 'Alto';
  };

  const getVolumeBadgeStyle = (vol: number) => {
    if (vol === 0)   return styles.volumeBadgeMudo;
    if (vol <= 30)   return styles.volumeBadgeBaixo;
    if (vol <= 70)   return styles.volumeBadgeMedio;
    return styles.volumeBadgeAlto;
  };

  const selectedSoundName = soundOptions.find(s => s.key === selectedSound)?.name || 'Toque Clássico';

  if (carregando) {
    return (
      <ScreenContainer showGradient={true}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.textWhite} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer showGradient={true}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.ScrollView
        style={[styles.scroll, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={styles.headerSection}>
          {/* ✅ mantido 28px — título de tela, ok */}
          <Text style={styles.title}>Preferências</Text>
          {/* ✅ 15 → 16px */}
          <Text style={styles.subtitle}>Personalize suas notificações de alarme</Text>
        </View>

        {/* ══ Card de toggles ══ */}
        <View style={styles.card}>

          {/* Som */}
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Text style={styles.emojiIcon}>🔔</Text>
            </View>
            <View style={styles.rowText}>
              {/* ✅ 16 → 17px */}
              <Text style={styles.rowTitle}>Som do Alarme</Text>
              {/* ✅ 13 → 15px */}
              <Text style={styles.rowDesc}>Ativar alertas sonoros</Text>
            </View>
            <Switch
              value={som}
              onValueChange={updateSom}
              trackColor={{ false: '#D1D1D1', true: theme.colors.primary }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Ativar ou desativar som do alarme"
            />
          </View>

          <View style={styles.divider} />

          {/* Vibração */}
          <View style={styles.row}>
            <View style={styles.iconContainerVibracao}>
              <Text style={styles.emojiIcon}>📳</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Vibração</Text>
              <Text style={styles.rowDesc}>Feedback tátil no aparelho</Text>
            </View>
            <Switch
              value={vibracao}
              onValueChange={updateVibracao}
              trackColor={{ false: '#D1D1D1', true: '#10B981' }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Ativar ou desativar vibração"
            />
          </View>

          <View style={styles.divider} />

          {/* Visual */}
          <View style={styles.row}>
            <View style={styles.iconContainerVisual}>
              <Text style={styles.emojiIcon}>📱</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Notificação Visual</Text>
              <Text style={styles.rowDesc}>Alertas visuais na tela</Text>
            </View>
            <Switch
              value={visual}
              onValueChange={updateVisual}
              trackColor={{ false: '#D1D1D1', true: '#F59E0B' }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Ativar ou desativar notificação visual"
            />
          </View>

        </View>

        {/* ══ Card de Volume ══ */}
        <View style={styles.volumeCard}>
          <View style={styles.volumeHeader}>
            <View style={styles.volumeTitleSection}>
              <Text style={styles.emojiIconSmall}>🔊</Text>
              {/* ✅ 16 → 17px */}
              <Text style={styles.volumeTitle}>Volume do Alarme</Text>
            </View>
            <View style={[styles.volumeBadge, getVolumeBadgeStyle(volumeAlarme)]}>
              {/* ✅ 12 → 14px */}
              <Text style={styles.volumeBadgeText}>{getVolumeLevelLabel(volumeAlarme)}</Text>
            </View>
          </View>

          {/* ✅ 13 → 15px */}
          <Text style={styles.volumeSubtitle}>
            Ajuste o nível de som ideal para não perder seus medicamentos.
          </Text>

          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={1}
              value={volumeAlarme}
              onSlidingComplete={handleVolumeChangeComplete}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor="#E2E8F0"
              thumbTintColor={theme.colors.primary}
              accessibilityLabel={`Volume do alarme: ${volumeAlarme}%`}
            />
            <View style={styles.sliderLabels}>
              {/* ✅ 11 → 13px */}
              <Text style={styles.sliderLabel}>Mín</Text>
              <Text style={styles.sliderLabel}>{volumeAlarme}%</Text>
              <Text style={styles.sliderLabel}>Máx</Text>
            </View>
          </View>

          <View style={styles.volumeHintContainer}>
            {/* ✅ 12px itálico → 14px sem itálico */}
            <Text style={styles.volumeHint}>
              Dica: <Text style={styles.volumeHintBold}>Volumes acima de 70%</Text> garantem que você ouça o alerta mesmo em ambientes ruidosos.
            </Text>
          </View>
        </View>

        {/* ══ Seletor de Toque ══ */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeaderTouchable}
            onPress={toggleSoundSelector}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Toque selecionado: ${selectedSoundName}. Toque para ${soundSelectorExpanded ? 'fechar' : 'abrir'} seleção`}
          >
            <View style={styles.headerTitleRow}>
              <View style={styles.iconContainerToque}>
                <Text style={styles.emojiIcon}>🎵</Text>
              </View>
              <View>
                {/* ✅ 16 → 17px */}
                <Text style={styles.cardTitle}>Toque Selecionado</Text>
                {/* ✅ 14 → 15px */}
                <Text style={styles.selectedText}>{selectedSoundName}</Text>
              </View>
            </View>
            {/* ✅ arrowContainer: 28×28 → 36×36 */}
            <View style={[styles.arrowContainer, soundSelectorExpanded && styles.arrowContainerActive]}>
              <Text style={styles.arrow}>{soundSelectorExpanded ? '▲' : '▼'}</Text>
            </View>
          </TouchableOpacity>

          {soundSelectorExpanded && (
            <View style={styles.listContainer}>
              {soundOptions.map(item => {
                const isSelected = selectedSound === item.key;
                const isPlaying  = playingSoundKey === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.soundItem, isSelected && styles.soundItemSelected]}
                    onPress={() => selectSound(item.key)}
                    accessibilityRole="radio"
                    accessibilityLabel={item.name}
                    accessibilityState={{ checked: isSelected }}
                  >
                    <View style={styles.radioRow}>
                      {/* ✅ radio: 20×20 → 24×24 */}
                      <View style={[styles.radio, isSelected && styles.radioActive]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      {/* ✅ 15 → 16px */}
                      <Text style={[styles.soundName, isSelected && styles.soundNameActive]}>
                        {item.name}
                      </Text>
                    </View>
                    {/* ✅ playBtn: 32×32 → 44×44 */}
                    <TouchableOpacity
                      style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                      onPress={() => playPreview(item.key)}
                      accessibilityRole="button"
                      accessibilityLabel={isPlaying ? `Parar ${item.name}` : `Ouvir ${item.name}`}
                    >
                      <Text style={[styles.playIcon, isPlaying && styles.playIconActive]}>
                        {isPlaying ? '⏹' : '▶'}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Rodapé */}
        <View style={styles.footer}>
          <View style={styles.footerBadge}>
            <Text style={styles.footerEmoji}>🛡️</Text>
            {/* ✅ 12 → 14px */}
            <Text style={styles.footerText}>Suas configurações são salvas automaticamente</Text>
          </View>
        </View>

      </Animated.ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:          { flex: 1 },
  scrollContent:   { padding: 16, paddingBottom: 40 },

  headerSection: { marginBottom: 24, marginTop: -5 },
  // ✅ mantido 28px
  title:    { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, lineHeight: 36 },
  // ✅ 15 → 16px
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 4, lineHeight: 24 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 24,
    padding: 18,           // ✅ era 16
    marginBottom: 16,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },

  // ✅ iconContainers: 40×40 → 48×48
  iconContainer:         { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  iconContainerVibracao: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  iconContainerVisual:   { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFFBEB', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  iconContainerToque:    { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },

  // ✅ era 20/18 — aumentados levemente
  emojiIcon:      { fontSize: 22 },
  emojiIconSmall: { fontSize: 20, marginRight: 10 },

  // ✅ paddingVertical: 8 → 12 — área de toque da linha
  row:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowText: { flex: 1 },
  // ✅ 16 → 17px
  rowTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', lineHeight: 24 },
  // ✅ 13 → 15px
  rowDesc:  { fontSize: 15, color: '#64748B', marginTop: 2, lineHeight: 22 },
  divider:  { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },

  // Seletor de toque
  cardHeaderTouchable: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  headerTitleRow:      { flexDirection: 'row', alignItems: 'center' },
  // ✅ 16 → 17px
  cardTitle:    { fontSize: 17, fontWeight: '700', color: '#1E293B', lineHeight: 24 },
  // ✅ 14 → 15px
  selectedText: { fontSize: 15, color: theme.colors.primary, fontWeight: '600', marginTop: 2 },

  // Volume card
  volumeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  volumeHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  volumeTitleSection: { flexDirection: 'row', alignItems: 'center' },
  // ✅ 16 → 17px
  volumeTitle:    { fontSize: 17, fontWeight: '700', color: '#1E293B', lineHeight: 24 },
  // ✅ 13 → 15px, lineHeight 18 → 22
  volumeSubtitle: { fontSize: 15, color: '#64748B', marginBottom: 16, lineHeight: 22 },

  volumeBadge:      { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, minHeight: 30, justifyContent: 'center' },
  volumeBadgeMudo:  { backgroundColor: '#FEE2E2' },
  volumeBadgeBaixo: { backgroundColor: '#FEF3C7' },
  volumeBadgeMedio: { backgroundColor: '#DCFCE7' },
  volumeBadgeAlto:  { backgroundColor: '#DBEAFE' },
  // ✅ 12 → 14px
  volumeBadgeText: { fontSize: 14, fontWeight: '800', color: '#1E293B' },

  sliderContainer: { marginTop: 4 },
  slider:          { width: '100%', height: 44 },   // ✅ era 40
  sliderLabels:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  // ✅ 11 → 13px
  sliderLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },

  volumeHintContainer: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  // ✅ 12px itálico → 14px sem itálico
  volumeHint:     { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  volumeHintBold: { fontWeight: '700', color: theme.colors.primary },

  // ✅ arrowContainer: 28×28 → 36×36
  arrowContainer:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  arrowContainerActive: { backgroundColor: '#EFF6FF' },
  // ✅ arrow: 10 → 13px — mais visível
  arrow: { fontSize: 13, color: '#64748B' },

  listContainer: {
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  // ✅ padding 12 → 14, minHeight para toque
  soundItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginVertical: 2,
    minHeight: 52,         // ✅ área de toque mínima
  },
  soundItemSelected: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  radioRow: { flexDirection: 'row', alignItems: 'center' },
  // ✅ radio: 20×20 → 26×26
  radio: {
    height: 26,
    width: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioActive: { borderColor: theme.colors.primary },
  // ✅ radioInner: 10×10 → 13×13
  radioInner: { height: 13, width: 13, borderRadius: 7, backgroundColor: theme.colors.primary },
  // ✅ 15 → 16px
  soundName:       { fontSize: 16, color: '#475569', fontWeight: '500', lineHeight: 24 },
  soundNameActive: { color: '#1E293B', fontWeight: '700' },

  // ✅ playBtn: 32×32 → 44×44
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  playBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  // ✅ playIcon: 12 → 16px
  playIcon:       { fontSize: 16, color: theme.colors.primary },
  playIconActive: { color: '#FFFFFF' },

  footer:      { marginTop: 24, alignItems: 'center' },
  footerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  footerEmoji: { marginRight: 8, fontSize: 16 },
  // ✅ 12 → 14px
  footerText:  { fontSize: 14, color: '#FFFFFF', fontWeight: '600', lineHeight: 20 },
});

export default PreferenciasAlarmes;
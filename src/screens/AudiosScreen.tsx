import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import Sound from 'react-native-sound';
import Slider from '@react-native-community/slider';
import { fetchAudiosAtivos, Audio as AudioItem } from '../services/audiosService';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO, isValid } from 'date-fns';

const AudioCard = React.memo(({ item, index, playbackState, togglePlayback, toggleSpeedBar, showSpeedBar, speedAnim, handleSpeedSliderChange, currentSpeed, formatarData }: {
  item: AudioItem;
  index: number;
  playbackState: any;
  togglePlayback: (item: AudioItem) => void;
  toggleSpeedBar: () => void;
  showSpeedBar: boolean;
  speedAnim: Animated.Value;
  handleSpeedSliderChange: (rate: number) => void;
  currentSpeed: number;
  formatarData: (data: string) => string;
}) => {
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      delay: index * 80,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [cardAnim, index]);

  const translateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: cardAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.audioBadge}>
            <Text style={styles.audioEmoji}>🎵</Text>
            <Text style={styles.audioText}>Áudio</Text>
          </View>
          <Text style={styles.date}>{formatarData(item.data)}</Text>
        </View>

        {/* Title & Description */}
        <Text style={styles.title}>{item.titulo}</Text>
        <Text style={styles.description} numberOfLines={3}>
          {item.descricao}
        </Text>

        {/* Play Button */}
        <TouchableOpacity 
          onPress={() => togglePlayback(item)} 
          style={styles.playButton}
          activeOpacity={0.8}
        >
          <Text style={styles.playEmoji}>
            {playbackState.id === item.id && playbackState.isPlaying ? '⏸️' : '▶️'}
          </Text>
          <Text style={styles.playText}>
            {playbackState.id === item.id && playbackState.isPlaying ? 'Pausar' : 'Reproduzir'}
          </Text>
        </TouchableOpacity>

        {/* Player Controls */}
        {playbackState.id === item.id && (
          <>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={playbackState.duration}
                value={playbackState.position}
                minimumTrackTintColor="#0066CC"
                maximumTrackTintColor="#E0E0E0"
                thumbTintColor="#0066CC"
                disabled
              />
              <Text style={styles.duration}>
                {Math.floor(playbackState.position / 1000)}s / {Math.floor(playbackState.duration / 1000)}s
              </Text>
            </View>

            <TouchableOpacity onPress={toggleSpeedBar} style={styles.speedToggle}>
              <Text style={styles.speedEmoji}>⚡</Text>
              <Text style={styles.speedToggleText}>Velocidade: {currentSpeed.toFixed(1)}x</Text>
            </TouchableOpacity>

            {showSpeedBar && (
              <Animated.View
                style={[
                  styles.speedBarContainer,
                  {
                    opacity: speedAnim,
                    transform: [
                      { translateY: speedAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                    ],
                  }
                ]}
              >
                <Slider
                  style={styles.speedSlider}
                  minimumValue={0.5}
                  maximumValue={2.0}
                  step={0.5}
                  value={currentSpeed}
                  onValueChange={handleSpeedSliderChange}
                  minimumTrackTintColor="#0066CC"
                  maximumTrackTintColor="#E0E0E0"
                  thumbTintColor="#0066CC"
                />
                <Text style={styles.speedValue}>{currentSpeed.toFixed(1)}x</Text>
              </Animated.View>
            )}
          </>
        )}
      </View>
    </Animated.View>
  );
});

export default function AudiosScreen() {
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [audioSpeeds, setAudioSpeeds] = useState<{ [key: number]: number }>({});
  const [showSpeedBar, setShowSpeedBar] = useState(false);
  
  const speedAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const soundRef = useRef<Sound | null>(null);
  const progressInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speedBarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playbackState, setPlaybackState] = useState({
    id: 0,
    isPlaying: false,
    position: 0,
    duration: 1,
    volume: 1,
  });

  const loadAudios = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchAudiosAtivos();
      const sortedAudios = [...data].sort((a, b) =>
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );
      setAudios(sortedAudios);
      
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os áudios');
      console.error('Erro ao carregar áudios:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    loadAudios();
  }, [loadAudios]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        stopAudio();
      };
    }, [])
  );

  const stopAudio = () => {
    if (soundRef.current) {
      soundRef.current.stop(() => soundRef.current?.release());
      soundRef.current = null;
    }
    setPlaybackState({
      id: 0,
      isPlaying: false,
      position: 0,
      duration: 1,
      volume: 1,
    });
    if (progressInterval.current) clearInterval(progressInterval.current);
  };

  const startProgressTracking = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      if (soundRef.current) {
        (soundRef.current as any).getCurrentTime((seconds: number, isPlaying: boolean) => {
          if (isPlaying) {
            setPlaybackState(prev => ({
              ...prev,
              position: seconds * 1000,
              isPlaying: true,
            }));
          }
        });
      }
    }, 100);
  };

  const togglePlayback = (item: AudioItem) => {
    try {
      const currentSpeed = audioSpeeds[item.id] || 1.0;
      
      if (playbackState.id === item.id) {
        if (playbackState.isPlaying) {
          if (soundRef.current && (soundRef.current as any).pause) {
            (soundRef.current as any).pause();
          }
          if (progressInterval.current) clearInterval(progressInterval.current);
        } else {
          soundRef.current?.play(() => stopAudio());
          startProgressTracking();
        }
        setPlaybackState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
        return;
      }

      stopAudio();

      const sound = new Sound(item.audioUrl, Sound.MAIN_BUNDLE, error => {
        if (error) {
          Alert.alert('Erro', 'Não foi possível reproduzir o áudio');
          return;
        }
        soundRef.current = sound;
        if ((sound as any).setSpeed) {
          (sound as any).setSpeed(currentSpeed);
        }
        sound.play(() => stopAudio());

        const duration = (sound as any).getDuration ? (sound as any).getDuration() * 1000 : 1000;

        setPlaybackState({
          id: item.id,
          isPlaying: true,
          position: 0,
          duration: duration,
          volume: playbackState.volume,
        });
        startProgressTracking();
      });
    } catch {
      Alert.alert('Formato não suportado', 'Este formato de áudio não é compatível');
    }
  };

  const toggleSpeedBar = () => {
    if (showSpeedBar) {
      Animated.timing(speedAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
        setShowSpeedBar(false)
      );
      if (speedBarTimeoutRef.current) clearTimeout(speedBarTimeoutRef.current);
    } else {
      setShowSpeedBar(true);
      Animated.timing(speedAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
        speedBarTimeoutRef.current = setTimeout(() => {
          Animated.timing(speedAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
            setShowSpeedBar(false)
          );
        }, 5000);
      });
    }
  };

  const handleSpeedSliderChange = (rate: number) => {
    if (playbackState.id === 0) return;
    
    setAudioSpeeds(prev => ({ ...prev, [playbackState.id]: rate }));
    
    if (soundRef.current && (soundRef.current as any).setSpeed) {
      (soundRef.current as any).setSpeed(rate);
    }
    
    if (speedBarTimeoutRef.current) clearTimeout(speedBarTimeoutRef.current);
    speedBarTimeoutRef.current = setTimeout(() => {
      Animated.timing(speedAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
        setShowSpeedBar(false)
      );
    }, 5000);
  };

  const formatarData = (dataString: string) => {
    try {
      const data = parseISO(dataString);
      if (!isValid(data)) return dataString;
      return `📅 Publicado em ${format(data, 'dd/MM/yyyy')}`;
    } catch {
      return dataString;
    }
  };

  const renderAudioItem = ({ item, index }: { item: AudioItem; index: number }) => {
    const currentSpeed = audioSpeeds[item.id] || 1.0;
    
    return (
      <AudioCard
        item={item}
        index={index}
        playbackState={playbackState}
        togglePlayback={togglePlayback}
        toggleSpeedBar={toggleSpeedBar}
        showSpeedBar={showSpeedBar}
        speedAnim={speedAnim}
        handleSpeedSliderChange={handleSpeedSliderChange}
        currentSpeed={currentSpeed}
        formatarData={formatarData}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#0066CC" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingEmoji}>🎵</Text>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Carregando áudios...</Text>
        </View>
      </View>
    );
  }

  if (audios.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#0066CC" barStyle="light-content" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎧</Text>
          <Text style={styles.emptyText}>Nenhum áudio disponível</Text>
          <Text style={styles.emptySubtext}>Novos conteúdos em breve! ✨</Text>
          <TouchableOpacity onPress={loadAudios} style={styles.retryButton}>
            <Text style={styles.retryEmoji}>🔄</Text>
            <Text style={styles.retryText}>Recarregar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0066CC" barStyle="light-content" />
      
      <Animated.View 
        style={[
          styles.animatedHeader,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🎵</Text>
          <View>
            <Text style={styles.headerTitle}>Áudios Educativos</Text>
            <Text style={styles.headerSubtitle}>
              {audios.length} áudio{audios.length !== 1 ? 's' : ''} disponível{audios.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </Animated.View>

      <FlatList
        data={audios}
        keyExtractor={item => item.id.toString()}
        renderItem={renderAudioItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={loadAudios}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  animatedHeader: {
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#0066CC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 50,
  },
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  audioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  audioEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  audioText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066CC',
    letterSpacing: 0.3,
  },
  date: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
    marginBottom: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  playEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  playText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  sliderContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  duration: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
    fontWeight: '500',
  },
  speedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  speedEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  speedToggleText: {
    color: '#0066CC',
    fontWeight: '600',
    fontSize: 12,
  },
  speedBarContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 102, 204, 0.05)',
    borderRadius: 8,
  },
  speedSlider: {
    width: '100%',
    height: 40,
  },
  speedValue: {
    textAlign: 'center',
    color: '#0066CC',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#1A1A1A',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  retryEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
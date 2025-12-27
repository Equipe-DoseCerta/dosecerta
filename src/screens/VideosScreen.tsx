import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Animated,
  Linking,
  Dimensions,
  Modal,
} from 'react-native';
import { fetchVideos, Video as VideoType } from '../services/videosService';
import { format, parseISO, isValid } from 'date-fns';
// @ts-ignore
import Video from 'react-native-video';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const isYouTubeUrl = (url: string): boolean => /youtube\.com|youtu\.be/.test(url);

const VideosScreen: React.FC = () => {
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const carregarVideos = useCallback(async () => {
    setRefreshing(true);
    setError(false);
    try {
      const dados = await fetchVideos();
      const sortedVideos = [...dados].sort((a, b) =>
        new Date(b.data).getTime() - new Date(a.data).getTime()
      );
      setVideos(sortedVideos);
      
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
    } catch (err) {
      setError(true);
      console.error('Erro ao carregar vídeos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    carregarVideos();
  }, [carregarVideos]);

  const openVideo = async (url: string) => {
    try {
      if (isYouTubeUrl(url)) {
        const youtubeAppUrl = url.replace('https://www.youtube.com/', 'youtube://');
        const canOpen = await Linking.canOpenURL(youtubeAppUrl);
        
        if (canOpen) {
          await Linking.openURL(youtubeAppUrl);
        } else {
          await Linking.openURL(url);
        }
      } else {
        await Linking.openURL(url);
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível abrir o vídeo');
      console.error('Erro ao abrir vídeo:', err);
    }
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

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#0066CC" barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingEmoji}>🎬</Text>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Carregando vídeos...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#0066CC" barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>😔</Text>
          <Text style={styles.errorText}>Oops! Não foi possível carregar os vídeos</Text>
          <Text style={styles.errorSubtext}>Verifique sua conexão e tente novamente</Text>
          <TouchableOpacity onPress={carregarVideos} style={styles.retryButton}>
            <Text style={styles.retryEmoji}>🔄</Text>
            <Text style={styles.retryText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#0066CC" barStyle="light-content" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎥</Text>
          <Text style={styles.emptyText}>Nenhum vídeo disponível</Text>
          <Text style={styles.emptySubtext}>Novos conteúdos em breve! ✨</Text>
          <TouchableOpacity onPress={carregarVideos} style={styles.retryButton}>
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
          <Text style={styles.headerEmoji}>🎬</Text>
          <View>
            <Text style={styles.headerTitle}>Vídeos Educativos</Text>
            <Text style={styles.headerSubtitle}>
              {videos.length} vídeo{videos.length !== 1 ? 's' : ''} disponível{videos.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </Animated.View>

      <VideoList 
        videos={videos} 
        onOpenVideo={openVideo} 
        formatarData={formatarData}
        refreshing={refreshing}
        onRefresh={carregarVideos}
      />
    </View>
  );
};

const VideoList: React.FC<{
  videos: VideoType[];
  onOpenVideo: (url: string) => void;
  formatarData: (data: string) => string;
  refreshing: boolean;
  onRefresh: () => void;
}> = ({ videos, onOpenVideo, formatarData, refreshing, onRefresh }) => {
  return (
    <FlatList
      data={videos}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item, index }) => (
        <CardVideo 
          item={item} 
          index={index} 
          onOpenVideo={onOpenVideo}
          formatarData={formatarData}
        />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
};

const CardVideo: React.FC<{
  item: VideoType;
  index: number;
  onOpenVideo: (url: string) => void;
  formatarData: (data: string) => string;
}> = React.memo(({ item, index, onOpenVideo, formatarData }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [paused, setPaused] = useState(true);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<any>(null);
  
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

  const handlePlayPause = () => {
    if (isYouTubeUrl(item.videoUrl)) {
      onOpenVideo(item.videoUrl);
    } else {
      setPaused(!paused);
      setIsPlaying(!isPlaying);
    }
  };

  const handleFullscreen = () => {
    setShowFullscreen(true);
    setPaused(false);
  };

  const closeFullscreen = () => {
    setShowFullscreen(false);
    setPaused(true);
    setIsPlaying(false);
  };

  return (
    <>
      <Animated.View
        style={[
          styles.cardWrapper,
          {
            opacity: cardAnim,
            transform: [{ translateY }],
          },
        ]}
      >
        <TouchableOpacity 
          onPress={() => onOpenVideo(item.videoUrl)} 
          activeOpacity={0.95}
          style={styles.card}
        >
          {/* Preview Area */}
          <View style={styles.previewContainer}>
            {!isYouTubeUrl(item.videoUrl) && isPlaying ? (
              <Video
                ref={videoRef}
                source={{ uri: item.videoUrl }}
                style={styles.videoPreview}
                paused={paused}
                resizeMode="cover"
                muted={false}
                onError={(error: any) => console.error('Video Error:', error)}
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Text style={styles.thumbnailEmoji}>
                  {isYouTubeUrl(item.videoUrl) ? "📺" : "🎬"}
                </Text>
              </View>
            )}
            
            {/* Overlay Controls */}
            <View style={styles.previewOverlay}>
              <TouchableOpacity 
                style={styles.controlButton} 
                onPress={handlePlayPause}
                activeOpacity={0.8}
              >
                <Text style={styles.controlEmoji}>
                  {paused ? "▶️" : "⏸️"}
                </Text>
              </TouchableOpacity>
              
              {!isYouTubeUrl(item.videoUrl) && (
                <TouchableOpacity 
                  style={styles.controlButton} 
                  onPress={handleFullscreen}
                  activeOpacity={0.8}
                >
                  <Text style={styles.controlEmoji}>⛶</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Card Content */}
          <View style={styles.cardContent}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.platformBadge}>
                <Text style={styles.platformEmoji}>
                  {isYouTubeUrl(item.videoUrl) ? "📺" : "🎥"}
                </Text>
                <Text style={styles.platformText}>
                  {isYouTubeUrl(item.videoUrl) ? "YouTube" : "Vídeo"}
                </Text>
              </View>
              <View style={styles.dateContainer}>
                <Text style={styles.date}>{formatarData(item.data)}</Text>
              </View>
            </View>

            {/* Title & Description */}
            <Text style={styles.title}>{item.titulo}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {item.descricao}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Fullscreen Modal */}
      <Modal
        visible={showFullscreen}
        animationType="fade"
        onRequestClose={closeFullscreen}
        supportedOrientations={['portrait', 'landscape']}
      >
        <View style={styles.fullscreenContainer}>
          <StatusBar hidden />
          
          {!isYouTubeUrl(item.videoUrl) && (
            <Video
              ref={videoRef}
              source={{ uri: item.videoUrl }}
              style={styles.fullscreenVideo}
              paused={paused}
              resizeMode="contain"
              controls={true}
              onError={(error: any) => console.error('Fullscreen Video Error:', error)}
            />
          )}

          {/* Fullscreen Controls */}
          <View style={styles.fullscreenControls}>
            <TouchableOpacity 
              style={styles.fullscreenButton} 
              onPress={() => setPaused(!paused)}
              activeOpacity={0.8}
            >
              <Text style={styles.fullscreenEmoji}>
                {paused ? "▶️" : "⏸️"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.fullscreenButton} 
              onPress={closeFullscreen}
              activeOpacity={0.8}
            >
              <Text style={styles.fullscreenEmoji}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
});

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#0066CC',
  },
  previewContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#E8EFF5',
    position: 'relative',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8EFF5',
  },
  thumbnailEmoji: {
    fontSize: 64,
    opacity: 0.4,
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 102, 204, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  controlEmoji: {
    fontSize: 24,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  platformEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066CC',
    letterSpacing: 0.3,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#1A1A1A',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
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
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullscreenControls: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  fullscreenButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 102, 204, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  fullscreenEmoji: {
    fontSize: 28,
  },
});

export default VideosScreen;
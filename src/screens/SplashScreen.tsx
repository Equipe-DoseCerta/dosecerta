import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

const SplashScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);

  const iconPulseAnim = useRef(new Animated.Value(1)).current;
  const backgroundPulseAnim = useRef(new Animated.Value(1)).current;
  const backgroundBounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(iconPulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundPulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundPulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundBounceAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundBounceAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const timer = setTimeout(() => {
      setIsLoading(false);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Welcome' as never }],
        })
      );
    }, 3000);

    return () => clearTimeout(timer);
  }, [iconPulseAnim, backgroundPulseAnim, backgroundBounceAnim, navigation]);

  return (
    <LinearGradient
      colors={['#054F77', '#0A7394', '#1583A8']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      <Animated.View
        style={[styles.animatedCircle, styles.animatedCircleTopLeft, { transform: [{ scale: backgroundPulseAnim }] }]}
      />
      <Animated.View
        style={[styles.animatedCircle, styles.bounceCircle, styles.animatedCircleTopRight, { transform: [{ translateY: backgroundBounceAnim }] }]}
      />
      <Animated.View
        style={[styles.animatedCircle, styles.animatedCircleBottomLeft, { transform: [{ scale: backgroundPulseAnim }] }]}
      />
      <Animated.View
        style={[styles.animatedCircle, styles.bounceCircle, styles.animatedCircleBottomRight, { transform: [{ translateY: backgroundBounceAnim }] }]}
      />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoWrapper,
            { transform: [{ scale: iconPulseAnim }] },
          ]}
        >
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#004F7A', '#066B92']}
              style={styles.pillIcon}
            >
              <Text style={styles.iconText}>💊</Text>
            </LinearGradient>
          </View>
        </Animated.View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>DoseCerta</Text>
          <Text style={styles.subtitle}>Sua saúde em dia, sempre na hora certa</Text>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Versão 1.0.1</Text>
        <Text style={styles.footerSmallText}>Cuidando da sua medicação</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 9999,
    width: 80,
    height: 80,
  },
  animatedCircleTopLeft: {
    top: '10%',
    left: '10%',
  },
  animatedCircleTopRight: {
    top: '30%',
    right: '15%',
  },
  animatedCircleBottomLeft: {
    bottom: '20%',
    left: '20%',
  },
  animatedCircleBottomRight: {
    bottom: '40%',
    right: '10%',
  },
  bounceCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    zIndex: 10,
    alignItems: 'center',
  },
  logoWrapper: {
    width: 128,
    height: 128,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pillIcon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#E0F2FE',
    fontWeight: '300',
    textAlign: 'center',
  },
  loadingContainer: {
    marginTop: 50,
    alignItems: 'center',
  },
  loadingText: {
    color: '#E0F2FE',
    fontSize: 16,
    marginTop: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  footerSmallText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 5,
  },
});

export default SplashScreen;
import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '../constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  showGradient?: boolean;
  style?: ViewStyle; // Permite passar estilo extra se necessário
  contentStyle?: ViewStyle; // ✅ NOVO: Permite controlar o padding do conteúdo globalmente ou por tela
}

const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  showGradient = false,
  style,
  contentStyle,
}) => {
  return (
    <SafeAreaView
      style={[styles.container, showGradient && styles.gradientContainer]}
      edges={['bottom', 'left', 'right']} 
    >
      <StatusBar
        backgroundColor={theme.colors.primary}
        barStyle="light-content"
      />
      <View style={[styles.content, style]}>
        {showGradient ? (
          <LinearGradient
            colors={['#4A7FA6', '#7A9FC2', '#A5C2DB']}
            style={[styles.gradientContent, contentStyle]} // ✅ Aplica o estilo personalizado aqui
          >
            {children}
          </LinearGradient>
        ) : (
          <View style={[styles.plainContent, contentStyle]}>
            {children}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  gradientContainer: {
    backgroundColor: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  plainContent: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // ✅ ALTERAÇÃO GLOBAL: Removido paddingHorizontal e paddingVertical fixos
  gradientContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.md - 10, 
    // Agora o padding é controlado pela prop contentStyle ou pelos estilos internos da tela
  },
});

export default ScreenContainer;
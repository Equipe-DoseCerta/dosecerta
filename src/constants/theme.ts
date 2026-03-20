// src/constants/theme.ts

export const theme = {
  colors: {
    primary: '#054F77',           // Barra superior (mantém)
    secondary: '#0A7AB8',         
    background: '#F5F7FA',        // Background principal (NOVO)
    cardBg: '#FFFFFF',            // Cards (mantém)
    text: '#1E293B',              // Texto principal (melhor contraste)
    textLight: '#64748B',         // Texto secundário
    textWhite: '#F8FAFC', 
    error: '#FF5252',
    success: '#4CAF50',
    warning: '#FF9800',
    border: '#E0E0E0',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  
  typography: {
    h1: {
      fontSize: 24,
      fontWeight: '700' as const,
    },
    h2: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    h3: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
    },
  },
  
  shadows: {
    small: {
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    medium: {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    large: {
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
  },
  
  gradients: {
    primary: ['#054F77', '#0A7AB8'],
    header: ['#0F172A', '#1E293B'],
    success: ['#4CAF50', '#2E7D32'],
    error: ['#FF5252', '#D32F2F'],
    warning: ['#FF9800', '#F57C00'],
    info: ['#2196F3', '#1976D2'],
  },
};
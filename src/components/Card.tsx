import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  noPadding = false 
}) => {
  return (
    <View style={[
      styles.card, 
      noPadding && styles.noPadding,
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  noPadding: {
    padding: 0,
  },
});

export default Card;

import React, { forwardRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TextInputProps,
  ViewStyle,
  Platform,
} from 'react-native';
import { theme } from '../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: boolean;
  errorMessage?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

const Input = forwardRef<TextInput, InputProps>(({
  label,
  error = false,
  errorMessage,
  containerStyle,
  disabled = false,
  style,
  ...props
}, ref) => {
  return (
    <View style={containerStyle}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View style={[
        styles.inputContainer,
        error && styles.errorField,
        disabled && styles.disabledInput,
      ]}>
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor="#999"
          editable={!disabled}
          {...props}
        />
      </View>
      {error && errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? theme.spacing.md : theme.spacing.sm,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    height: 48,
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    borderColor: '#CCC',
  },
  errorField: {
    borderWidth: 2,
    borderColor: theme.colors.error,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.error,
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
});

export default Input;

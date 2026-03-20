// src/services/NovidadesManager.tsx
// 🆕 GERENCIADOR DE CHECAGEM DE NOVIDADES
// Use este arquivo para controlar a checagem de novidades no React Native

import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { AlarmModule } = NativeModules;

export class NovidadesManager {
  
  /**
   * 🚀 Inicia a checagem periódica de novidades
   * @param intervaloHoras Intervalo entre checagens (6, 12, 24 horas, etc)
   */
  static async iniciarChecagemPeriodica(intervaloHoras: number = 12): Promise<boolean> {
    try {
      console.log(`🔔 Iniciando checagem periódica a cada ${intervaloHoras} horas...`);
      
      if (Platform.OS !== 'android') {
        console.warn('⚠️ Checagem de novidades disponível apenas no Android');
        return false;
      }

      // Chama o método nativo para agendar
      await AlarmModule.scheduleNovidadesCheck(intervaloHoras);
      
      // Salva no AsyncStorage para referência
      await AsyncStorage.setItem('novidades_check_interval', intervaloHoras.toString());
      
      console.log('✅ Checagem periódica configurada com sucesso!');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao iniciar checagem periódica:', error);
      return false;
    }
  }

  /**
   * 🛑 Para a checagem periódica de novidades
   */
  static async pararChecagemPeriodica(): Promise<boolean> {
    try {
      console.log('🛑 Parando checagem periódica...');
      
      if (Platform.OS !== 'android') {
        return false;
      }

      await AlarmModule.cancelNovidadesCheck();
      await AsyncStorage.removeItem('novidades_check_interval');
      
      console.log('✅ Checagem periódica cancelada');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao parar checagem:', error);
      return false;
    }
  }

  /**
   * ✅ Verifica se a checagem está ativa
   */
  static async verificarStatus(): Promise<{ isActive: boolean; intervaloHoras: number }> {
    try {
      if (Platform.OS !== 'android') {
        return { isActive: false, intervaloHoras: 0 };
      }

      const result = await AlarmModule.isNovidadesCheckActive();
      
      console.log(`🔍 Status da checagem: ${result.isActive ? 'ATIVA' : 'INATIVA'}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error);
      return { isActive: false, intervaloHoras: 0 };
    }
  }

  /**
   * 🔄 Atualiza o intervalo de checagem
   */
  static async atualizarIntervalo(novoIntervalo: number): Promise<boolean> {
    try {
      console.log(`🔄 Atualizando intervalo para ${novoIntervalo} horas...`);
      
      // Cancela o atual
      await this.pararChecagemPeriodica();
      
      // Agenda com novo intervalo
      await this.iniciarChecagemPeriodica(novoIntervalo);
      
      console.log('✅ Intervalo atualizado com sucesso');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao atualizar intervalo:', error);
      return false;
    }
  }

  /**
   * 📊 Retorna os intervalos disponíveis
   */
  static getIntervalosDisponiveis(): Array<{ label: string; horas: number }> {
    return [
      { label: 'A cada 1 hora', horas: 1 },
      { label: 'A cada 3 horas', horas: 3 },
      { label: 'A cada 6 horas', horas: 6 },
      { label: 'A cada 12 horas', horas: 12 },
      { label: 'A cada 24 horas (diário)', horas: 24 },
    ];
  }
}

// ========================================
// 🆕 EXEMPLO DE USO EM COMPONENTE REACT
// ========================================

/**
 * Exemplo de componente de configuração
 */
/*
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Switch, Picker } from 'react-native';
import { NovidadesManager } from './NovidadesManager';

export const ConfiguracoesNovidadesScreen = () => {
  const [checagemAtiva, setChecagemAtiva] = useState(false);
  const [intervaloSelecionado, setIntervaloSelecionado] = useState(12);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarStatus();
  }, []);

  const carregarStatus = async () => {
    const status = await NovidadesManager.verificarStatus();
    setChecagemAtiva(status.isActive);
    if (status.intervaloHoras > 0) {
      setIntervaloSelecionado(status.intervaloHoras);
    }
  };

  const handleToggleChecagem = async (value: boolean) => {
    setLoading(true);
    
    if (value) {
      await NovidadesManager.iniciarChecagemPeriodica(intervaloSelecionado);
    } else {
      await NovidadesManager.pararChecagemPeriodica();
    }
    
    await carregarStatus();
    setLoading(false);
  };

  const handleAtualizarIntervalo = async () => {
    setLoading(true);
    await NovidadesManager.atualizarIntervalo(intervaloSelecionado);
    await carregarStatus();
    setLoading(false);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Notificações Automáticas
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <Text>Ativar notificações automáticas</Text>
        <Switch
          value={checagemAtiva}
          onValueChange={handleToggleChecagem}
          disabled={loading}
        />
      </View>

      {checagemAtiva && (
        <>
          <Text style={{ marginBottom: 10 }}>Intervalo de checagem:</Text>
          
          <Picker
            selectedValue={intervaloSelecionado}
            onValueChange={setIntervaloSelecionado}
            enabled={!loading}
          >
            {NovidadesManager.getIntervalosDisponiveis().map(({ label, horas }) => (
              <Picker.Item key={horas} label={label} value={horas} />
            ))}
          </Picker>

          <Button
            title="Aplicar alterações"
            onPress={handleAtualizarIntervalo}
            disabled={loading}
          />
        </>
      )}

      <Text style={{ marginTop: 20, color: '#666', fontSize: 12 }}>
        {checagemAtiva 
          ? `Checando novidades a cada ${intervaloSelecionado} horas`
          : 'Notificações automáticas desativadas'
        }
      </Text>
    </View>
  );
};
*/

// ========================================
// 🆕 INICIALIZAÇÃO NO APP.TSX
// ========================================

/**
 * Adicionar no App.tsx durante a inicialização:
 */
/*
import { NovidadesManager } from './src/services/NovidadesManager';
import { inicializarNotificacoes } from './src/services/notificationUtils';

useEffect(() => {
  const inicializar = async () => {
    // Inicializa canais de notificação
    await inicializarNotificacoes(medicamentos);
    
    // Verifica se deve ativar checagem de novidades
    const status = await NovidadesManager.verificarStatus();
    
    if (!status.isActive) {
      // Primeira execução: ativa por padrão a cada 12 horas
      await NovidadesManager.iniciarChecagemPeriodica(12);
      console.log('✅ Checagem de novidades ativada automaticamente');
    } else {
      console.log(`✅ Checagem de novidades já ativa (${status.intervaloHoras}h)`);
    }
  };
  
  inicializar();
}, []);
*/
// src/services/novidadesChecker.ts

import PushNotification from 'react-native-push-notification';
import { fetchAvisos } from './avisosService';
import { fetchVideos } from './videosService';
import { fetchAudiosAtivos } from './audiosService';
import { fetchDiretas } from './diretasService';
import { fetchSaudeDiaria } from './saudeDiariaService'; // 🆕 Incluir Saúde Diária
import { getLidas, marcarComoLida } from './notificationUtils';

const TAG = 'HeadlessNovidadesCheck';

/**
 * 🔔 Exibe uma notificação local (usada no background).
 */
const showNotification = (
  id: number, 
  title: string, 
  message: string, 
  tipo: 'diretas' | 'avisos' | 'videos' | 'audios' | 'saudeDiaria'
) => {
  try {
    PushNotification.localNotification({
      channelId: 'novidades_channel',
      subText: 'Novidade',
      id: id,
      title: title,
      message: message,
      bigText: message,
      userInfo: { 
        id: id, 
        tipo: tipo
      },
      vibrate: true,
      playSound: true,
      soundName: 'default',
      color: '#0A7AB8',
      priority: 'high',
    });
    
    console.log(`[${TAG}] ✅ Notificação exibida: ${title}`);
  } catch (error) {
    console.error(`[${TAG}] ❌ Erro ao exibir notificação:`, error);
  }
};

/**
 * 🕵️ Função principal que será registrada como Headless Task.
 */
export const checkForNewPosts = async () => {
  console.log(`[${TAG}] 🎬 Headless Task Iniciada! Checando novidades...`);
  
  let totalNovas = 0;

  // -----------------------------------------
  // 1. CHECAR AVISOS
  try {
    const avisos = await fetchAvisos();
    const lidas = await getLidas('avisos');
    const novas = avisos.filter(a => !lidas.includes(a.id));

    if (novas.length > 0) {
      console.log(`[${TAG}] 📣 ${novas.length} Novo(s) Aviso(s) encontrado(s).`);
      
      const avisoRecente = novas.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      )[0];

      showNotification(
        avisoRecente.id,
        `📢 Novo Aviso: ${avisoRecente.titulo}`,
        avisoRecente.mensagem,
        'avisos'
      );

      await marcarComoLida('avisos', [...lidas, ...novas.map(a => a.id)]);
      totalNovas += novas.length;
    }
  } catch (error) {
    console.error(`[${TAG}] ❌ Erro ao checar Avisos:`, error);
  }

  // -----------------------------------------
  // 2. CHECAR VÍDEOS
  try {
    const videos = await fetchVideos();
    const lidas = await getLidas('videos');
    const novos = videos.filter(v => !lidas.includes(v.id));

    if (novos.length > 0) {
      console.log(`[${TAG}] 🎥 ${novos.length} Novo(s) Vídeo(s) encontrado(s).`);
      
      const videoRecente = novos.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      )[0];

      showNotification(
        videoRecente.id,
        `▶️ Novo Vídeo: ${videoRecente.titulo}`,
        videoRecente.descricao,
        'videos'
      );
      
      await marcarComoLida('videos', [...lidas, ...novos.map(v => v.id)]);
      totalNovas += novos.length;
    }
  } catch (error) {
    console.error(`[${TAG}] ❌ Erro ao checar Vídeos:`, error);
  }
  
  // -----------------------------------------
  // 3. CHECAR ÁUDIOS
  try {
    const audios = await fetchAudiosAtivos();
    const lidas = await getLidas('audios');
    const novos = audios.filter(a => !lidas.includes(a.id));

    if (novos.length > 0) {
      console.log(`[${TAG}] 🎧 ${novos.length} Novo(s) Áudio(s) encontrado(s).`);
      
      const audioRecente = novos.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      )[0];

      showNotification(
        audioRecente.id,
        `🎙️ Novo Áudio: ${audioRecente.titulo}`,
        audioRecente.descricao,
        'audios'
      );
      
      await marcarComoLida('audios', [...lidas, ...novos.map(a => a.id)]);
      totalNovas += novos.length;
    }
  } catch (error) {
    console.error(`[${TAG}] ❌ Erro ao checar Áudios:`, error);
  }
  
  // -----------------------------------------
  // 4. CHECAR DIRETAS
  try {
    const diretas = await fetchDiretas();
    const lidas = await getLidas('diretas');
    const novas = diretas.filter(d => !lidas.includes(d.id));

    if (novas.length > 0) {
      console.log(`[${TAG}] 📧 ${novas.length} Nova(s) Mensagem(ns) Direta(s) encontrada(s).`);
      
      const diretaRecente = novas.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      )[0];
      
      showNotification(
        diretaRecente.id,
        `✉️ Mensagem de ${diretaRecente.remetente}: ${diretaRecente.titulo}`,
        diretaRecente.mensagem,
        'diretas'
      );
      
      await marcarComoLida('diretas', [...lidas, ...novas.map(d => d.id)]);
      totalNovas += novas.length;
    }
  } catch (error) {
    console.error(`[${TAG}] ❌ Erro ao checar Diretas:`, error);
  }
  
  // -----------------------------------------
  // 5. 🆕 CHECAR SAÚDE DIÁRIA
  try {
    const saudeDiaria = await fetchSaudeDiaria();
    const lidas = await getLidas('saudeDiaria');
    const novas = saudeDiaria.filter(s => !lidas.includes(s.id));

    if (novas.length > 0) {
      console.log(`[${TAG}] 💚 ${novas.length} Nova(s) Dica(s) de Saúde encontrada(s).`);
      
      const saudeRecente = novas.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      )[0];
      
      showNotification(
        saudeRecente.id,
        `💚 Saúde Diária: ${saudeRecente.titulo}`,
        saudeRecente.mensagem,
        'saudeDiaria'
      );
      
      await marcarComoLida('saudeDiaria', [...lidas, ...novas.map(s => s.id)]);
      totalNovas += novas.length;
    }
  } catch (error) {
    console.error(`[${TAG}] ❌ Erro ao checar Saúde Diária:`, error);
  }
  
  console.log(`[${TAG}] ✅ Headless Task Concluída. Total de novidades: ${totalNovas}`);
};
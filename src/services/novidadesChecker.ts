// src/services/novidadesChecker.ts
import notifee, { AndroidImportance } from '@notifee/react-native';
import { fetchAvisos } from './avisosService';
import { fetchVideos } from './videosService';
import { fetchAudiosAtivos } from './audiosService';
import { fetchDiretas } from './diretasService';
import { fetchSaudeDiaria } from './saudeDiariaService'; 
import { getLidas, marcarComoLida } from './notificationUtils';

const TAG = 'HeadlessNovidadesCheck';

/**
 * 🔔 Exibe uma notificação local usando Notifee (Substituindo PushNotification)
 */
const showNotification = async (
  id: number, 
  title: string, 
  message: string, 
  tipo: 'diretas' | 'avisos' | 'videos' | 'audios' | 'saudeDiaria'
) => {
  try {
    // Criar o canal de notificação (obrigatório para Android 8+)
    const channelId = await notifee.createChannel({
      id: 'novidades_channel',
      name: 'Novidades',
      importance: AndroidImportance.HIGH,
    });

    // Exibir a notificação
    await notifee.displayNotification({
      id: id.toString(),
      title: title,
      body: message,
      android: {
        channelId,
        smallIcon: 'ic_launcher', // Ícone padrão do seu app
        color: '#0A7AB8',
        pressAction: {
          id: 'default',
        },
        importance: AndroidImportance.HIGH,
      },
      data: { 
        id: id.toString(), 
        tipo: tipo 
      },
    });
    
    console.log(`[${TAG}] ✅ Notificação exibida: ${title}`);
  } catch (error) {
    console.error(`[${TAG}] ❌ Erro ao exibir notificação:`, error);
  }
};

/**
 * 🕵️ Função principal que checa todas as categorias
 */
export const checkForNewPosts = async () => {
  console.log(`[${TAG}] 🎬 Headless Task Iniciada! Checando novidades...`);
  
  let totalNovas = 0;

  // 1. CHECAR AVISOS
  try {
    const avisos = await fetchAvisos();
    const lidas = await getLidas('avisos');
    const novas = avisos.filter(a => !lidas.includes(a.id));

    if (novas.length > 0) {
      const avisoRecente = novas.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      )[0];

      await showNotification(
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

  // 2. CHECAR VÍDEOS
  try {
    const videos = await fetchVideos();
    const lidas = await getLidas('videos');
    const novos = videos.filter(v => !lidas.includes(v.id));

    if (novos.length > 0) {
      const videoRecente = novos.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      )[0];

      await showNotification(
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
  
  // 3. CHECAR ÁUDIOS
  try {
    const audios = await fetchAudiosAtivos();
    const lidas = await getLidas('audios');
    const novos = audios.filter(a => !lidas.includes(a.id));

    if (novos.length > 0) {
      const audioRecente = novos.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      )[0];

      await showNotification(
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
  
  // 4. CHECAR DIRETAS
  try {
    const diretas = await fetchDiretas();
    const lidas = await getLidas('diretas');
    const novas = diretas.filter(d => !lidas.includes(d.id));

    if (novas.length > 0) {
      const diretaRecente = novas.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      )[0];
      
      await showNotification(
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
  
  // 5. CHECAR SAÚDE DIÁRIA
  try {
    const saudeDiaria = await fetchSaudeDiaria();
    const lidas = await getLidas('saudeDiaria');
    const novas = saudeDiaria.filter(s => !lidas.includes(s.id));

    if (novas.length > 0) {
      const saudeRecente = novas.sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      )[0];
      
      await showNotification(
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
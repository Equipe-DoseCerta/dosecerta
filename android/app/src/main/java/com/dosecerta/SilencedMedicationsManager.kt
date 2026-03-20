package com.dosecerta

import android.content.Context
import android.content.SharedPreferences
import android.util.Log

/**
 * ðŸ”‡ GERENCIADOR DE MEDICAMENTOS SILENCIADOS
 * 
 * Sincroniza o estado de silenciamento entre React Native (AsyncStorage)
 * e o sistema nativo de alarmes (SharedPreferences).
 * 
 * âš ï¸ CRITICAL: Este manager DEVE ser thread-safe pois Ã© acessado
 * tanto do React Native quanto do AlarmReceiver (threads diferentes)
 */
object SilencedMedicationsManager {
    
    private const val TAG = "SilencedManager"
    private const val PREFS_NAME = "silenced_medications"
    private const val KEY_SILENCED_IDS = "silenced_ids"
    
    // ðŸ”¥ CACHE EM MEMÃ“RIA para acesso ultra-rÃ¡pido
    @Volatile
    private var cachedSilencedIds: Set<String>? = null
    
    /**
     * âœ… Verifica se um medicamento estÃ¡ silenciado
     * ðŸ”¥ USA CACHE para performance mÃ¡xima
     */
    @Synchronized
    fun isMedicationSilenced(context: Context, medicamentoId: Int): Boolean {
        return try {
            // 1ï¸âƒ£ Tenta usar o cache primeiro
            var silencedIds = cachedSilencedIds
            
            // 2ï¸âƒ£ Se cache estÃ¡ vazio, carrega do SharedPreferences
            if (silencedIds == null) {
                val prefs = getPrefs(context)
                silencedIds = prefs.getStringSet(KEY_SILENCED_IDS, emptySet()) ?: emptySet()
                cachedSilencedIds = silencedIds
                Log.d(TAG, "ðŸ“¥ Cache carregado: ${silencedIds.size} medicamentos silenciados")
            }
            
            val isSilenced = silencedIds.contains(medicamentoId.toString())
            
            Log.d(TAG, "ðŸ” Verificando ID $medicamentoId: ${if (isSilenced) "ðŸ”‡ SILENCIADO" else "âœ… ATIVO"}")
            Log.d(TAG, "ðŸ“‹ IDs silenciados: $silencedIds")
            
            isSilenced
        } catch (e: Exception) {
            Log.e(TAG, "âŒ Erro ao verificar silenciamento: ${e.message}", e)
            false
        }
    }
    
    /**
     * ðŸ”‡ Adiciona um medicamento Ã  lista de silenciados
     */
    @Synchronized
    fun silenceMedication(context: Context, medicamentoId: Int) {
        try {
            val prefs = getPrefs(context)
            val currentSet = prefs.getStringSet(KEY_SILENCED_IDS, emptySet())?.toMutableSet() ?: mutableSetOf()
            
            currentSet.add(medicamentoId.toString())
            
            // 1ï¸âƒ£ Salva no SharedPreferences
            prefs.edit()
                .putStringSet(KEY_SILENCED_IDS, currentSet)
                .commit() // ðŸ”¥ USAR COMMIT (SÃNCRONO) ao invÃ©s de apply
            
            // 2ï¸âƒ£ Atualiza cache
            cachedSilencedIds = currentSet.toSet()
            
            Log.d(TAG, "âœ… Medicamento $medicamentoId SILENCIADO no nativo")
            Log.d(TAG, "ðŸ“‹ Lista atualizada: ${cachedSilencedIds}")
        } catch (e: Exception) {
            Log.e(TAG, "âŒ Erro ao silenciar medicamento: ${e.message}", e)
        }
    }
    
    /**
     * ðŸ”” Remove um medicamento da lista de silenciados
     */
    @Synchronized
    fun unsilenceMedication(context: Context, medicamentoId: Int) {
        try {
            val prefs = getPrefs(context)
            val currentSet = prefs.getStringSet(KEY_SILENCED_IDS, emptySet())?.toMutableSet() ?: mutableSetOf()
            
            currentSet.remove(medicamentoId.toString())
            
            // 1ï¸âƒ£ Salva no SharedPreferences
            prefs.edit()
                .putStringSet(KEY_SILENCED_IDS, currentSet)
                .commit() // ðŸ”¥ USAR COMMIT (SÃNCRONO)
            
            // 2ï¸âƒ£ Atualiza cache
            cachedSilencedIds = currentSet.toSet()
            
            Log.d(TAG, "âœ… Medicamento $medicamentoId REATIVADO no nativo")
            Log.d(TAG, "ðŸ“‹ Lista atualizada: ${cachedSilencedIds}")
        } catch (e: Exception) {
            Log.e(TAG, "âŒ Erro ao reativar medicamento: ${e.message}", e)
        }
    }
    
    /**
     * ðŸ“‹ Lista todos os IDs silenciados
     */
    @Synchronized
    fun getAllSilencedIds(context: Context): Set<String> {
        return try {
            if (cachedSilencedIds != null) {
                cachedSilencedIds!!
            } else {
                val prefs = getPrefs(context)
                val ids = prefs.getStringSet(KEY_SILENCED_IDS, emptySet()) ?: emptySet()
                cachedSilencedIds = ids
                ids
            }
        } catch (e: Exception) {
            Log.e(TAG, "âŒ Erro ao listar silenciados: ${e.message}", e)
            emptySet()
        }
    }
    
    /**
     * ðŸ”„ Sincroniza a lista de silenciados do AsyncStorage (React Native)
     * Deve ser chamado quando o app inicializa
     */
    @Synchronized
    fun syncFromAsyncStorage(context: Context, silencedIds: List<Int>) {
        try {
            val prefs = getPrefs(context)
            val stringSet = silencedIds.map { it.toString() }.toSet()
            
            // 1ï¸âƒ£ Salva no SharedPreferences
            prefs.edit()
                .putStringSet(KEY_SILENCED_IDS, stringSet)
                .commit() // ðŸ”¥ USAR COMMIT (SÃNCRONO)
            
            // 2ï¸âƒ£ Atualiza cache
            cachedSilencedIds = stringSet
            
            Log.d(TAG, "âœ… SincronizaÃ§Ã£o concluÃ­da: ${silencedIds.size} medicamentos silenciados")
            Log.d(TAG, "ðŸ“‹ IDs: $silencedIds")
        } catch (e: Exception) {
            Log.e(TAG, "âŒ Erro na sincronizaÃ§Ã£o: ${e.message}", e)
        }
    }
    
    /**
     * ðŸ§¹ Limpa todos os silenciamentos (Ãºtil para debug)
     */
    @Synchronized
    fun clearAll(context: Context) {
        try {
            val prefs = getPrefs(context)
            prefs.edit()
                .remove(KEY_SILENCED_IDS)
                .commit() // ðŸ”¥ USAR COMMIT (SÃNCRONO)
            
            cachedSilencedIds = emptySet()
            
            Log.d(TAG, "ðŸ§¹ Todos os silenciamentos foram limpos")
        } catch (e: Exception) {
            Log.e(TAG, "âŒ Erro ao limpar: ${e.message}", e)
        }
    }
    
    /**
     * ðŸ”„ ForÃ§a recarga do cache (Ãºtil apÃ³s sincronizaÃ§Ã£o)
     */
    @Synchronized
    fun reloadCache(context: Context) {
        try {
            val prefs = getPrefs(context)
            cachedSilencedIds = prefs.getStringSet(KEY_SILENCED_IDS, emptySet()) ?: emptySet()
            Log.d(TAG, "ðŸ”„ Cache recarregado: ${cachedSilencedIds?.size ?: 0} IDs")
        } catch (e: Exception) {
            Log.e(TAG, "âŒ Erro ao recarregar cache: ${e.message}", e)
        }
    }
    
    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
}
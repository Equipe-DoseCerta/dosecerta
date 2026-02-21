
import { DeviceEventEmitter } from 'react-native';
import SQLite, { SQLiteDatabase, Transaction, ResultSet, ResultSetRowList, SQLError } from 'react-native-sqlite-storage';

export interface Medicamento {
  id?: number;
  nomePaciente: string;
  nome: string;
  dosagem: string;
  tipo: string;
  unidade: string;
  duracaoTratamento: number;
  horario_inicial: string;
  intervalo_horas: number;
  dataInicio: string;
  notas: string;
  ativo: boolean;
  dosesTotais: number;
}

export interface DoseTomada {
  id?: number;
  medicamento_id: number;
  horario: string;
  data: string;
  timestamp: string;
}

const DATABASE_VERSION = 6;
const DB_NAME = 'medicamentos.db';

let db: SQLiteDatabase | null = null;

const onDatabaseError = (error: SQLError) => {
  console.error('Erro no Banco de Dados:', error);
};

export const initDB = (): Promise<SQLiteDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    SQLite.openDatabase(
      { name: DB_NAME, location: 'default' },
      (database: SQLiteDatabase) => {
        db = database;
        database.transaction(
          (tx: Transaction) => {
            // Verificar a versão do banco de dados
            tx.executeSql(
              'PRAGMA user_version',
              [],
              (_txVersion: any, { rows }: { rows: ResultSetRowList }) => {
                const currentVersion = rows.item(0)?.user_version || 0;
                console.log('Versão atual do banco de dados:', currentVersion);

                if (currentVersion === 0) {
                  tx.executeSql(
                    `CREATE TABLE IF NOT EXISTS medicamentos (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      nomePaciente TEXT NOT NULL,
                      nome TEXT NOT NULL,
                      dosagem TEXT NOT NULL,
                      tipo TEXT NOT NULL,
                      unidade TEXT NOT NULL,
                      duracaoTratamento INTEGER NOT NULL,
                      horario_inicial TEXT NOT NULL,
                      intervalo_horas INTEGER NOT NULL,
                      dataInicio TEXT NOT NULL,
                      notas TEXT,
                      ativo BOOLEAN NOT NULL DEFAULT 1
                    );`
                  );
                  tx.executeSql(
                    'PRAGMA user_version = 1'
                  );
                }

                if (currentVersion < 6) {
                    tx.executeSql(
                        `PRAGMA table_info(medicamentos)`,
                        [],
                        (_txMigrate: any, { rows: tableRows }: { rows: ResultSetRowList }) => {
                            const columns = tableRows.raw();
                            
                            // Adiciona as colunas 'unidade' e 'dosesTotais' se não existirem
                            const hasUnidade = columns.some((col: any) => col.name === 'unidade');
                            const hasDosesTotais = columns.some((col: any) => col.name === 'dosesTotais');
                            const hasAtivo = columns.some((col: any) => col.name === 'ativo');

                            if (!hasUnidade) {
                                tx.executeSql('ALTER TABLE medicamentos ADD COLUMN unidade TEXT', []);
                            }
                            if (!hasDosesTotais) {
                                tx.executeSql('ALTER TABLE medicamentos ADD COLUMN dosesTotais INTEGER', []);
                            }
                            if (!hasAtivo) {
                                tx.executeSql('ALTER TABLE medicamentos ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT 1', []);
                            }

                            tx.executeSql(`
                                CREATE TABLE IF NOT EXISTS doses_tomadas (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    medicamento_id INTEGER NOT NULL,
                                    horario TEXT NOT NULL,
                                    data TEXT NOT NULL,
                                    timestamp TEXT NOT NULL,
                                    FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id) ON DELETE CASCADE
                                );
                            `);
                            
                            tx.executeSql(`PRAGMA user_version = ${DATABASE_VERSION}`);
                        },
                        (tx_inner: any, error: any) => {
                            console.error('Erro na migração:', error);
                            return false;
                        }
                    );
                }
              },
              (_txVersionError: any, error: any) => {
                console.error('Erro ao verificar a versão do banco de dados:', error);
                return false;
              }
            );
          },
          onDatabaseError,
          () => resolve(db!)
        );
      },
      (error: SQLError) => reject(error)
    );
  });
};

/**
 * ⚠️ NOVO: Reinicializa a conexão com o banco de dados
 * IMPORTANTE: Chamar após restaurar um backup
 */
export const reinicializarBancoDados = async (): Promise<void> => {
  try {
    console.log('🔄 Fechando conexão com banco de dados...');
    
    if (db) {
      await db.close();
      db = null;
      console.log('✅ Banco de dados fechado');
    }

    await new Promise<void>(resolve => setTimeout(() => resolve(), 500));

    console.log('🔄 Reabrindo banco de dados...');
    await initDB();
    console.log('✅ Banco de dados reaberto');

    DeviceEventEmitter.emit('banco-reinicializado');
  } catch (err) {
    console.error('Erro ao reinicializar banco de dados:', err);
    throw err;
  }
};

/**
 * ⚠️ NOVO: Evento para quando o banco é reinicializado (após restauração)
 */
export const listenBancoReinicializado = (callback: () => void) => {
  return DeviceEventEmitter.addListener('banco-reinicializado', callback);
};

export const emitMedicamentoExcluido = (id: number) => {
  DeviceEventEmitter.emit('medicamento-excluido', id);
};

export const listenMedicamentoExcluido = (callback: (id: number) => void) => {
  return DeviceEventEmitter.addListener('medicamento-excluido', callback);
};

export const insertMedicamento = async (med: Omit<Medicamento, 'id'>) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: Transaction) => {
        tx.executeSql(
          `INSERT INTO medicamentos (
            nomePaciente, nome, dosagem, tipo, unidade, dosesTotais, duracaoTratamento,
            horario_inicial, intervalo_horas, dataInicio, notas, ativo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            med.nomePaciente,
            med.nome,
            med.dosagem,
            med.tipo,
            med.unidade,
            med.dosesTotais,
            med.duracaoTratamento,
            med.horario_inicial,
            med.intervalo_horas,
            med.dataInicio,
            med.notas || '',
            med.ativo
          ],
          (txResult: any, result: ResultSet) => {
            const medicamentoId = result.insertId;
            DeviceEventEmitter.emit('medicamento-adicionado');
            resolve(medicamentoId);
          },
          (txError: any, error: SQLError) => {
            reject(error);
            return false;
          }
        );
      },
      onDatabaseError
    );
  });
};

export const fetchMedicamentos = async (): Promise<Medicamento[]> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: Transaction) => {
        tx.executeSql(
          `SELECT * FROM medicamentos`,
          [],
          (txResult: any, { rows }: { rows: ResultSetRowList }) => {
            resolve(rows.raw());
          },
          (txError: any, error: SQLError) => {
            reject(error);
            return false;
          }
        );
      },
      onDatabaseError
    );
  });
};

export const fetchMedicamentoPorId = async (id: number): Promise<Medicamento | null> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: Transaction) => {
        tx.executeSql(
          `SELECT * FROM medicamentos WHERE id = ?`,
          [id],
          (txResult: any, { rows }: { rows: ResultSetRowList }) => {
            resolve(rows.length > 0 ? rows.item(0) : null);
          },
          (txError: any, error: SQLError) => {
            reject(error);
            return false;
          }
        );
      },
      onDatabaseError
    );
  });
};

export const updateMedicamento = async (med: Medicamento & { id: number }) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: Transaction) => {
        tx.executeSql(
          `UPDATE medicamentos SET
            nomePaciente = ?, nome = ?, dosagem = ?, tipo = ?, unidade = ?, dosesTotais = ?,
            duracaoTratamento = ?, horario_inicial = ?, intervalo_horas = ?,
            dataInicio = ?, notas = ?, ativo = ?
          WHERE id = ?`,
          [
            med.nomePaciente,
            med.nome,
            med.dosagem,
            med.tipo,
            med.unidade,
            med.dosesTotais,
            med.duracaoTratamento,
            med.horario_inicial,
            med.intervalo_horas,
            med.dataInicio,
            med.notas || '',
            med.ativo,
            med.id
          ],
          (txResult: any, result: ResultSet) => {
            console.log('Medicamento atualizado, agendar novas notificações.');
            resolve(result.rowsAffected > 0);
          },
          (txError: any, error: SQLError) => {
            reject(error);
            return false;
          }
        );
      },
      onDatabaseError
    );
  });
};

export const deleteMedicamento = async (id: number) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: Transaction) => {
        tx.executeSql(
          `DELETE FROM medicamentos WHERE id = ?`,
          [id],
          async (txResult: any, result: ResultSet) => {
            console.log('Medicamento deletado, cancelar notificações.');
            emitMedicamentoExcluido(id);
            resolve(result.rowsAffected > 0);
          },
          (txError: any, error: SQLError) => {
            reject(error);
            return false;
          }
        );
      },
      onDatabaseError
    );
  });
};

export const registrarDoseTomada = async (medicamentoId: number, horario: string, data: string) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: Transaction) => {
        const timestamp = new Date().toISOString();
        tx.executeSql(
          `INSERT INTO doses_tomadas (medicamento_id, horario, data, timestamp) VALUES (?, ?, ?, ?)`,
          [medicamentoId, horario, data, timestamp],
          (txResult: any, result: ResultSet) => {
            DeviceEventEmitter.emit('dose-tomada', { medicamentoId, horario, data });
            resolve(result.insertId);
          },
          (txError: any, error: SQLError) => {
            reject(error);
            return false;
          }
        );
      },
      onDatabaseError
    );
  });
};

export const fetchDosesTomadas = async (medicamentoId: number): Promise<DoseTomada[]> => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: Transaction) => {
        tx.executeSql(
          `SELECT * FROM doses_tomadas WHERE medicamento_id = ?`,
          [medicamentoId],
          (txResult: any, { rows }: { rows: ResultSetRowList }) => {
            resolve(rows.raw());
          },
          (txError: any, error: SQLError) => {
            reject(error);
            return false;
          }
        );
      },
      onDatabaseError
    );
  });
};
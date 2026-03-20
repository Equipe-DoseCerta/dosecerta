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
  foto_path?: string | null;
  tipo_cadastro?: 'alarme' | 'registro' | null;
}

export interface DoseTomada {
  id?: number;
  medicamento_id: number;
  dose_id: string;
  horario: string;
  data: string;
  timestamp: string;
}

const DATABASE_VERSION = 8;
const DB_NAME = 'medicamentos.db';

let db: SQLiteDatabase | null = null;

const onDatabaseError = (error: SQLError) => {
  console.error('Erro no Banco de Dados:', error);
};

/**
 * Fecha a conexão com o banco de dados.
 * Essencial para permitir a substituição do arquivo físico durante a restauração.
 */
export const fecharBancoDados = async (): Promise<void> => {
  if (db) {
    try {
      await db.close();
      db = null;
      console.log('✅ Conexão com banco de dados encerrada com sucesso.');
    } catch (err) {
      console.error('Erro ao fechar banco de dados:', err);
      // Mesmo com erro, limpamos a referência local
      db = null;
    }
  }
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
                  tx.executeSql('PRAGMA user_version = 1');
                }

                if (currentVersion < 8) {
                  tx.executeSql(
                    `PRAGMA table_info(medicamentos)`,
                    [],
                    (_txMigrate: any, { rows: tableRows }: { rows: ResultSetRowList }) => {
                      const columns = tableRows.raw();
                      
                      const hasUnidade = columns.some((col: any) => col.name === 'unidade');
                      const hasDosesTotais = columns.some((col: any) => col.name === 'dosesTotais');
                      const hasAtivo = columns.some((col: any) => col.name === 'ativo');
                      const hasFotoPath = columns.some((col: any) => col.name === 'foto_path');
                      const hasTipoCadastro = columns.some((col: any) => col.name === 'tipo_cadastro');

                      if (!hasUnidade) {
                        tx.executeSql('ALTER TABLE medicamentos ADD COLUMN unidade TEXT', []);
                      }
                      if (!hasDosesTotais) {
                        tx.executeSql('ALTER TABLE medicamentos ADD COLUMN dosesTotais INTEGER', []);
                      }
                      if (!hasAtivo) {
                        tx.executeSql('ALTER TABLE medicamentos ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT 1', []);
                      }
                      if (!hasFotoPath) {
                        tx.executeSql('ALTER TABLE medicamentos ADD COLUMN foto_path TEXT', []);
                      }
                      if (!hasTipoCadastro) {
                        tx.executeSql('ALTER TABLE medicamentos ADD COLUMN tipo_cadastro TEXT DEFAULT "alarme"', []);
                      }

                      tx.executeSql(
                        `SELECT name FROM sqlite_master WHERE type='table' AND name='doses_tomadas'`,
                        [],
                        (_tx: any, { rows: tableCheck }: { rows: ResultSetRowList }) => {
                          if (tableCheck.length === 0) {
                            tx.executeSql(`
                              CREATE TABLE IF NOT EXISTS doses_tomadas (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                medicamento_id INTEGER NOT NULL,
                                dose_id TEXT NOT NULL UNIQUE,
                                horario TEXT NOT NULL,
                                data TEXT NOT NULL,
                                timestamp TEXT NOT NULL,
                                FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id) ON DELETE CASCADE
                              );
                            `);
                          } else {
                            tx.executeSql(
                              `PRAGMA table_info(doses_tomadas)`,
                              [],
                              (_tx2: any, { rows: doseColumns }: { rows: ResultSetRowList }) => {
                                const hasDoseId = doseColumns.raw().some((col: any) => col.name === 'dose_id');
                                if (!hasDoseId) {
                                  tx.executeSql('ALTER TABLE doses_tomadas ADD COLUMN dose_id TEXT', []);
                                  tx.executeSql(
                                    `UPDATE doses_tomadas SET dose_id = medicamento_id || '-' || id WHERE dose_id IS NULL`,
                                    []
                                  );
                                }
                              }
                            );
                          }
                        }
                      );
                      
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

export const reinicializarBancoDados = async (): Promise<void> => {
  try {
    console.log('🔄 Reinicializando banco de dados...');
    await fecharBancoDados();
    await new Promise<void>(resolve => setTimeout(() => resolve(), 800));
    await initDB();
    console.log('✅ Banco de dados reinicializado com sucesso');
    DeviceEventEmitter.emit('banco-reinicializado');
  } catch (err) {
    console.error('Erro ao reinicializar banco de dados:', err);
    throw err;
  }
};

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
            horario_inicial, intervalo_horas, dataInicio, notas, ativo, foto_path, tipo_cadastro
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            med.foto_path || null,
            med.tipo_cadastro || 'alarme',
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

export const updateMedicamento = async (id: number, med: Partial<Medicamento>) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: Transaction) => {
        const fields = Object.keys(med).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(med), id];
        tx.executeSql(
          `UPDATE medicamentos SET ${fields} WHERE id = ?`,
          values,
          () => {
            DeviceEventEmitter.emit('medicamento-atualizado');
            resolve(true);
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
          () => {
            emitMedicamentoExcluido(id);
            resolve(true);
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

export const insertDoseTomada = async (dose: Omit<DoseTomada, 'id'>) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: Transaction) => {
        tx.executeSql(
          `INSERT INTO doses_tomadas (medicamento_id, dose_id, horario, data, timestamp) VALUES (?, ?, ?, ?, ?)`,
          [dose.medicamento_id, dose.dose_id, dose.horario, dose.data, dose.timestamp],
          (txResult: any, result: ResultSet) => {
            DeviceEventEmitter.emit('dose-adicionada');
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

export const deleteDoseTomada = async (medicamentoId: number, doseId: string) => {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    database.transaction(
      (tx: Transaction) => {
        tx.executeSql(
          `DELETE FROM doses_tomadas WHERE medicamento_id = ? AND dose_id = ?`,
          [medicamentoId, doseId],
          () => {
            DeviceEventEmitter.emit('dose-removida');
            resolve(true);
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

export type SqlOperation = {
  sql: string;
  values: unknown[];
};

const buildInsertOperation = (table: string, item: Record<string, unknown>): SqlOperation => {
  const columns = Object.keys(item);
  const values = Object.values(item);
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

  return {
    sql: `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')}) VALUES (${placeholders})`,
    values,
  };
};

const buildUpdateOperation = (
  table: string,
  item: Record<string, unknown>,
  idKey = 'id',
): SqlOperation => {
  if (item[idKey] === undefined) {
    throw new Error(`Missing ${idKey} field for update operation on ${table}`);
  }

  const columns = Object.keys(item).filter((column) => column !== idKey);
  const values = columns.map((column) => item[column]);
  const setClause = columns
    .map((column, index) => `"${column}" = $${index + 1}`)
    .join(', ');

  return {
    sql: `UPDATE "${table}" SET ${setClause} WHERE "${idKey}" = $${columns.length + 1}`,
    values: [...values, item[idKey]],
  };
};

const buildSoftDeleteOperation = (
  table: string,
  idValue: unknown,
  idKey = 'id',
): SqlOperation => ({
  sql: `UPDATE "${table}" SET "deleted_at" = $1 WHERE "${idKey}" = $2`,
  values: [new Date().toISOString(), idValue],
});

const buildHardDeleteOperation = (
  table: string,
  idValue: unknown,
  idKey = 'id',
): SqlOperation => ({
  sql: `DELETE FROM "${table}" WHERE "${idKey}" = $1`,
  values: [idValue],
});

export const createTask = (task: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('Task', task);

export const updateTask = (task: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('Task', task);

export const deleteTask = (task: Record<string, unknown>): SqlOperation =>
  buildSoftDeleteOperation('Task', task.id);

export const hardDeleteTask = (task: Record<string, unknown>): SqlOperation =>
  buildHardDeleteOperation('Task', task.id);

export const createCategory = (category: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('Category', category);

export const updateCategory = (category: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('Category', category);

export const deleteCategory = (category: Record<string, unknown>): SqlOperation =>
  buildSoftDeleteOperation('Category', category.id);

export const hardDeleteCategory = (category: Record<string, unknown>): SqlOperation =>
  buildHardDeleteOperation('Category', category.id);

export const createTaskCategory = (taskCategory: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('TaskCategory', taskCategory);

export const updateTaskCategory = (taskCategory: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('TaskCategory', taskCategory);

export const deleteTaskCategory = (taskCategory: Record<string, unknown>): SqlOperation =>
  buildSoftDeleteOperation('TaskCategory', taskCategory.task_id, 'task_id');

export const hardDeleteTaskCategory = (taskCategory: Record<string, unknown>): SqlOperation =>
  buildHardDeleteOperation('TaskCategory', taskCategory.task_id, 'task_id');

export const createPomodoroConfig = (config: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('PomodoroConfig', config);

export const updatePomodoroConfig = (config: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('PomodoroConfig', config);

export const deletePomodoroConfig = (config: Record<string, unknown>): SqlOperation =>
  buildSoftDeleteOperation('PomodoroConfig', config.id);

export const hardDeletePomodoroConfig = (config: Record<string, unknown>): SqlOperation =>
  buildHardDeleteOperation('PomodoroConfig', config.id);

export const createPomodoroSession = (session: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('PomodoroSession', session);

export const updatePomodoroSession = (session: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('PomodoroSession', session);

export const deletePomodoroSession = (session: Record<string, unknown>): SqlOperation =>
  buildSoftDeleteOperation('PomodoroSession', session.id);

export const hardDeletePomodoroSession = (session: Record<string, unknown>): SqlOperation =>
  buildHardDeleteOperation('PomodoroSession', session.id);

export const createAppState = (session: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('AppState', session);

export const updateAppState = (session: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('AppState', session);

export const deleteAppState = (session: Record<string, unknown>): SqlOperation =>
  buildSoftDeleteOperation('AppState', session.id);

export const hardDeleteAppState = (session: Record<string, unknown>): SqlOperation =>
  buildHardDeleteOperation('AppState', session.id);

export const createUser = (user: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('User', user);

export const updateUser = (user: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('User', user);

export const deleteUser = (user: Record<string, unknown>): SqlOperation =>
  buildSoftDeleteOperation('User', user.id);

export const hardDeleteUser = (user: Record<string, unknown>): SqlOperation =>
  buildHardDeleteOperation('User', user.id);

export const createTimerState = (state: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('TimerState', state);

export const updateTimerState = (state: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('TimerState', state);

export type OperationType = 'INSERT' | 'UPDATE' |'SOFT_DELETE' | 'HARD_DELETE';

export const getOperation = (
  table: string,
  operation: OperationType,
): (arg: Record<string, unknown>) => SqlOperation => {
  switch (table) {
    case 'Task':
      switch (operation) {
        case 'INSERT': return createTask;
        case 'UPDATE': return updateTask;
        case 'SOFT_DELETE': return deleteTask;
        case 'HARD_DELETE': return hardDeleteTask;
      }
      break;
    case 'Category':
      switch (operation) {
        case 'INSERT': return createCategory;
        case 'UPDATE': return updateCategory;
        case 'SOFT_DELETE': return deleteCategory;
        case 'HARD_DELETE': return hardDeleteCategory;
      }
      break;
    case 'TaskCategory':
      switch (operation) {
        case 'INSERT': return createTaskCategory;
        case 'UPDATE': return updateTaskCategory;
        case 'SOFT_DELETE': return deleteTaskCategory;
        case 'HARD_DELETE': return hardDeleteTaskCategory;
      }
      break;
    case 'PomodoroConfig':
      switch (operation) {
        case 'INSERT': return createPomodoroConfig;
        case 'UPDATE': return updatePomodoroConfig;
        case 'SOFT_DELETE': return deletePomodoroConfig;
        case 'HARD_DELETE': return hardDeletePomodoroConfig;
      }
      break;
    case 'PomodoroSession':
      switch (operation) {
        case 'INSERT': return createPomodoroSession;
        case 'UPDATE': return updatePomodoroSession;
        
        case 'SOFT_DELETE':
        case 'HARD_DELETE': throw new Error(`Unsupported operation ${operation} for table PomodoroSession`);
      }
      break;
    case 'AppState':
      switch (operation) {
        case 'INSERT': return createAppState;
        case 'UPDATE': return updateAppState;
        case 'SOFT_DELETE': return deleteAppState;
        case 'HARD_DELETE': return hardDeleteAppState;
      }
      break;
    case 'TimerState':
      switch (operation) {
        case 'INSERT': return createTimerState;
        case 'UPDATE': return updateTimerState;

        case 'SOFT_DELETE':
        case 'HARD_DELETE': throw new Error(`Unsupported operation ${operation} for table TimerState`);
      }
      break;
  }
  throw new Error(`Unsupported operation ${operation} for table ${table}`);
};
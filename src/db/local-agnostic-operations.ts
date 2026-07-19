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

const buildDeleteOperation = (
  table: string,
  idValue: unknown,
  idKey = 'id',
): SqlOperation => ({
  sql: `UPDATE "${table}" SET "deleted_at" = "${new Date().toISOString()}" WHERE "${idKey}" = $1`,
  values: [idValue],
});

export const createTask = (task: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('Task', task);

export const updateTask = (task: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('Task', task);

export const deleteTask = (task: Record<string, unknown>): SqlOperation =>
  buildDeleteOperation('Task', task.id);

export const createCategory = (category: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('Category', category);

export const updateCategory = (category: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('Category', category);

export const deleteCategory = (category: Record<string, unknown>): SqlOperation =>
  buildDeleteOperation('Category', category.id);

export const createTaskCategory = (taskCategory: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('TaskCategory', taskCategory);

export const updateTaskCategory = (taskCategory: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('TaskCategory', taskCategory);

export const deleteTaskCategory = (taskCategory: Record<string, unknown>): SqlOperation =>
  buildDeleteOperation('TaskCategory', taskCategory.id);

export const createPomodoroConfig = (config: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('PomodoroConfig', config);

export const updatePomodoroConfig = (config: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('PomodoroConfig', config);

export const deletePomodoroConfig = (config: Record<string, unknown>): SqlOperation =>
  buildDeleteOperation('PomodoroConfig', config.id);

export const createPomodoroSession = (session: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('PomodoroSession', session);

export const updatePomodoroSession = (session: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('PomodoroSession', session);

export const deletePomodoroSession = (session: Record<string, unknown>): SqlOperation =>
  buildDeleteOperation('PomodoroSession', session.id);

export const createAppState = (session: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('AppState', session);

export const updateAppState = (session: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('AppState', session);

export const deleteAppState = (session: Record<string, unknown>): SqlOperation =>
  buildDeleteOperation('AppState', session.id);

export const createUser = (user: Record<string, unknown>): SqlOperation =>
  buildInsertOperation('User', user);

export const updateUser = (user: Record<string, unknown>): SqlOperation =>
  buildUpdateOperation('User', user);

export const deleteUser = (user: Record<string, unknown>): SqlOperation =>
  buildDeleteOperation('User', user.id);

type OperationType = 'INSERT' | 'UPDATE' | 'DELETE';

export const getOperation = (
  table: string,
  operation: OperationType,
): (arg: Record<string, unknown>) => SqlOperation => {
  switch (table) {
    case 'Task':
      switch (operation) {
        case 'INSERT': return createTask;
        case 'UPDATE': return updateTask;
        case 'DELETE': return deleteTask;
      }
      break;
    case 'Category':
      switch (operation) {
        case 'INSERT': return createCategory;
        case 'UPDATE': return updateCategory;
        case 'DELETE': return deleteCategory;
      }
      break;
    case 'TaskCategory':
      switch (operation) {
        case 'INSERT': return createTaskCategory;
        case 'UPDATE': return updateTaskCategory;
        case 'DELETE': return deleteTaskCategory;
      }
      break;
    case 'PomodoroConfig':
      switch (operation) {
        case 'INSERT': return createPomodoroConfig;
        case 'UPDATE': return updatePomodoroConfig;
        case 'DELETE': return deletePomodoroConfig;
      }
      break;
    case 'PomodoroSession':
      switch (operation) {
        case 'INSERT': return createPomodoroSession;
        case 'UPDATE': return updatePomodoroSession;
        case 'DELETE': throw Error('Delete operation is not supported for PomodoroSession');
      }
      break;
  }
  throw new Error(`Unsupported operation ${operation} for table ${table}`);
};
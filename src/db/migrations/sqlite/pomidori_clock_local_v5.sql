-- migration 5: enforce at most one TaskCategory row per (task_id, category_id)
-- Duplicate rows created by the soft-delete/insert sync race are collapsed here:
-- keep the newest active row per (task, category), drop the rest.

CREATE UNIQUE INDEX "idx_taskcategory_unique_task_category"
  ON "TaskCategory" ("task_id", "category_id");

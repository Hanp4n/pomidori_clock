CREATE TABLE "AppState" (
  "id" INTEGER PRIMARY KEY CHECK ("id" = 1), -- enforces single row
  "active_user_id" TEXT,
  FOREIGN KEY ("active_user_id") REFERENCES "User" ("id")
);

INSERT INTO "AppState" ("id", "active_user_id") VALUES (1, NULL);
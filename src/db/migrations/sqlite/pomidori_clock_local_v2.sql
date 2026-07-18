-- migration 2: add auth token columns to local User table
ALTER TABLE "User" RENAME COLUMN "session_token" TO "access_token";
ALTER TABLE "User" ADD COLUMN "refresh_token" TEXT;

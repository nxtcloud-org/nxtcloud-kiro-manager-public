-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'PRO_PLUS', 'POWER');

-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('ADMIN', 'SALES', 'SCHOOL', 'DEMO');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "seat_count" INTEGER NOT NULL,
    "credit_limit" DOUBLE PRECISION NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "aws_account_id" TEXT,
    "s3_bucket" TEXT,
    "identity_store_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiro_users" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "identity_center_id" TEXT,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "synced_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kiro_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_groups" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "chat_trigger_type" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "date" TEXT NOT NULL,
    "hour" INTEGER NOT NULL,
    "prompt_length" INTEGER NOT NULL,
    "response_length" INTEGER NOT NULL,
    "model_id" TEXT,
    "s3_key" TEXT NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_reports" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_type" TEXT,
    "chat_conversations" INTEGER NOT NULL DEFAULT 0,
    "credits_used" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overage_credits_used" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overage_enabled" BOOLEAN NOT NULL DEFAULT false,
    "subscription_tier" TEXT,
    "total_messages" INTEGER NOT NULL DEFAULT 0,
    "auto_messages" INTEGER NOT NULL DEFAULT 0,
    "simple_task_messages" INTEGER NOT NULL DEFAULT 0,
    "unknown_messages" INTEGER NOT NULL DEFAULT 0,
    "s3_key" TEXT NOT NULL,

    CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_log" (
    "id" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL,
    "record_count" INTEGER NOT NULL,
    "file_type" TEXT NOT NULL DEFAULT 'gar',

    CONSTRAINT "collection_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_meta" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "collection_meta_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "team_name" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" TEXT,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AccountRole" NOT NULL DEFAULT 'SCHOOL',
    "display_name" TEXT NOT NULL,
    "groups" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "groups_organization_id_code_key" ON "groups"("organization_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "kiro_users_user_id_key" ON "kiro_users"("user_id");

-- CreateIndex
CREATE INDEX "kiro_users_email_idx" ON "kiro_users"("email");

-- CreateIndex
CREATE INDEX "user_groups_group_id_idx" ON "user_groups"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_groups_user_id_group_id_key" ON "user_groups"("user_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "messages_request_id_key" ON "messages"("request_id");

-- CreateIndex
CREATE INDEX "messages_date_idx" ON "messages"("date");

-- CreateIndex
CREATE INDEX "messages_user_id_date_idx" ON "messages"("user_id", "date");

-- CreateIndex
CREATE INDEX "messages_date_hour_idx" ON "messages"("date", "hour");

-- CreateIndex
CREATE INDEX "user_reports_date_idx" ON "user_reports"("date");

-- CreateIndex
CREATE UNIQUE INDEX "user_reports_date_user_id_key" ON "user_reports"("date", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "collection_log_s3_key_key" ON "collection_log"("s3_key");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "team_members_group_id_team_name_idx" ON "team_members"("group_id", "team_name");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_group_id_email_key" ON "team_members"("group_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_username_key" ON "accounts"("username");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "kiro_users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "kiro_users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "kiro_users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "kiro_users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

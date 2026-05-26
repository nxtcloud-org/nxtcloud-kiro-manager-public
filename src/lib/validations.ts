import { z } from "zod/v4";

export const loginSchema = z.object({
  username: z.string().email("이메일 형식으로 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
});

export const dateRangeSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const createAccountSchema = z.object({
  username: z.string().email("이메일 형식이어야 합니다"),
  password: z.string().min(6),
  displayName: z.string().min(1),
  role: z.enum(["ADMIN", "SALES", "SCHOOL", "DEMO"]),
  groups: z.array(z.string()).default([]),
  organizationId: z.string().nullable().optional(),
});

export const updateAccountSchema = z.object({
  displayName: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "SALES", "SCHOOL", "DEMO"]).optional(),
  groups: z.array(z.string()).optional(),
  organizationId: z.string().nullable().optional(),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export const createSubscriptionSchema = z.object({
  organizationId: z.string().min(1),
  tier: z.enum(["FREE", "PRO", "PRO_PLUS", "POWER"]),
  seatCount: z.number().int().positive(),
  creditLimit: z.number().positive(),
  startDate: z.string(),
  endDate: z.string().optional(),
  awsAccountId: z.string().optional(),
  awsAccountAlias: z.string().optional(),
  s3Bucket: z.string().optional(),
  identityStoreId: z.string().optional(),
});

export const updateSubscriptionSchema = z.object({
  tier: z.enum(["FREE", "PRO", "PRO_PLUS", "POWER"]).optional(),
  seatCount: z.number().int().positive().optional(),
  creditLimit: z.number().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  awsAccountId: z.string().nullable().optional(),
  awsAccountAlias: z.string().nullable().optional(),
  s3Bucket: z.string().nullable().optional(),
  identityStoreId: z.string().nullable().optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
});

export const createGroupSchema = z.object({
  code: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  organizationId: z.string().min(1),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
});

export const createCourseSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  semester: z.string().min(1),
  organizationId: z.string().min(1),
  legacyGroupCode: z.string().optional(),
});

export const updateCourseSchema = z.object({
  name: z.string().min(1).optional(),
  semester: z.string().min(1).optional(),
  legacyGroupCode: z.string().nullable().optional(),
});

export const createPolicySchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9-]+$/),
  description: z.string().optional(),
  document: z.object({
    version: z.string(),
    statements: z.array(z.object({
      effect: z.enum(["allow", "deny"]),
      actions: z.array(z.string().min(1)),
      resources: z.array(z.string().min(1)),
    })),
  }),
});

export const simulatePolicySchema = z.object({
  accountId: z.string().min(1),
  action: z.string().min(1),
  resource: z.string().min(1),
});

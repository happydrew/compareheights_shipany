import { projects } from "@/db/schema";
import { db } from "@/db";
import { desc, eq, and, asc, or, sql, ilike } from "drizzle-orm";
import type { ProjectData } from "@/types/project";

export enum ProjectStatus {
  Active = "active",
  Deleted = "deleted",
}

// 创建项目
export async function insertProject(data: typeof projects.$inferInsert) {
  if (data.created_at && typeof data.created_at === "string") {
    data.created_at = new Date(data.created_at);
  }
  if (data.updated_at && typeof data.updated_at === "string") {
    data.updated_at = new Date(data.updated_at);
  }

  const [project] = await db().insert(projects).values(data).returning();

  return project;
}

// 根据UUID查找项目
export async function findProjectByUuid(
  uuid: string
): Promise<typeof projects.$inferSelect | undefined> {
  const [project] = await db()
    .select()
    .from(projects)
    .where(and(eq(projects.uuid, uuid), eq(projects.status, ProjectStatus.Active)))
    .limit(1);

  return project;
}

// 获取用户的项目列表
export async function getProjectsByUserUuid(
  user_uuid: string,
  options: {
    page?: number;
    limit?: number;
    sort?: 'recent' | 'name' | 'views';
    search?: string;
  } = {}
): Promise<(typeof projects.$inferSelect)[] | undefined> {
  const { page = 1, limit = 50, sort = 'recent', search } = options;
  const offset = (page - 1) * limit;

  let query = db()
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.user_uuid, user_uuid),
        eq(projects.status, ProjectStatus.Active)
      )
    );

  // 搜索过滤
  if (search) {
    query = query.where(
      and(
        eq(projects.user_uuid, user_uuid),
        eq(projects.status, ProjectStatus.Active),
        ilike(projects.title, `%${search}%`)
      )
    );
  }

  // 排序
  switch (sort) {
    case 'name':
      query = query.orderBy(asc(projects.title));
      break;
    case 'views':
      query = query.orderBy(desc(projects.view_count));
      break;
    case 'recent':
    default:
      query = query.orderBy(desc(projects.updated_at));
      break;
  }

  const data = await query.limit(limit).offset(offset);

  return data;
}

// 获取用户项目总数
export async function getProjectsCountByUserUuid(
  user_uuid: string,
  search?: string
): Promise<number> {
  let query = db()
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(
      and(
        eq(projects.user_uuid, user_uuid),
        eq(projects.status, ProjectStatus.Active)
      )
    );

  if (search) {
    query = query.where(
      and(
        eq(projects.user_uuid, user_uuid),
        eq(projects.status, ProjectStatus.Active),
        ilike(projects.title, `%${search}%`)
      )
    );
  }

  const [result] = await query;
  return result?.count || 0;
}

// 获取公开项目列表 (用于公开画廊)
export async function getPublicProjects(
  options: {
    page?: number;
    limit?: number;
    sort?: 'recent' | 'popular';
  } = {}
): Promise<(typeof projects.$inferSelect)[] | undefined> {
  const { page = 1, limit = 50, sort = 'popular' } = options;
  const offset = (page - 1) * limit;

  const orderBy = sort === 'popular'
    ? desc(projects.view_count)
    : desc(projects.created_at);

  const data = await db()
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.is_public, true),
        eq(projects.status, ProjectStatus.Active)
      )
    )
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return data;
}

// 更新项目
export async function updateProject(
  uuid: string,
  data: Partial<typeof projects.$inferInsert>
) {
  // 总是更新 updated_at
  data.updated_at = new Date();

  const [project] = await db()
    .update(projects)
    .set(data)
    .where(eq(projects.uuid, uuid))
    .returning();

  return project;
}

// 删除项目 (软删除)
export async function deleteProject(uuid: string) {
  const [project] = await db()
    .update(projects)
    .set({
      status: ProjectStatus.Deleted,
      updated_at: new Date()
    })
    .where(eq(projects.uuid, uuid))
    .returning();

  return project;
}

// 增加项目浏览量
export async function incrementViewCount(uuid: string) {
  const [project] = await db()
    .update(projects)
    .set({
      view_count: sql`${projects.view_count} + 1`
    })
    .where(eq(projects.uuid, uuid))
    .returning();

  return project;
}

// 复制项目
export async function duplicateProject(
  uuid: string,
  user_uuid: string,
  new_uuid: string
): Promise<typeof projects.$inferSelect | undefined> {
  // 查找原项目
  const original = await findProjectByUuid(uuid);
  if (!original) {
    throw new Error('Project not found');
  }

  // 创建新项目
  const newProject = await insertProject({
    uuid: new_uuid,
    user_uuid: user_uuid,
    title: `${original.title} (Copy)`,
    project_data: original.project_data,
    thumbnail_url: original.thumbnail_url,
    is_public: false, // 复制的项目默认为私密
    view_count: 0,
    status: ProjectStatus.Active,
    created_at: new Date(),
    updated_at: new Date(),
  });

  return newProject;
}

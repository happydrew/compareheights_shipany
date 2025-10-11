-- 创建项目表
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(255) NOT NULL UNIQUE,
  user_uuid VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled Project',
  thumbnail_url VARCHAR(500),
  project_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active'
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_projects_user_uuid ON projects(user_uuid);
CREATE INDEX IF NOT EXISTS idx_projects_uuid ON projects(uuid);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- 为 user_uuid 和 is_public 组合创建复合索引 (用于公开画廊查询)
CREATE INDEX IF NOT EXISTS idx_projects_public_created ON projects(is_public, created_at DESC) WHERE is_public = true;

-- 添加注释
COMMENT ON TABLE projects IS '用户身高比对项目表';
COMMENT ON COLUMN projects.uuid IS '项目唯一标识符';
COMMENT ON COLUMN projects.user_uuid IS '所属用户UUID';
COMMENT ON COLUMN projects.title IS '项目标题';
COMMENT ON COLUMN projects.thumbnail_url IS '项目缩略图URL';
COMMENT ON COLUMN projects.project_data IS '项目数据(JSONB格式,包含角色和设置)';
COMMENT ON COLUMN projects.is_public IS '是否公开分享';
COMMENT ON COLUMN projects.view_count IS '浏览次数';
COMMENT ON COLUMN projects.status IS '项目状态: active/deleted';

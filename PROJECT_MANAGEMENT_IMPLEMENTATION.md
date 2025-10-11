# 项目管理功能实施指南

## 已完成的工作

本次开发已成功实现了 CompareHeights 项目的核心项目管理功能,包括:

### Phase 1: 数据库和基础API ✅
- ✅ 创建 `projects` 数据库表 schema (src/db/schema.ts)
- ✅ SQL 迁移文件 (src/db/migrations/create_projects_table.sql)
- ✅ 项目类型定义 (src/types/project.d.ts)
- ✅ 项目数据模型 (src/models/project.ts)
- ✅ 完整的 CRUD API 端点:
  - `GET/POST /api/projects` - 获取/创建项目列表
  - `GET/PATCH/DELETE /api/projects/[uuid]` - 单个项目操作
  - `POST /api/projects/[uuid]/duplicate` - 复制项目
  - `GET /api/share/[uuid]` - 获取公开分享项目
  - `GET /api/projects/public` - 获取公开画廊列表

### Phase 2: Dashboard 布局 ✅
- ✅ Dashboard 主布局 (src/components/dashboard/layout.tsx)
- ✅ 侧边栏导航 (src/components/dashboard/sidebar.tsx)
- ✅ 顶部 Header (src/components/dashboard/header.tsx)
- ✅ Dashboard 路由和权限验证

### Phase 3: 项目管理核心功能 ✅
- ✅ 项目卡片组件 (src/components/dashboard/project-card.tsx)
- ✅ 项目列表页 (src/app/[locale]/(default)/dashboard/projects/page.tsx)
  - 搜索和排序
  - 创建、编辑、删除、复制项目
  - 公开/私密切换
  - 分享功能
- ✅ 项目编辑页 (src/app/[locale]/(default)/dashboard/projects/[uuid]/edit/page.tsx)
  - 集成 HeightCompareTool 组件
  - 自动保存功能 (3秒防抖)
  - 实时保存状态指示器
  - 面包屑导航
  - 预览和分享功能

### Phase 4: 分享和公开画廊 ✅
- ✅ 分享页面 (src/app/[locale]/share/[uuid]/page.tsx)
  - 只读模式展示
  - SEO 优化结构
  - 浏览量统计
  - 引流 CTA
- ✅ 公开画廊页面 (src/app/[locale]/(default)/dashboard/gallery/page.tsx)
  - 按热度/时间排序
  - 使用模板功能

### Phase 5: 账户页面 ✅
- ✅ 个人资料页 (src/app/[locale]/(default)/dashboard/profile/page.tsx)
- ✅ 订阅管理页 (src/app/[locale]/(default)/dashboard/subscription/page.tsx)
- ✅ 积分管理页 (src/app/[locale]/(default)/dashboard/credits/page.tsx)
- ✅ 订单历史页 (src/app/[locale]/(default)/dashboard/orders/page.tsx)

### 依赖包安装 ✅
- ✅ uuid - 生成唯一标识符
- ✅ use-debounce - 防抖hook
- ✅ date-fns - 时间格式化

---

## 数据库迁移步骤

### 1. 执行 SQL 迁移

```bash
# 连接到数据库并执行迁移文件
psql -U your_username -d your_database -f src/db/migrations/create_projects_table.sql

# 或者通过 Supabase Dashboard 的 SQL Editor 执行:
# 复制 src/db/migrations/create_projects_table.sql 的内容并执行
```

### 2. 验证表创建

```sql
-- 查看表结构
\d projects

-- 查看索引
\di projects*

-- 测试插入数据
INSERT INTO projects (uuid, user_uuid, title, project_data)
VALUES (
  'test-uuid-123',
  'user-uuid-456',
  'Test Project',
  '{"characters": [], "settings": {}, "metadata": {"version": "1.0", "characterCount": 0}}'::jsonb
);

-- 查询测试数据
SELECT * FROM projects WHERE uuid = 'test-uuid-123';

-- 删除测试数据
DELETE FROM projects WHERE uuid = 'test-uuid-123';
```

---

## 代码集成步骤

### 1. 修改 HeightCompareTool 组件

在 `src/components/compareheights/HeightCompareTool.tsx` 中添加数据变化监听:

```typescript
// 在组件内部添加 useEffect 监听数据变化
useEffect(() => {
  if (!onChange || readOnly) return;

  // 当 comparisonItems 或 styleSettings 变化时,触发 onChange
  const projectData = {
    characters: comparisonItems.map(item => ({
      id: item.character.id,
      name: item.character.name,
      height: item.character.height,
      cat_ids: item.character.cat_ids,
      media_type: item.character.media_type,
      media_url: item.character.media_url,
      thumbnail_url: item.character.thumbnail_url,
      color: item.character.color,
      color_customizable: item.character.color_customizable,
      color_property: item.character.color_property,
      order: item.order,
      visible: item.visible,
    })),
    settings: {
      unit: unit === Unit.CM ? 'cm' : 'ft-in',
      chartTitle: 'Height Comparison',
      backgroundColor: styleSettings.backgroundColor,
      backgroundImage: styleSettings.backgroundImage,
      gridLines: styleSettings.gridLines,
      labels: styleSettings.labels,
      shadows: styleSettings.shadows,
      theme: styleSettings.theme,
      chartHeight: styleSettings.chartHeight,
      spacing: styleSettings.spacing,
    },
    metadata: {
      version: '1.0',
      characterCount: comparisonItems.length,
    },
  };

  onChange(projectData);
}, [comparisonItems, styleSettings, unit, onChange, readOnly]);
```

### 2. 在只读模式下隐藏编辑功能

```typescript
// 根据 readOnly 属性条件渲染编辑按钮
{!readOnly && (
  <button onClick={handleEdit}>
    Edit
  </button>
)}
```

---

## 环境变量配置

确保 `.env` 文件包含必要的配置:

```env
# 数据库连接
DATABASE_URL=your_database_url

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret

# Supabase (如果使用)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

---

## 测试步骤

### 1. 启动开发服务器

```bash
pnpm dev
```

### 2. 测试项目管理功能

1. **登录**: 访问 http://localhost:3000/auth/signin
2. **创建项目**:
   - 进入 Dashboard: http://localhost:3000/dashboard
   - 点击 "New Project" 按钮
   - 添加角色并调整设置
   - 验证自动保存功能
3. **编辑项目**:
   - 在项目列表中点击 "Edit"
   - 修改项目标题和内容
   - 确认保存状态指示器工作正常
4. **分享项目**:
   - 在项目卡片菜单中选择 "Make Public"
   - 点击 "Share" 复制链接
   - 在无痕窗口打开分享链接验证只读模式
5. **公开画廊**:
   - 访问 http://localhost:3000/dashboard/gallery
   - 验证公开项目列表显示
   - 测试 "Use Template" 功能
6. **删除项目**:
   - 在项目卡片菜单中选择 "Delete"
   - 确认软删除功能工作

### 3. API 测试

使用 curl 或 Postman 测试 API:

```bash
# 获取项目列表
curl -X GET http://localhost:3000/api/projects \
  -H "Cookie: your_auth_cookie"

# 创建项目
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: your_auth_cookie" \
  -d '{
    "title": "Test Project",
    "project_data": {
      "characters": [],
      "settings": {},
      "metadata": {"version": "1.0", "characterCount": 0}
    }
  }'

# 获取公开项目
curl -X GET http://localhost:3000/api/projects/public

# 获取分享项目
curl -X GET http://localhost:3000/api/share/[uuid]
```

---

## 已知问题和待办事项

### 需要手动完成的工作:

1. **HeightCompareTool onChange 集成** ⚠️
   - 需要在 HeightCompareTool.tsx 中添加 useEffect 监听数据变化
   - 当 comparisonItems 或 styleSettings 变化时调用 onChange 回调

2. **缩略图生成功能** ⚠️
   - 需要安装 `html2canvas`: `pnpm add html2canvas`
   - 需要配置云存储 (Supabase Storage 或 AWS S3)
   - 实现缩略图上传和URL更新逻辑

3. **只读模式完善** ⚠️
   - 在 HeightCompareTool 中根据 readOnly prop 隐藏所有编辑按钮
   - 禁用角色添加、删除、拖拽等功能

4. **用户资料更新 API** 📝
   - 实现 `/api/user/profile` PATCH 端点
   - 支持头像上传功能

5. **订阅计划集成** 📝
   - 根据用户订阅限制项目数量和功能
   - 实现配额检查中间件

6. **SEO 优化** 📝
   - 为分享页面添加动态 meta 标签
   - 实现 Open Graph 和 Twitter Card

---

## 文件结构总览

```
src/
├── app/
│   ├── api/
│   │   ├── projects/
│   │   │   ├── route.ts                    # GET/POST 项目列表
│   │   │   ├── [uuid]/
│   │   │   │   ├── route.ts                # GET/PATCH/DELETE 单个项目
│   │   │   │   └── duplicate/route.ts      # POST 复制项目
│   │   │   └── public/route.ts             # GET 公开项目列表
│   │   └── share/
│   │       └── [uuid]/route.ts             # GET 分享项目
│   └── [locale]/
│       ├── (default)/
│       │   └── dashboard/
│       │       ├── layout.tsx              # Dashboard 布局
│       │       ├── page.tsx                # 重定向到 /projects
│       │       ├── projects/
│       │       │   ├── page.tsx            # 项目列表页
│       │       │   └── [uuid]/edit/page.tsx # 项目编辑页
│       │       ├── gallery/page.tsx        # 公开画廊
│       │       ├── profile/page.tsx        # 个人资料
│       │       ├── subscription/page.tsx   # 订阅管理
│       │       ├── credits/page.tsx        # 积分管理
│       │       └── orders/page.tsx         # 订单历史
│       └── share/
│           └── [uuid]/page.tsx             # 分享页面
├── components/
│   └── dashboard/
│       ├── layout.tsx                      # Dashboard 布局组件
│       ├── sidebar.tsx                     # 侧边栏导航
│       ├── header.tsx                      # 顶部 Header
│       ├── project-card.tsx                # 项目卡片
│       └── auto-save-indicator.tsx         # 自动保存指示器
├── db/
│   ├── schema.ts                           # 数据库 schema (新增 projects 表)
│   └── migrations/
│       └── create_projects_table.sql       # 项目表迁移文件
├── models/
│   └── project.ts                          # 项目数据模型
└── types/
    └── project.d.ts                        # 项目类型定义
```

---

## 下一步计划

### 短期 (1-2周):
1. 完善 HeightCompareTool 的 onChange 集成
2. 实现缩略图自动生成和上传
3. 完善只读模式的UI禁用
4. 添加项目配额检查

### 中期 (1个月):
1. 实现团队协作功能
2. 添加项目标签和分类
3. 实现模板市场
4. 添加导出功能 (PDF, SVG)

### 长期 (3个月+):
1. 实现项目版本历史
2. 添加评论和点赞功能
3. 实现 API 开放平台
4. 移动端优化

---

## 支持

如有问题,请参考:
- 产品设计文档: 见开发记录
- API 文档: 各个 route.ts 文件中的注释
- 数据模型: src/types/project.d.ts

---

**开发完成日期**: 2025-01-XX
**开发者**: Claude Code Assistant
**版本**: v1.0.0 (MVP)

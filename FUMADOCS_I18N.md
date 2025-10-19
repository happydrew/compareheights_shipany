# Fumadocs 多语言功能说明

## 功能概述

✅ 已实现的功能：
- 支持英文（en）和中文（zh）两种语言
- 自动根据 URL 路径加载对应语言的文档
- 在文档页面导航栏添加了语言切换器
- 每种语言有独立的导航结构和内容

## 文件结构

```
content/docs/
├── index.mdx          # 英文首页
├── index.zh.mdx       # 中文首页
├── user-guide.mdx     # 英文用户指南
├── user-guide.zh.mdx  # 中文用户指南
├── meta.json          # 英文导航配置
└── meta.zh.json       # 中文导航配置

src/
├── lib/
│   ├── i18n.config.ts       # 多语言配置
│   └── source.ts            # Fumadocs source loader (支持 i18n)
├── components/
│   └── docs/
│       └── LanguageSwitcher.tsx  # 语言切换器组件
└── app/[locale]/docs/
    ├── layout.tsx           # 文档布局 (集成语言切换器)
    └── [[...slug]]/
        └── page.tsx         # 文档页面 (支持多语言)
```

## 使用方法

### 1. 访问不同语言的文档

- 英文文档：`http://localhost:3000/en/docs`
- 中文文档：`http://localhost:3000/zh/docs`

### 2. 使用语言切换器

在文档页面的侧边栏底部，你会看到一个语言选择下拉框：
- 🌐 + 语言名称下拉选择器
- 与主题切换器（深色/浅色模式）放在一起
- 点击可以在英文和中文之间切换
- 切换后会自动跳转到对应语言的相同页面
- 简洁的设计，不占用顶部导航栏空间

### 3. 添加新的文档页面

要添加一个新的文档页面，需要创建两个文件：

```bash
# 英文版
content/docs/new-page.mdx

# 中文版
content/docs/new-page.zh.mdx
```

然后在对应的 `meta.json` 文件中添加页面引用：

```json
{
  "pages": [
    "user-guide",
    "new-page"
  ]
}
```

### 4. 添加新语言

1. 在 `src/lib/i18n.config.ts` 中添加语言代码：
   ```typescript
   export const i18nConfig = {
     languages: ['en', 'zh', 'ja'], // 添加日语
     defaultLanguage: 'en',
   };
   ```

2. 在 `src/components/docs/LanguageSwitcher.tsx` 中添加语言名称：
   ```typescript
   const languageNames = {
     en: 'English',
     zh: '中文',
     ja: '日本語', // 添加日语
   };
   ```

3. 创建对应语言的文档文件：
   - `content/docs/index.ja.mdx`
   - `content/docs/meta.ja.json`

## 技术实现细节

### 语言识别机制

Fumadocs 根据文件名自动识别语言：
- 没有语言后缀的文件 → 默认语言（英文）
- 有语言后缀的文件 → 对应语言（如 `.zh.mdx` → 中文）

### 路由结构

- `/[locale]/docs/[[...slug]]` - 动态路由支持多语言
- `locale` 参数决定加载哪种语言的内容
- Fumadocs source loader 根据 locale 返回对应的页面树

### 语言切换逻辑

语言切换器组件 (`LanguageSwitcher.tsx`) 的工作原理：
1. 获取当前的 locale 和 pathname
2. 替换 URL 中的语言代码
3. 跳转到新的 URL，触发页面重新加载
4. 新页面根据新的 locale 加载对应语言的内容

## 测试步骤

1. 启动开发服务器：
   ```bash
   pnpm dev
   ```

2. 访问英文文档：
   ```
   http://localhost:3000/en/docs
   ```

3. 点击侧边栏底部的语言切换器，选择"中文"

4. 验证：
   - URL 变为 `/zh/docs`
   - 页面内容显示为中文
   - 侧边栏导航显示中文标题
   - 页面标题和描述为中文
   - 语言切换器显示当前选中的语言

5. 尝试在不同页面切换语言，确保都能正确跳转

## 故障排查

### 问题：语言切换器没有显示

**解决方案：**
- 确保 `src/components/docs/LanguageSwitcher.tsx` 文件存在
- 检查 `src/app/[locale]/docs/layout.tsx` 是否正确导入并使用了 `<LanguageSwitcher />`
- 清除 Next.js 缓存：`rm -rf .next && pnpm dev`

### 问题：切换语言后显示 404

**解决方案：**
- 确保两种语言的文档文件都存在
- 检查文件命名是否正确（如 `index.zh.mdx` 而不是 `index-zh.mdx`）
- 确保 `meta.json` 和 `meta.zh.json` 中的页面配置一致

### 问题：中文搜索不工作

**说明：**
- Orama 搜索引擎不原生支持中文分词
- 当前配置使用 'english' 模式，可以进行基本的关键词搜索
- 如需完整的中文搜索支持，建议使用 Algolia 或其他支持中文的搜索服务

## 下一步改进

- [ ] 添加更优雅的语言切换器 UI（使用 dropdown 菜单）
- [ ] 在首页添加语言检测和自动跳转
- [ ] 为中文文档集成专门的搜索方案
- [ ] 添加更多语言支持（日语、韩语等）
- [ ] 在 SEO metadata 中添加 hreflang 标签

---

创建时间：2025-10-18
最后更新：2025-10-18

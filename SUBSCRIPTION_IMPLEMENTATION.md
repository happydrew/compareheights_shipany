# 订阅机制实现总结

## 概述
基于现有的订单表（orders）完善了完整的订阅机制，实现了套餐权益管理、使用量限制校验和订阅页面展示。

## 实现内容

### 1. 套餐权益配置

**文件位置**：
- `src/i18n/pages/pricing/en.jsonc`
- `src/i18n/pages/pricing/zh.jsonc`

**新增配置**：
每个套餐（月付和年付）添加了 `quota` 字段：

```jsonc
"quota": {
  "max_projects": 10,              // 最大项目数
  "max_custom_characters": 20,     // 最大自定义角色数
  "max_storage_mb": 500           // 最大存储空间(MB)
}
```

**套餐配额设置**：
- **免费套餐**：3个项目、5个自定义角色、100MB存储
- **Starter**：10个项目、20个自定义角色、500MB存储
- **Standard**：50个项目、100个自定义角色、2000MB存储
- **Premium**：200个项目、500个自定义角色、10000MB存储

### 2. 订阅服务层

**文件位置**：`src/lib/subscription/index.ts`

**核心功能**：

#### 2.1 获取用户订阅信息
```typescript
getUserSubscription(userUuid: string): Promise<SubscriptionInfo>
```
- 查询orders表中的有效订阅（status='paid' 且 sub_period_end > 当前时间）
- 根据product_id从pricing配置中获取套餐权益
- 无有效订阅时返回免费套餐

#### 2.2 配额检查函数
```typescript
canCreateProject(userUuid: string, currentProjectCount: number)
canCreateCustomCharacter(userUuid: string, currentCharacterCount: number)
checkStorageLimit(userUuid: string, currentStorageMb: number)
```
- 检查用户当前使用量是否超过套餐限制
- 返回是否允许操作、原因和限制值

#### 2.3 使用量统计
```typescript
getUserUsageStats(userUuid: string, currentStats): Promise<UsageStats>
```
- 计算各项资源的当前使用量、限制值和使用百分比

### 3. API端点实现

#### 3.1 项目创建API
**文件**：`src/app/api/projects/route.ts`

**修改**：POST请求中添加配额检查
```typescript
// 检查用户项目配额
const currentCount = await getProjectsCountByUserUuid(userInfo.uuid);
const quotaCheck = await canCreateProject(userInfo.uuid, currentCount);

if (!quotaCheck.allowed) {
  return NextResponse.json({
    success: false,
    message: quotaCheck.reason,
    error_code: "QUOTA_EXCEEDED",
    data: { current: currentCount, limit: quotaCheck.limit }
  }, { status: 403 });
}
```

#### 3.2 自定义角色创建API
**文件**：`src/app/api/custom-characters/route.ts`

**修改**：POST请求中添加配额检查
```typescript
// 检查自定义角色配额
const characters = await listCustomCharacters(userInfo.uuid);
const currentCount = characters.length;
const quotaCheck = await canCreateCustomCharacter(userInfo.uuid, currentCount);

if (!quotaCheck.allowed) {
  return NextResponse.json({
    success: false,
    message: quotaCheck.reason,
    error_code: "QUOTA_EXCEEDED",
    data: { current: currentCount, limit: quotaCheck.limit }
  }, { status: 403 });
}
```

#### 3.3 订阅信息API
**文件**：`src/app/api/subscription/route.ts`

**功能**：GET请求返回用户的订阅信息和使用量统计
```typescript
{
  subscription: {
    plan_name: string,
    product_id: string,
    status: "active" | "expired" | "free",
    period_start?: number,
    period_end?: number,
    quota: { ... }
  },
  usage: {
    projects: { current, limit, percentage },
    custom_characters: { current, limit, percentage },
    storage: { current_mb, limit_mb, percentage }
  }
}
```

### 4. 订阅页面实现

**文件**：`src/app/[locale]/dashboard/subscription/page.tsx`

**功能**：
- 显示当前套餐信息（套餐名称、有效期）
- 实时展示使用量统计（项目、自定义角色、存储空间）
- 进度条可视化（绿色<70%、黄色70-90%、红色>=90%）
- 超过90%时显示警告提示
- 提供升级套餐入口

### 5. 国际化支持

**文件**：
- `src/i18n/messages/en.json`
- `src/i18n/messages/zh.json`

**新增翻译**：
```json
"subscription": {
  "title": "Subscription / 订阅管理",
  "current_plan": "Current Plan / 当前套餐",
  "upgrade_plan": "Upgrade Plan / 升级套餐",
  "usage_this_month": "Usage This Month / 本月使用量",
  "projects": "Projects / 项目",
  "custom_characters": "Custom Characters / 自定义角色",
  "storage": "Storage / 存储空间",
  "quota_exceeded": {
    "projects": "...",
    "custom_characters": "...",
    "storage": "..."
  }
}
```

### 6. 类型定义

**文件**：`src/types/subscription.d.ts`

定义了完整的TypeScript类型：
- `PlanQuota` - 套餐配额
- `SubscriptionInfo` - 订阅信息
- `UsageStats` - 使用量统计
- `QuotaCheckResult` - 配额检查结果

## 订阅机制工作流程

### 订阅信息获取流程
1. 查询orders表，找到用户最新的有效订阅（status='paid'，sub_period_end > now）
2. 从订单记录中获取product_id
3. 根据product_id从pricing配置中获取对应的quota
4. 如果没有有效订阅，返回免费套餐配额

### 资源创建流程
1. 用户尝试创建项目/自定义角色
2. API获取用户当前使用量
3. 调用订阅服务层检查是否超过配额
4. 如果超过，返回403错误和详细信息
5. 如果未超过，允许创建

### 订阅到期处理
- 订阅到期后（sub_period_end < now），用户自动降级为免费套餐
- 现有资源不会被删除，但无法创建新资源（如果超过免费套餐限制）

## 数据库字段说明

**orders表关键字段**：
- `product_id` - 套餐标识（如"starter-monthly"）
- `product_name` - 套餐名称（用于显示）
- `status` - 订单状态（"paid"表示有效）
- `sub_period_start` - 订阅周期开始时间（Unix时间戳）
- `sub_period_end` - 订阅周期结束时间（Unix时间戳）
- `sub_interval_count` - 订阅周期长度
- `valid_months` - 有效月数

## 错误处理

### 配额超限错误响应
```json
{
  "success": false,
  "message": "You have reached the maximum number of projects (3) for your Free plan. Please upgrade to create more projects.",
  "error_code": "QUOTA_EXCEEDED",
  "data": {
    "current": 3,
    "limit": 3
  }
}
```

## 前端集成建议

### 1. 创建资源时的错误处理
```typescript
try {
  const response = await fetch('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ ... })
  });
  const result = await response.json();

  if (!result.success && result.error_code === 'QUOTA_EXCEEDED') {
    // 显示升级提示
    showUpgradeModal(result.message);
  }
} catch (error) {
  // 处理其他错误
}
```

### 2. 订阅状态监控
定期调用 `/api/subscription` 获取最新的使用量信息，在接近配额时提醒用户。

## 扩展性设计

### 1. 支持非Stripe支付
当前设计已支持所有支付方式，只要在orders表中记录：
- product_id（对应pricing配置）
- sub_period_start和sub_period_end（订阅周期）
- status='paid'（表示已支付）

### 2. 动态调整配额
如需调整套餐配额，只需修改pricing配置文件，无需更改代码。

### 3. 添加新的配额维度
在pricing配置中添加新字段（如max_exports），在订阅服务层添加对应的检查函数。

## 测试建议

1. **免费用户测试**：验证默认配额限制
2. **付费用户测试**：创建测试订单，验证配额提升
3. **到期处理测试**：修改sub_period_end为过去时间，验证降级
4. **边界测试**：验证达到配额限制时的提示
5. **多语言测试**：验证中英文切换

## 部署注意事项

1. 确保数据库中orders表字段完整
2. 检查pricing配置文件格式正确
3. 验证时间戳字段使用Unix时间戳（秒）
4. 确保前端正确处理403响应

## 后续优化建议

1. **缓存优化**：缓存用户订阅信息，减少数据库查询
2. **存储空间计算**：实现精确的文件大小统计
3. **配额预警**：达到80%时发送邮件提醒
4. **订阅续费提醒**：到期前7天发送提醒
5. **使用分析**：记录用户使用行为，优化套餐设计

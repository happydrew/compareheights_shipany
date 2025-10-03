// 使用新的模块化左侧面板的示例代码
// 这个文件展示了如何在现有的 HeightCompareTool.tsx 中集成新的左侧面板

/*
在原有的 HeightCompareTool.tsx 中，需要进行以下修改：

1. 导入新的左侧面板组件：
*/

import { LeftPanel } from './panels/LeftPanel';
import { LibraryProvider } from '@/lib/stores/LibraryContext';

/*
2. 在主组件中替换原有的左侧面板结构：

原来的代码可能是这样的：
```jsx
<div className="left-panel">
  // 原有的复杂左侧面板代码
</div>
```

替换为：
```jsx
<LeftPanel
  unit={unit}
  onUnitChange={setUnit}
  comparisonItems={comparisonItems}
  onCharacterAdd={handleAddCharacter}
  onImageUpload={() => setShowImageUploadModal(true)}
  className="w-80 flex-shrink-0"
/>
```

3. 确保在应用的根层级包装 LibraryProvider（如果还没有的话）：

如果需要在更高层级提供Context，可以这样包装：

```jsx
export const HeightCompareTool: React.FC = () => {
  // ... 其他状态和逻辑

  return (
    <LibraryProvider>
      <div className="flex h-screen">
        <LeftPanel
          unit={unit}
          onUnitChange={setUnit}
          comparisonItems={comparisonItems}
          onCharacterAdd={handleAddCharacter}
          onImageUpload={() => setShowImageUploadModal(true)}
          className="w-80 flex-shrink-0"
        />
        
        <div className="flex-1">
          // 右侧主要内容区域
        </div>
      </div>
    </LibraryProvider>
  );
};
```

4. 实现字符添加处理函数：

```jsx
const handleAddCharacter = (character: Character) => {
  // 将角色添加到比较列表的逻辑
  const newItem = {
    id: generateId(),
    character,
    visible: true,
    selected: false,
    order: comparisonItems.length
  };
  
  setComparisonItems(prev => [...prev, newItem]);
};
```

这样的重构带来的好处：

✅ 模块化：每个功能都有独立的组件和状态管理
✅ 可维护性：代码结构清晰，易于理解和修改
✅ 可复用性：组件可以在其他地方复用
✅ 类型安全：完整的TypeScript类型定义
✅ 性能优化：智能缓存和响应式设计
✅ 用户体验：流畅的交互和状态管理

注意事项：
- 确保所有必需的环境变量已配置（SUPABASE相关）
- 检查数据库结构是否与新的schema匹配
- 测试所有功能是否正常工作
- 考虑渐进式迁移，一步步替换原有功能
*/

// 这个文件仅作为集成指南，实际集成时需要根据现有代码结构进行调整
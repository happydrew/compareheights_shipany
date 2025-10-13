-- ========================================
-- 角色数据表
-- ========================================
CREATE TABLE public.characters (
  id TEXT PRIMARY KEY,                    -- 角色唯一标识符
  name TEXT NOT NULL,                     -- 角色名称
  height DOUBLE PRECISION NOT NULL,       -- 身高（单位：米，使用双精度浮点数支持极大极小值）
  cat_ids INTEGER[] NOT NULL DEFAULT '{}', -- 分类路径ID数组，存储从根到叶子的完整路径

  -- 媒体相关字段
  media_type TEXT NOT NULL CHECK (media_type IN ('svg', 'image')), -- 媒体类型：svg或image
  media_url TEXT NOT NULL,                -- 主要图片/SVG的URL
  thumbnail_url TEXT NOT NULL,            -- 缩略图URL（用于角色库展示）

  -- 外观相关字段
  color TEXT,                            -- 默认颜色（HEX格式，如#3B82F6）
  color_customizable BOOLEAN NOT NULL DEFAULT false, -- 是否支持自定义颜色
  color_property TEXT,                   -- SVG中需要修改颜色的属性名（如fill,stroke）

  -- 排序字段
  order_num INTEGER NOT NULL DEFAULT 0   -- 显示排序，数字越小越靠前
  
  character_type TEXT NOT NULL DEFAULT 'public' CHECK (character_type IN ('public', 'custom'));

  user_uuid TEXT;
);

COMMENT ON TABLE public.characters IS '角色数据表，存储身高比较工具中的角色信息，支持从夸克尺度到宇宙尺度';

-- 字段注释
COMMENT ON COLUMN public.characters.id IS '角色唯一标识符';
COMMENT ON COLUMN public.characters.name IS '角色名称';
COMMENT ON COLUMN public.characters.height IS '身高，单位为米，使用DOUBLE PRECISION支持从夸克(~10^-18m)到宇宙(~10^26m)尺度';
COMMENT ON COLUMN public.characters.cat_ids IS '分类路径ID数组，存储从根分类到当前角色所属分类的完整路径，用于高效递归查询';
COMMENT ON COLUMN public.characters.media_type IS '媒体类型：svg(矢量图)或image(位图)';
COMMENT ON COLUMN public.characters.media_url IS '主要图片或SVG文件的URL地址';
COMMENT ON COLUMN public.characters.thumbnail_url IS '缩略图URL，用于角色库列表展示';
COMMENT ON COLUMN public.characters.color IS '默认颜色，HEX格式(如#3B82F6)，SVG角色可自定义';
COMMENT ON COLUMN public.characters.color_customizable IS '是否支持自定义颜色，主要用于SVG角色';
COMMENT ON COLUMN public.characters.color_property IS 'SVG中需要修改颜色的属性名，多个属性用逗号分隔(如fill,stroke)';
COMMENT ON COLUMN public.characters.order_num IS '显示排序，数字越小越靠前，用于控制角色在列表中的显示顺序';
COMMENT ON COLUMN public.characters.character_type IS '角色类型：public(公共角色)或custom(自定义角色)';
COMMENT ON COLUMN public.characters.user_uuid IS '角色创建者的UUID';

-- 创建索引
CREATE INDEX idx_characters_cat_ids ON public.characters USING GIN (cat_ids); -- GIN索引支持数组包含查询
CREATE INDEX idx_characters_name ON public.characters(name);
CREATE INDEX idx_characters_height ON public.characters(height);
CREATE INDEX idx_characters_order ON public.characters(order_num);

-- 为LIKE查询优化的索引 (支持前缀匹配)
CREATE INDEX idx_characters_name_pattern ON public.characters(name text_pattern_ops);

-- 为订单表启用RLS
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- RLS策略：只允许 service_role 用户访问订单表
CREATE POLICY "Admins can manage all characters"
  ON public.characters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ========================================
-- cat_ids 数组使用示例
-- ========================================
-- 示例分类树：人物(1) -> 明星(2) -> 演员(3)
-- 某角色的 cat_ids 值：ARRAY[1,2,3]
-- 
-- 查询示例：
-- 1. 查询"人物(1)"分类下所有角色（包含子分类），父目录角色优先：
--    SELECT * FROM characters 
--    WHERE cat_ids @> ARRAY[1]
--    ORDER BY array_length(cat_ids, 1) ASC, order_num ASC, name ASC;
--    结果：返回 cat_ids=[1], [1,2], [1,2,3] 的所有角色
-- 
-- 2. 查询"演员(3)"分类下所有角色（包含子分类）：
--    SELECT * FROM characters WHERE cat_ids @> ARRAY[3];
--    结果：返回 cat_ids=[1,2,3], [1,2,3,4] 等包含3的角色
-- 
-- 3. 查询精确属于"演员(3)"分类的角色（不包含子分类）：
--    SELECT * FROM characters WHERE cat_ids[array_length(cat_ids,1)] = 3;
--    结果：只返回以3结尾的角色，即直接属于该分类的角色
-- 
-- 排序规则说明：
-- - array_length(cat_ids, 1) ASC: 数组越短越靠前（父目录优先）
-- - order_num ASC: 相同层级按自定义排序
-- - name ASC: 最后按名称排序





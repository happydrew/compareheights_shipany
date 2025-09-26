-- ========================================
-- 用户反馈表
-- ========================================
CREATE TABLE public.feedback (
  id BIGSERIAL PRIMARY KEY,                    -- 反馈记录唯一标识符，自增
  name TEXT,                                   -- 用户姓名（可选）
  email TEXT,                                  -- 用户邮箱（可选，用于回复）
  message TEXT NOT NULL,                       -- 反馈内容（必填）
  
  -- 系统记录字段
  ip_address TEXT,                            -- 提交者IP地址
  user_agent TEXT,                            -- 用户代理字符串
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 创建时间
  updated_at TIMESTAMPTZ DEFAULT NOW(),       -- 更新时间
  
  -- 处理状态
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processing', 'resolved', 'closed')), -- 处理状态
  admin_notes TEXT,                           -- 管理员备注
  resolved_at TIMESTAMPTZ,                    -- 解决时间
  resolved_by TEXT                            -- 处理人员
);

COMMENT ON TABLE public.feedback IS '用户反馈表，存储用户提交的意见建议和问题反馈';

-- 字段注释
COMMENT ON COLUMN public.feedback.id IS '反馈记录唯一标识符，自增主键';
COMMENT ON COLUMN public.feedback.name IS '用户姓名，可选字段';
COMMENT ON COLUMN public.feedback.email IS '用户邮箱地址，可选，用于后续沟通';
COMMENT ON COLUMN public.feedback.message IS '反馈内容，必填字段，限制2000字符';
COMMENT ON COLUMN public.feedback.ip_address IS '用户提交时的IP地址，用于分析和防刷';
COMMENT ON COLUMN public.feedback.user_agent IS '用户浏览器信息，用于技术分析';
COMMENT ON COLUMN public.feedback.created_at IS '反馈创建时间';
COMMENT ON COLUMN public.feedback.updated_at IS '反馈最后更新时间';
COMMENT ON COLUMN public.feedback.status IS '处理状态：new(新反馈), processing(处理中), resolved(已解决), closed(已关闭)';
COMMENT ON COLUMN public.feedback.admin_notes IS '管理员处理备注';
COMMENT ON COLUMN public.feedback.resolved_at IS '反馈解决时间';
COMMENT ON COLUMN public.feedback.resolved_by IS '处理反馈的管理员';

-- 创建索引
CREATE INDEX idx_feedback_status ON public.feedback(status);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX idx_feedback_email ON public.feedback(email) WHERE email IS NOT NULL;
CREATE INDEX idx_feedback_ip ON public.feedback(ip_address);

-- 为反馈表启用RLS（行级安全策略）
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS策略：只允许 service_role 用户访问反馈表
CREATE POLICY "Admins can manage all feedback"
  ON public.feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 创建自动更新 updated_at 字段的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器自动更新 updated_at 字段
CREATE TRIGGER trigger_update_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 添加消息长度约束
ALTER TABLE public.feedback 
ADD CONSTRAINT check_message_length 
CHECK (char_length(message) <= 2000);

-- 添加邮箱格式约束（简单版本）
ALTER TABLE public.feedback 
ADD CONSTRAINT check_email_format 
CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- 添加姓名长度约束
ALTER TABLE public.feedback 
ADD CONSTRAINT check_name_length 
CHECK (name IS NULL OR char_length(name) <= 100);
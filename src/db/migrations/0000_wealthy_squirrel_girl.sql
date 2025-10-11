CREATE TABLE "affiliates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "affiliates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_uuid" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"status" varchar(50) DEFAULT '' NOT NULL,
	"invited_by" varchar(255) NOT NULL,
	"paid_order_no" varchar(255) DEFAULT '' NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"reward_percent" integer DEFAULT 0 NOT NULL,
	"reward_amount" integer DEFAULT 0 NOT NULL
);
COMMENT ON TABLE "affiliates" IS "推广员信息表，用于记录用户邀请推广情况";
COMMENT ON COLUMN "affiliates"."id" IS "主键ID";
COMMENT ON COLUMN "affiliates"."user_uuid" IS "推广员的用户UUID";
COMMENT ON COLUMN "affiliates"."created_at" IS "记录创建时间";
COMMENT ON COLUMN "affiliates"."status" IS "推广员状态";
COMMENT ON COLUMN "affiliates"."invited_by" IS "邀请来源用户UUID";
COMMENT ON COLUMN "affiliates"."paid_order_no" IS "产生佣金的订单号";
COMMENT ON COLUMN "affiliates"."paid_amount" IS "与佣金关联的订单金额（单位：分）";
COMMENT ON COLUMN "affiliates"."reward_percent" IS "佣金比例（百分比数值）";
COMMENT ON COLUMN "affiliates"."reward_amount" IS "佣金金额（单位：分）";

--> statement-breakpoint
CREATE TABLE "apikeys" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "apikeys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"api_key" varchar(255) NOT NULL,
	"title" varchar(100),
	"user_uuid" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"status" varchar(50),
	CONSTRAINT "apikeys_api_key_unique" UNIQUE("api_key")
);
COMMENT ON TABLE "apikeys" IS "API Key表，保存用户创建的接口凭证";
COMMENT ON COLUMN "apikeys"."id" IS "主键ID";
COMMENT ON COLUMN "apikeys"."api_key" IS "API密钥";
COMMENT ON COLUMN "apikeys"."title" IS "密钥备注名称";
COMMENT ON COLUMN "apikeys"."user_uuid" IS "拥有该密钥的用户UUID";
COMMENT ON COLUMN "apikeys"."created_at" IS "密钥创建时间";
COMMENT ON COLUMN "apikeys"."status" IS "密钥状态";

--> statement-breakpoint
CREATE TABLE "credits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"trans_no" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"user_uuid" varchar(255) NOT NULL,
	"trans_type" varchar(50) NOT NULL,
	"credits" integer NOT NULL,
	"order_no" varchar(255),
	"expired_at" timestamp with time zone,
	CONSTRAINT "credits_trans_no_unique" UNIQUE("trans_no")
);
COMMENT ON TABLE "credits" IS "积分流水表，记录积分增减情况";
COMMENT ON COLUMN "credits"."id" IS "主键ID";
COMMENT ON COLUMN "credits"."trans_no" IS "积分交易流水号";
COMMENT ON COLUMN "credits"."created_at" IS "记录创建时间";
COMMENT ON COLUMN "credits"."user_uuid" IS "关联用户UUID";
COMMENT ON COLUMN "credits"."trans_type" IS "交易类型";
COMMENT ON COLUMN "credits"."credits" IS "积分变动数量";
COMMENT ON COLUMN "credits"."order_no" IS "关联订单号";
COMMENT ON COLUMN "credits"."expired_at" IS "积分过期时间";

--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "feedbacks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone,
	"status" varchar(50),
	"user_uuid" varchar(255),
	"content" text,
	"rating" integer
);
COMMENT ON TABLE "feedbacks" IS "用户反馈表";
COMMENT ON COLUMN "feedbacks"."id" IS "主键ID";
COMMENT ON COLUMN "feedbacks"."created_at" IS "反馈时间";
COMMENT ON COLUMN "feedbacks"."status" IS "处理状态";
COMMENT ON COLUMN "feedbacks"."user_uuid" IS "反馈用户UUID";
COMMENT ON COLUMN "feedbacks"."content" IS "反馈内容";
COMMENT ON COLUMN "feedbacks"."rating" IS "评分";

--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_no" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"user_uuid" varchar(255) DEFAULT '' NOT NULL,
	"user_email" varchar(255) DEFAULT '' NOT NULL,
	"amount" integer NOT NULL,
	"interval" varchar(50),
	"expired_at" timestamp with time zone,
	"status" varchar(50) NOT NULL,
	"stripe_session_id" varchar(255),
	"credits" integer NOT NULL,
	"currency" varchar(50),
	"sub_id" varchar(255),
	"sub_interval_count" integer,
	"sub_cycle_anchor" integer,
	"sub_period_end" integer,
	"sub_period_start" integer,
	"sub_times" integer,
	"product_id" varchar(255),
	"product_name" varchar(255),
	"valid_months" integer,
	"order_detail" text,
	"paid_at" timestamp with time zone,
	"paid_email" varchar(255),
	"paid_detail" text,
	CONSTRAINT "orders_order_no_unique" UNIQUE("order_no")
);
COMMENT ON TABLE "orders" IS "订单表，记录用户购买订阅和服务的订单信息";
COMMENT ON COLUMN "orders"."id" IS "主键ID";
COMMENT ON COLUMN "orders"."order_no" IS "订单编号（外部展示使用）";
COMMENT ON COLUMN "orders"."created_at" IS "订单创建时间";
COMMENT ON COLUMN "orders"."user_uuid" IS "下单用户UUID";
COMMENT ON COLUMN "orders"."user_email" IS "下单时的用户邮箱";
COMMENT ON COLUMN "orders"."amount" IS "订单金额（单位：分）";
COMMENT ON COLUMN "orders"."interval" IS "计费周期标识（月、年、一次性等）";
COMMENT ON COLUMN "orders"."expired_at" IS "与订单权益对应的到期时间";
COMMENT ON COLUMN "orders"."status" IS "订单状态";
COMMENT ON COLUMN "orders"."stripe_session_id" IS "Stripe Checkout Session ID";
COMMENT ON COLUMN "orders"."credits" IS "随订单发放的积分数量";
COMMENT ON COLUMN "orders"."currency" IS "币种代码";
COMMENT ON COLUMN "orders"."sub_id" IS "Stripe订阅ID";
COMMENT ON COLUMN "orders"."sub_interval_count" IS "订阅账单周期长度";
COMMENT ON COLUMN "orders"."sub_cycle_anchor" IS "订阅账单锚点（时间戳）";
COMMENT ON COLUMN "orders"."sub_period_end" IS "订阅周期结束时间（时间戳）";
COMMENT ON COLUMN "orders"."sub_period_start" IS "订阅周期开始时间（时间戳）";
COMMENT ON COLUMN "orders"."sub_times" IS "订阅扣费次数";
COMMENT ON COLUMN "orders"."product_id" IS "产品ID（价格或商品标识）";
COMMENT ON COLUMN "orders"."product_name" IS "产品名称快照";
COMMENT ON COLUMN "orders"."valid_months" IS "订单权益有效月数";
COMMENT ON COLUMN "orders"."order_detail" IS "订单详情JSON";
COMMENT ON COLUMN "orders"."paid_at" IS "支付完成时间";
COMMENT ON COLUMN "orders"."paid_email" IS "支付邮箱";
COMMENT ON COLUMN "orders"."paid_detail" IS "支付明细JSON";

--> statement-breakpoint
CREATE TABLE "posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"slug" varchar(255),
	"title" varchar(255),
	"description" text,
	"content" text,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"status" varchar(50),
	"cover_url" varchar(255),
	"author_name" varchar(255),
	"author_avatar_url" varchar(255),
	"locale" varchar(50),
	CONSTRAINT "posts_uuid_unique" UNIQUE("uuid")
);
COMMENT ON TABLE "posts" IS "文章表，用于保存博客或文档内容";
COMMENT ON COLUMN "posts"."id" IS "主键ID";
COMMENT ON COLUMN "posts"."uuid" IS "文章UUID";
COMMENT ON COLUMN "posts"."slug" IS "文章短链接";
COMMENT ON COLUMN "posts"."title" IS "标题";
COMMENT ON COLUMN "posts"."description" IS "摘要";
COMMENT ON COLUMN "posts"."content" IS "正文内容";
COMMENT ON COLUMN "posts"."created_at" IS "创建时间";
COMMENT ON COLUMN "posts"."updated_at" IS "更新时间";
COMMENT ON COLUMN "posts"."status" IS "发布状态";
COMMENT ON COLUMN "posts"."cover_url" IS "封面图片地址";
COMMENT ON COLUMN "posts"."author_name" IS "作者名称";
COMMENT ON COLUMN "posts"."author_avatar_url" IS "作者头像URL";
COMMENT ON COLUMN "posts"."locale" IS "语言标识";

--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"nickname" varchar(255),
	"avatar_url" varchar(255),
	"locale" varchar(50),
	"signin_type" varchar(50),
	"signin_ip" varchar(255),
	"signin_provider" varchar(50),
	"signin_openid" varchar(255),
	"invite_code" varchar(255) DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone,
	"invited_by" varchar(255) DEFAULT '' NOT NULL,
	"is_affiliate" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_uuid_unique" UNIQUE("uuid")
);
COMMENT ON TABLE "users" IS "用户表";
COMMENT ON COLUMN "users"."id" IS "主键ID";
COMMENT ON COLUMN "users"."uuid" IS "用户UUID";
COMMENT ON COLUMN "users"."email" IS "邮箱地址";
COMMENT ON COLUMN "users"."created_at" IS "注册时间";
COMMENT ON COLUMN "users"."nickname" IS "昵称";
COMMENT ON COLUMN "users"."avatar_url" IS "头像URL";
COMMENT ON COLUMN "users"."locale" IS "语言偏好";
COMMENT ON COLUMN "users"."signin_type" IS "登录类型";
COMMENT ON COLUMN "users"."signin_ip" IS "最近登录IP";
COMMENT ON COLUMN "users"."signin_provider" IS "第三方登录提供商标识";
COMMENT ON COLUMN "users"."signin_openid" IS "第三方登录OpenID";
COMMENT ON COLUMN "users"."invite_code" IS "用户邀请码";
COMMENT ON COLUMN "users"."updated_at" IS "更新时间";
COMMENT ON COLUMN "users"."invited_by" IS "邀请人UUID";
COMMENT ON COLUMN "users"."is_affiliate" IS "是否为推广员";

--> statement-breakpoint
CREATE UNIQUE INDEX "email_provider_unique_idx" ON "users" USING btree ("email","signin_provider");

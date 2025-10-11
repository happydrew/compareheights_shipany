// 项目相关类型定义

import { Character } from './characters';

// 项目数据结构 - 存储在 project_data JSONB 字段中
export interface ProjectData {
  // 比对角色列表
  characters: Array<{
    id: string;
    name: string;
    height: number;
    cat_ids?: number[];
    media_type: 'svg' | 'image';
    media_url: string;
    thumbnail_url: string;
    color: string;
    color_customizable: boolean;
    color_property: string | null;
    order: number;
    visible: boolean;
  }>;

  // 图表设置
  settings: {
    unit: 'cm' | 'ft-in';
    chartTitle: string;
    backgroundColor: string;
    backgroundImage?: string;
    gridLines: boolean;
    labels: boolean;
    shadows: boolean;
    theme: 'light' | 'dark';
    chartHeight: number;
    spacing: number;
  };

  // 元数据
  metadata: {
    version: string;
    characterCount: number;
  };
}

// 数据库中的项目记录
export interface Project {
  id: number;
  uuid: string;
  user_uuid: string;
  title: string;
  thumbnail_url: string | null;
  project_data: ProjectData;
  is_public: boolean;
  view_count: number;
  created_at: Date;
  updated_at: Date;
  status: 'active' | 'deleted';
}

// 项目列表项 (用于列表页展示)
export interface ProjectListItem {
  uuid: string;
  title: string;
  thumbnail_url: string | null;
  is_public: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  character_count: number;
}

// 创建项目请求
export interface CreateProjectRequest {
  title: string;
  project_data: ProjectData;
}

// 更新项目请求
export interface UpdateProjectRequest {
  title?: string;
  project_data?: ProjectData;
  thumbnail_url?: string;
  is_public?: boolean;
}

// 项目查询参数
export interface ProjectQueryParams {
  page?: number;
  limit?: number;
  sort?: 'recent' | 'name' | 'views';
  search?: string;
}

// API响应类型
export interface ProjectsResponse {
  success: boolean;
  data: {
    projects: ProjectListItem[];
    total: number;
  };
  message?: string;
}

export interface ProjectResponse {
  success: boolean;
  data: Project;
  message?: string;
}

export interface CreateProjectResponse {
  success: boolean;
  data: {
    uuid: string;
  };
  message?: string;
}

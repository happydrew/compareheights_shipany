import { supabaseAdmin, TABLES } from '@/lib/supabase_service';
import { NextRequest, NextResponse } from 'next/server';
import { type Character } from '@/lib/types/characters';

// export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // 获取客户端IP
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
    console.log(`queryCharacters request ip: ${clientIp}`);

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log(`queryCharacters params: category_id=${categoryId}, search=${search}, limit=${limit}, offset=${offset}`);

    // 构建查询
    let query = supabaseAdmin
      .from(TABLES.CHARACTERS)
      .select('*')

    // 按分类过滤 - 使用数组包含查询
    if (categoryId && categoryId !== 'all') {
      const catId = parseInt(categoryId);
      if (!isNaN(catId) && catId !== 0) {
        query = query.contains('cat_ids', [catId]);
      }
    }

    // 按搜索词过滤 (名称)
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // 添加排序和分页 - 按照数据库注释中的排序规则
    query = query
      .order('cat_ids', { ascending: true }) // 按分类路径长度排序（父目录优先）
      .order('order_num', { ascending: true }) // 按自定义排序
      .order('name', { ascending: true }) // 按名称排序
      .range(offset, offset + limit - 1);

    // 执行查询
    const { data: charactersData, error: charactersError, count } = await query;

    if (charactersError) {
      console.error('Query characters error:', charactersError);
      throw charactersError;
    }

    if (!charactersData) {
      console.log('No characters data found');
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        message: '未找到角色'
      }, { status: 200 });
    }

    // 转换数据格式
    const characters: Character[] = charactersData;

    // 获取总数（如果需要分页信息）
    let totalCount = count || charactersData.length;
    if (offset === 0 && charactersData.length < limit) {
      // 如果是第一页且返回数据少于限制，则总数就是返回的数量
      totalCount = charactersData.length;
    } else {
      // 否则需要单独查询总数
      let countQuery = supabaseAdmin
        .from(TABLES.CHARACTERS)
        .select('*', { count: 'exact', head: true })

      if (categoryId && categoryId !== 'all') {
        const catId = parseInt(categoryId);
        if (!isNaN(catId) && catId !== 0) {
          countQuery = countQuery.contains('cat_ids', [catId]);
        }
      }
      if (search) {
        countQuery = countQuery.ilike('name', `%${search}%`);
      }

      const { count: exactCount } = await countQuery;
      totalCount = exactCount || 0;
    }

    console.log(`queryCharacters result: found ${characters.length} characters, total: ${totalCount}`);

    return NextResponse.json({
      success: true,
      data: characters,
      total: totalCount,
      message: '角色检索成功'
    }, { status: 200 });

  } catch (error) {
    console.error('queryCharacters error:', error);
    return NextResponse.json({
      success: false,
      error: '查询角色失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
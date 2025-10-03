import { supabaseAdmin, TABLES } from '@/lib/supabase_service';
import { NextRequest, NextResponse } from 'next/server';
import { type Character } from '@/lib/types/characters';

// export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    // 获取客户端IP
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
    console.log(`queryCharactersByIds request ip: ${clientIp}`);

    // 解析请求体
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: '无效的角色ID列表',
        message: 'ids参数必须是非空数组'
      }, { status: 400 });
    }

    // 验证ID格式（防止注入攻击）
    const validIds = ids.filter(id => typeof id === 'string' && id.length > 0);
    if (validIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: '无效的角色ID格式',
        message: '所有ID必须是非空字符串'
      }, { status: 400 });
    }

    console.log(`queryCharactersByIds params: ids=${validIds.join(', ')}`);

    // 构建查询 - 使用 IN 查询批量获取角色
    const { data: charactersData, error: charactersError } = await supabaseAdmin
      .from(TABLES.CHARACTERS)
      .select('*')
      .in('id', validIds);

    if (charactersError) {
      console.error('Query characters by ids error:', charactersError);
      throw charactersError;
    }

    if (!charactersData) {
      console.log('No characters data found for ids:', validIds);
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        message: '未找到角色'
      }, { status: 200 });
    }

    // 转换数据格式
    const characters: Character[] = charactersData

    // 按照输入的ID顺序重新排序结果
    const orderedCharacters: Character[] = [];
    validIds.forEach(id => {
      const character = characters.find(char => char.id === id);
      if (character) {
        orderedCharacters.push(character);
      }
    });

    console.log(`queryCharactersByIds result: found ${orderedCharacters.length} characters out of ${validIds.length} requested`);

    return NextResponse.json({
      success: true,
      data: orderedCharacters,
      total: orderedCharacters.length,
      message: '角色批量检索成功'
    }, { status: 200 });

  } catch (error) {
    console.error('queryCharactersByIds error:', error);
    return NextResponse.json({
      success: false,
      error: '批量查询角色失败',
      message: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
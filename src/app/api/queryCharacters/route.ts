import { supabaseAdmin, TABLES } from '@/lib/supabase_service';
import { getUserInfo } from '@/services/user';
import { NextRequest, NextResponse } from 'next/server';
import { type Character } from '@/lib/types/characters';

// export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // 鑾峰彇瀹㈡埛绔疘P
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
    console.log(`queryCharacters request ip: ${clientIp}`);

    // 瑙ｆ瀽鏌ヨ鍙傛暟
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log(`queryCharacters params: category_id=${categoryId}, search=${search}, limit=${limit}, offset=${offset}`);

    // 鏋勫缓鏌ヨ
    let currentUserUuid: string | null = null;
    try {
      const userInfo = await getUserInfo();
      if (userInfo?.uuid) {
        currentUserUuid = userInfo.uuid;
      }
    } catch (resolveUserError) {
      console.warn('queryCharacters: failed to resolve user info', resolveUserError);
    }

    const visibilityFilters = ['character_type.eq.public'];
    if (currentUserUuid) {
      visibilityFilters.push('and(character_type.eq.custom,user_uuid.eq.' + currentUserUuid + ')');
    }

    let query = supabaseAdmin
      .from(TABLES.CHARACTERS)
      .select('*')

    query = query.or(visibilityFilters.join(','));

    // 鎸夊垎绫昏繃婊?- 浣跨敤鏁扮粍鍖呭惈鏌ヨ
    if (categoryId && categoryId !== 'all') {
      const catId = parseInt(categoryId);
      if (!isNaN(catId) && catId !== 0) {
        query = query.contains('cat_ids', [catId]);
      }
    }

    // 鎸夋悳绱㈣瘝杩囨护 (鍚嶇О)
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // 娣诲姞鎺掑簭鍜屽垎椤?- 鎸夌収鏁版嵁搴撴敞閲婁腑鐨勬帓搴忚鍒?
    query = query
      .order('cat_ids', { ascending: true }) // 鎸夊垎绫昏矾寰勯暱搴︽帓搴忥紙鐖剁洰褰曚紭鍏堬級
      .order('order_num', { ascending: true }) // 鎸夎嚜瀹氫箟鎺掑簭
      .order('name', { ascending: true }) // 鎸夊悕绉版帓搴?
      .range(offset, offset + limit - 1);

    // 鎵ц鏌ヨ
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

        message: 'No characters found'

      }, { status: 200 });

    }


    // 杞崲鏁版嵁鏍煎紡
    const characters: Character[] = charactersData;

    // 鑾峰彇鎬绘暟锛堝鏋滈渶瑕佸垎椤典俊鎭級
    let totalCount = count || charactersData.length;
    if (offset === 0 && charactersData.length < limit) {
      // 濡傛灉鏄涓€椤典笖杩斿洖鏁版嵁灏戜簬闄愬埗锛屽垯鎬绘暟灏辨槸杩斿洖鐨勬暟閲?
      totalCount = charactersData.length;
    } else {
      // 鍚﹀垯闇€瑕佸崟鐙煡璇㈡€绘暟
      let countQuery = supabaseAdmin
        .from(TABLES.CHARACTERS)
        .select('*', { count: 'exact', head: true })

      countQuery = countQuery.or(visibilityFilters.join(','));

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
      message: 'Characters fetched successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('queryCharacters error:', error);
    return NextResponse.json({
      error: 'Failed to query characters',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


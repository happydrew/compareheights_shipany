import { supabaseAdmin, TABLES } from '@/lib/supabase_service';
import { getUserInfo } from '@/services/user';
import { NextRequest, NextResponse } from 'next/server';
import { type Character } from '@/lib/types/characters';

export async function POST(request: NextRequest) {
  try {

    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
    console.log(`queryCharactersByIds request ip: ${clientIp}`);

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid character id list',
        message: 'ids must be a non-empty array'
      }, { status: 400 });
    }

    const validIds = ids.filter(id => typeof id === 'string' && id.length > 0);
    if (validIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid character id format',
        message: 'All ids must be non-empty strings'
      }, { status: 400 });
    }

    console.log(`queryCharactersByIds params: ids=${validIds.join(', ')}`);

    let currentUserUuid: string | null = null;
    try {
      const userInfo = await getUserInfo();
      if (userInfo?.uuid) {
        currentUserUuid = userInfo.uuid;
      }
    } catch (resolveUserError) {
      console.warn('queryCharactersByIds: failed to resolve user info', resolveUserError);
    }
    const visibilityFilters = ['character_type.eq.public'];
    if (currentUserUuid) {
      visibilityFilters.push('and(character_type.eq.custom,user_uuid.eq.' + currentUserUuid + ')');
    }

    let query = supabaseAdmin
      .from(TABLES.CHARACTERS)
      .select('*');

    query = query.or(visibilityFilters.join(','));
    query = query.in('id', validIds);

    const { data: charactersData, error: charactersError } = await query;

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
        message: 'No characters found'
      }, { status: 200 });
    }

    const characters: Character[] = charactersData;

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
      message: 'Characters retrieved successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('queryCharactersByIds error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to query characters by ids',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

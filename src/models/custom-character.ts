import { supabaseAdmin, TABLES } from '@/lib/supabase_service';
import { type Character } from '@/lib/types/characters';
import {
  CUSTOM_CHARACTER_CATEGORY_ID,
  CUSTOM_CHARACTER_DEFAULT_ORDER,
} from '@/lib/constants/customCharacters';
import type { PostgrestError } from '@supabase/supabase-js';

const CUSTOM_CHARACTER_TYPE = 'custom';
const DEFAULT_CAT_IDS = [0, CUSTOM_CHARACTER_CATEGORY_ID];

export interface CustomCharacterPayload {
  id: string;
  name: string;
  height: number;
  media_url: string;
  thumbnail_url: string;
  media_hash?: string | null;
  color?: string | null;
  color_customizable?: boolean;
  color_property?: string | null;
  order_num?: number;
  cat_ids?: number[];
}

function normaliseCatIds(catIds?: number[]): number[] {
  if (!catIds || catIds.length === 0) {
    return [...DEFAULT_CAT_IDS];
  }
  if (!catIds.includes(CUSTOM_CHARACTER_CATEGORY_ID)) {
    return [...DEFAULT_CAT_IDS];
  }
  return [...new Set(catIds)];
}

export async function createCustomCharacterRecord(
  userUuid: string,
  payload: CustomCharacterPayload
): Promise<Character> {
  const insertPayload = {
    id: payload.id,
    name: payload.name,
    height: payload.height,
    media_type: 'image' as const,
    media_url: payload.media_url,
    thumbnail_url: payload.thumbnail_url,
    color: payload.color ?? null,
    color_customizable: payload.color_customizable ?? false,
    color_property: payload.color_property ?? null,
    order_num: payload.order_num ?? CUSTOM_CHARACTER_DEFAULT_ORDER,
    cat_ids: normaliseCatIds(payload.cat_ids),
    character_type: CUSTOM_CHARACTER_TYPE,
    user_uuid: userUuid,
  };

  const { data, error } = await supabaseAdmin
    .from(TABLES.CHARACTERS)
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create custom character: ${error.message}`);
  }

  return data as Character;
}


export async function customCharacterNameExists(
  userUuid: string,
  name: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.CHARACTERS)
    .select('id')
    .eq('character_type', CUSTOM_CHARACTER_TYPE)
    .eq('user_uuid', userUuid)
    .ilike('name', name)
    .limit(1)
    .maybeSingle();

  if (error) {
    const postgrestError = error as PostgrestError;
    if (postgrestError.code === 'PGRST116') {
      return true;
    }
    throw new Error(`Failed to check custom character name: ${error.message}`);
  }

  return Boolean(data);
}

export async function listCustomCharacters(
  userUuid: string,
  options: { search?: string } = {}
): Promise<Character[]> {
  let query = supabaseAdmin
    .from(TABLES.CHARACTERS)
    .select('*')
    .eq('character_type', CUSTOM_CHARACTER_TYPE)
    .eq('user_uuid', userUuid)
    .order('order_num', { ascending: false })
    .order('name', { ascending: true });

  if (options.search) {
    query = query.ilike('name', `%${options.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list custom characters: ${error.message}`);
  }

  return (data || []) as Character[];
}

export async function findCustomCharacterById(
  userUuid: string,
  characterId: string
): Promise<Character | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.CHARACTERS)
    .select('*')
    .eq('character_type', CUSTOM_CHARACTER_TYPE)
    .eq('user_uuid', userUuid)
    .eq('id', characterId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch custom character: ${error.message}`);
  }

  return (data as Character) || null;
}

export async function updateCustomCharacterRecord(
  userUuid: string,
  characterId: string,
  updates: Partial<CustomCharacterPayload>
): Promise<Character> {
  const updatePayload: Record<string, unknown> = {};

  if (typeof updates.name === 'string') {
    updatePayload.name = updates.name;
  }
  if (typeof updates.height === 'number') {
    updatePayload.height = updates.height;
  }
  if (typeof updates.media_url === 'string') {
    updatePayload.media_url = updates.media_url;
  }
  if (typeof updates.thumbnail_url === 'string') {
    updatePayload.thumbnail_url = updates.thumbnail_url;
  }
  if (updates.media_hash !== undefined) {
    updatePayload.media_hash = updates.media_hash;
  }
  if (updates.color !== undefined) {
    updatePayload.color = updates.color;
  }
  if (updates.color_customizable !== undefined) {
    updatePayload.color_customizable = updates.color_customizable;
  }
  if (updates.color_property !== undefined) {
    updatePayload.color_property = updates.color_property;
  }
  if (updates.order_num !== undefined) {
    updatePayload.order_num = updates.order_num;
  }
  if (updates.cat_ids) {
    updatePayload.cat_ids = normaliseCatIds(updates.cat_ids);
  }

  if (Object.keys(updatePayload).length === 0) {
    const existing = await findCustomCharacterById(userUuid, characterId);
    if (!existing) {
      throw new Error('Custom character not found');
    }
    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from(TABLES.CHARACTERS)
    .update(updatePayload)
    .eq('character_type', CUSTOM_CHARACTER_TYPE)
    .eq('user_uuid', userUuid)
    .eq('id', characterId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update custom character: ${error.message}`);
  }

  return data as Character;
}

export async function countCustomCharactersByUserUuid(userUuid: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from(TABLES.CHARACTERS)
    .select('id', { count: 'exact', head: true })
    .eq('character_type', CUSTOM_CHARACTER_TYPE)
    .eq('user_uuid', userUuid);

  if (error) {
    throw new Error(`Failed to count custom characters: ${error.message}`);
  }

  return count ?? 0;
}

export async function deleteCustomCharacterRecord(
  userUuid: string,
  characterId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLES.CHARACTERS)
    .delete()
    .eq('character_type', CUSTOM_CHARACTER_TYPE)
    .eq('user_uuid', userUuid)
    .eq('id', characterId);

  if (error) {
    throw new Error(`Failed to delete custom character: ${error.message}`);
  }
}

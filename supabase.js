const SUPABASE_URL = 'https://hzfnrtcgmbvkffujluab.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_0C1cC-if_W26nwcbiTJMyg_dtOKz6Ke';
let clientPromise;

export function assertFavoriteRecord(record) {
  if (!record?.chave_atleta || !record?.nome || !record?.equipe) {
    throw new TypeError('Favorito precisa de chave_atleta, nome e equipe.');
  }
  return record;
}

export function assertFavoriteId(id) {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError('Identificador de favorito inválido.');
  }
  return value;
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY));
  }
  return clientPromise;
}

export async function listFavorites() {
  const client = await getClient();
  const { data, error } = await client
    .from('favoritos')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createFavorite(record) {
  const client = await getClient();
  const { data, error } = await client
    .from('favoritos')
    .insert(assertFavoriteRecord(record))
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFavorite(id) {
  const client = await getClient();
  const { error } = await client
    .from('favoritos')
    .delete()
    .eq('id', assertFavoriteId(id));
  if (error) throw error;
}

import { getSupabaseBrowserClient } from './supabase/client';
import type { Database } from './supabase/types';

type TodoInsert = Database['public']['Tables']['todos']['Insert'];
type TodoUpdate = Database['public']['Tables']['todos']['Update'];

export async function createTodo(
  insert: Omit<TodoInsert, 'created_by'> & { created_by?: string }
) {
  const client = getSupabaseBrowserClient();
  let createdBy = insert.created_by;

  if (!createdBy) {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (user) {
      createdBy = user.id;
    }
  }

  if (!createdBy) {
    throw new Error('User must be authenticated to create a todo');
  }

  const { data, error } = await client
    .from('todos')
    .insert({ ...insert, created_by: createdBy })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTodo(todoId: string, update: TodoUpdate) {
  const { data, error } = await getSupabaseBrowserClient()
    .from('todos')
    .update(update)
    .eq('id', todoId)
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteTodo(todoId: string) {
  const { error } = await getSupabaseBrowserClient()
    .from('todos')
    .delete()
    .eq('id', todoId);

  if (error) {
    throw error;
  }
}

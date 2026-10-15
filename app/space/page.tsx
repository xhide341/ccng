import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '../lib/supabase/server';
import { SpaceDashboard } from '../components/space-dashboard';
import { SpaceOnboarding } from '../components/space-onboarding';
import { DEMO_COOKIE_NAME } from '../lib/auth';
import { getDailyEntry } from '../lib/daily-content';
import { getDailyRecap } from '../lib/recap';
import { getCalendarEventsAction } from '../lib/actions/calendar';

type SpacePageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SpacePage({ searchParams }: SpacePageProps) {
  const params = await searchParams;
  const codeParam = typeof params.code === 'string' ? params.code : undefined;

  const cookieStore = await cookies();
  const isDemo = cookieStore.get(DEMO_COOKIE_NAME)?.value === 'true';

  const dailyEntry = await getDailyEntry();

  if (isDemo) {
    const demoEvents = await getCalendarEventsAction(true);
    const demoRecap = await getDailyRecap({ isDemo: true });
    return (
      <SpaceDashboard
        code={codeParam}
        userEmail="mara@ccng.app"
        userName="Mara"
        userFullName="Mara Jensen"
        initialCalendarEvents={demoEvents}
        isDemo={true}
        dailyEntry={dailyEntry}
        initialRecap={demoRecap}
      />
    );
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const userEmail = user.email;

  const firstName =
    user.user_metadata?.given_name ||
    user.user_metadata?.full_name?.split(' ')[0] ||
    user.email?.split('@')[0] ||
    'User';

  const userFullName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    firstName;

  const userAvatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ||
    (user.user_metadata?.picture as string | undefined) ||
    undefined;

  const { data: space } = await supabase
    .from('spaces')
    .select('id, user_1, user_2, code, discord_webhook_url')
    .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
    .maybeSingle();

  if (!space) {
    return (
      <SpaceOnboarding
        userEmail={userEmail}
        userName={firstName}
        userFullName={userFullName}
        userAvatarUrl={userAvatarUrl}
        initialCode={codeParam}
      />
    );
  }

  const isSolo = space.user_2 === null;
  const isUser1 = user.id === space.user_1;
  const activeCode = space.code || codeParam;

  let partnerName: string | undefined;
  let partnerId: string | undefined;
  let partnerAvatarUrl: string | undefined;

  if (!isSolo) {
    try {
      const { data: partnerData } = await supabase.rpc('get_space_partner', {
        p_space_id: space.id,
      });

      if (partnerData && typeof partnerData === 'object') {
        const p = partnerData as {
          display_name?: unknown;
          id?: unknown;
          avatar_url?: unknown;
        };
        if (typeof p.display_name === 'string') {
          partnerName = p.display_name;
        }
        if (typeof p.id === 'string') {
          partnerId = p.id;
        }
        if (typeof p.avatar_url === 'string') {
          partnerAvatarUrl = p.avatar_url;
        }
      }
    } catch {
      partnerName = undefined;
      partnerId = undefined;
      partnerAvatarUrl = undefined;
    }
  }



  const initialRecap = await getDailyRecap({
    spaceId: space.id,
    userName: firstName,
    partnerName,
    isDemo: false,
    userId: user.id,
  });

  // Parallelize remaining independent space data queries
  const [
    todosResult,
    initialCalendarEvents,
    hasGoogleCalendarResult,
    activitiesResult,
    noteResult,
  ] = await Promise.all([
    supabase
      .from('todos')
      .select('*')
      .eq('space_id', space.id)
      .order('created_at', { ascending: false }),
    getCalendarEventsAction(false),
    Promise.resolve(
      supabase
        .from('user_google_tokens')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
    )
      .then((res) => !!res.data)
      .catch(() => false),
    supabase
      .from('activities')
      .select('*')
      .eq('space_id', space.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('space_notes')
      .select('*')
      .eq('space_id', space.id)
      .maybeSingle(),
  ]);

  const dbTodos = todosResult.data;
  const initialTodos = (dbTodos || []).map((row) => ({
    id: row.id,
    title: row.title,
    tag: row.tag,
    assignee: row.assignee_user_id
      ? row.assignee_user_id === user.id
        ? firstName
        : partnerName || 'Partner'
      : 'Both',
    priority: row.priority,
    completed: row.completed,
  }));

  const hasGoogleCalendar = hasGoogleCalendarResult;

  const dbActivities = activitiesResult.data;
  const initialActivities = (dbActivities || []).map((row) => ({
    id: row.id,
    space_id: row.space_id,
    actor_id: row.actor_id,
    kind: row.kind as import('../lib/activity-types').ActivityKind,
    payload:
      (row.payload as import('../lib/activity-types').ActivityPayload) || {},
    created_at: row.created_at,
  }));

  const dbNote = noteResult.data;
  const initialNote = dbNote
    ? {
        content: dbNote.content,
        authorId: dbNote.author_id,
        updatedAt: dbNote.updated_at,
      }
    : null;

  return (
    <SpaceDashboard
      spaceId={space.id}
      userId={user.id}
      partnerId={partnerId}
      isSolo={isSolo}
      isUser1={isUser1}
      code={activeCode}
      userEmail={userEmail}
      userName={firstName}
      userFullName={userFullName}
      partnerName={partnerName}
      userAvatarUrl={userAvatarUrl}
      partnerAvatarUrl={partnerAvatarUrl}
      initialTodos={initialTodos}
      initialCalendarEvents={initialCalendarEvents}
      hasGoogleCalendar={hasGoogleCalendar}
      isDemo={false}
      dailyEntry={dailyEntry}
      initialActivities={initialActivities}
      initialNote={initialNote}
      initialRecap={initialRecap}
      initialDiscordWebhookUrl={space.discord_webhook_url}
    />
  );
}

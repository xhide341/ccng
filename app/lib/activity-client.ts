import { ActivityKind, ActivityPayload } from './activity-types';
import { logActivityAction } from './actions/activity';

export async function logBrowserActivity({
  spaceId,
  kind,
  payload,
}: {
  spaceId: string;
  kind: ActivityKind;
  payload: ActivityPayload;
}) {
  try {
    await logActivityAction({
      spaceId,
      kind,
      payload,
    });
  } catch (err) {
    console.warn('Failed to log browser activity:', err);
  }
}

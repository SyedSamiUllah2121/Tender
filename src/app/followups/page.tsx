import type {Metadata} from 'next';
import {FollowUpsView} from '../../views/FollowUpsView';

export const metadata: Metadata = {title: 'Follow-ups Worklist'};

export default function FollowUpsPage() {
  return <FollowUpsView />;
}

import type {Metadata} from 'next';
import {AwardedView} from '../../../views/AwardedView';

export const metadata: Metadata = {title: 'Awarded Projects'};

export default function AwardedPage() {
  return <AwardedView />;
}

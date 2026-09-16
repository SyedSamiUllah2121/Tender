import type {Metadata} from 'next';
import {AdminSourcesView} from '../../../../views/AdminSourcesView';

export const metadata: Metadata = {title: 'Lead Sources'};

export default function AdminSourcesPage() {
  return <AdminSourcesView />;
}

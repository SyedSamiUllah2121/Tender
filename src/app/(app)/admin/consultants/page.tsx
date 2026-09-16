import type {Metadata} from 'next';
import {AdminConsultantsView} from '../../../../views/AdminConsultantsView';

export const metadata: Metadata = {title: 'Consultants Directory'};

export default function AdminConsultantsPage() {
  return <AdminConsultantsView />;
}

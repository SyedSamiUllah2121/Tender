import type {Metadata} from 'next';
import {AdminImportView} from '../../../views/AdminImportView';

export const metadata: Metadata = {title: 'Excel Migration'};

export default function AdminImportPage() {
  return <AdminImportView />;
}

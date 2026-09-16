import type {Metadata} from 'next';
import {AdminUsersView} from '../../../../views/AdminUsersView';

export const metadata: Metadata = {title: 'Team & Permissions'};

export default function AdminUsersPage() {
  return <AdminUsersView />;
}

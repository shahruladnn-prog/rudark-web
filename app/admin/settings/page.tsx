import { getSettings } from '@/actions/settings-actions';
import SettingsForm from '@/components/admin/settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const settings = await getSettings();

    return (
        <SettingsForm initialData={settings} />
    );
}

// Analytics Page Route - AURA Integration

import { AuraAnalyticsPage } from '../components/aura/AuraAnalyticsPage';

export const metadata = {
  title: 'AURA Analytics | Self-Evolution Dashboard',
  description: 'Track discipline, momentum, and personal evolution with AURA - the luxury self-evolution operating system.',
};

export default function AnalyticsPage() {
  return <AuraAnalyticsPage isDarkMode={true} />;
}

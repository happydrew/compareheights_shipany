// Tab导航组件（专门为左侧面板设计）

import React from 'react';
import { Users, Library } from 'lucide-react';
import { TabPanel, TabItem } from '../ui/TabPanel';
import { useTranslations } from 'next-intl';

interface TabNavigationProps {
  activeTab: 'characters' | 'library';
  onTabChange: (tab: 'characters' | 'library') => void;
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  className = ''
}) => {
  const t = useTranslations('compareheights.tabs');

  const tabs: TabItem[] = [
    {
      key: 'characters',
      label: t('characters'),
      icon: <Users className="w-4 h-4" />
    },
    {
      key: 'library',
      label: t('library'),
      icon: <Library className="w-4 h-4" />
    }
  ];

  const handleTabChange = (tabKey: string) => {
    onTabChange(tabKey as 'characters' | 'library');
  };

  return (
    <TabPanel
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      variant="default"
      size="md"
      fullWidth
      className={className}
    />
  );
};
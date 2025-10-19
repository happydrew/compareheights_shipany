'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link as I18nLink } from '@/i18n/navigation';

const BANNER_STORAGE_KEY = 'announcementBannerDismissed';

export const AnnouncementBanner: React.FC = () => {
  const t = useTranslations('announcement.banner');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    const isDismissed = localStorage.getItem(BANNER_STORAGE_KEY);
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="sticky top-0 z-50 w-full bg-gradient-to-r from-green-theme-600 to-green-theme-700 text-white shadow-md"
        >
          <div className="container mx-auto px-4 !py-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 flex items-center justify-center gap-3">
                <p className="text-sm font-medium text-center">
                  {t('message')}
                </p>
                <I18nLink
                  href="/docs/projects"
                  className="text-xs md:text-sm font-semibold underline hover:no-underline whitespace-nowrap"
                >
                  {t('learn_more')}
                </I18nLink>

                {/* <button
                  onClick={() => {
                    const modal = document.querySelector('[data-announcement-modal]');
                    if (modal) {
                      (modal as HTMLElement).click();
                    }
                  }}
                  className="text-xs md:text-sm font-semibold underline hover:no-underline whitespace-nowrap"
                >
                  {t('learn_more')}
                </button> */}
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded-md transition-colors"
                aria-label="Dismiss announcement"
                title="Dismiss"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

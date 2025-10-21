'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Save, User } from 'lucide-react';

const MODAL_STORAGE_KEY = 'announcementModalDismissed';
const MODAL_DELAY = 2000; // 2 seconds delay after page load

export const AnnouncementModal: React.FC = () => {
  const t = useTranslations('announcement.modal');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if modal was previously dismissed
    const isDismissed = localStorage.getItem(MODAL_STORAGE_KEY);

    if (!isDismissed) {
      // Show modal after delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, MODAL_DELAY);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDontShowAgain = () => {
    localStorage.setItem(MODAL_STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const handleGotIt = () => {
    localStorage.setItem(MODAL_STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  return (
    <>
      {/* Hidden trigger for banner to open modal */}
      <button
        data-announcement-modal
        onClick={() => setIsOpen(true)}
        className="hidden"
        aria-hidden="true"
      />

      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <AnimatePresence>
          {isOpen && (
            <Dialog.Portal forceMount>
              {/* Overlay */}
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/50 z-50"
                />
              </Dialog.Overlay>

              {/* Content */}
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[95vw] md:max-w-md"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-green-theme-600 to-green-theme-700 px-6 py-6 text-white">
                      <Dialog.Close asChild>
                        <button
                          className="absolute right-4 top-4 p-1 hover:bg-white/20 rounded-md transition-colors"
                          aria-label="Close"
                        >
                          <X size={20} />
                        </button>
                      </Dialog.Close>

                      <Dialog.Title className="text-2xl font-bold pr-8">
                        {t('title')}
                      </Dialog.Title>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-6 space-y-5">
                      {/* Feature 1: Save as Projects */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-green-theme-100 dark:bg-green-theme-900 rounded-lg flex items-center justify-center">
                          <Save className="text-green-theme-600 dark:text-green-theme-400" size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {t('feature1_title')}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('feature1_desc')}
                          </p>
                        </div>
                      </div>

                      {/* Feature 2: Custom Characters */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-green-theme-100 dark:bg-green-theme-900 rounded-lg flex items-center justify-center">
                          <User className="text-green-theme-600 dark:text-green-theme-400" size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {t('feature2_title')}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('feature2_desc')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex gap-3 justify-end">
                      <button
                        onClick={handleDontShowAgain}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {t('dont_show_again')}
                      </button>
                      <button
                        onClick={handleGotIt}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-theme-600 hover:bg-green-theme-700 rounded-lg transition-colors"
                      >
                        {t('got_it')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </>
  );
};

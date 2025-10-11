'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, X, Send, Mail, User, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackData {
  name: string;
  email: string;
  message: string;
}

interface FeedbackWidgetProps {
  className?: string;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const [formData, setFormData] = useState<FeedbackData>({
    name: '',
    email: '',
    message: ''
  });

  const handleInputChange = (field: keyof FeedbackData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // 清除之前的错误信息
    if (submitError) {
      setSubmitError('');
    }
  };

  const validateForm = (): boolean => {
    if (!formData.message.trim()) {
      setSubmitError('Please enter your feedback');
      return false;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setSubmitError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Commit failed');
      }

      setSubmitSuccess(true);
      setFormData({ name: '', email: '', message: '' });

      // 3秒后自动关闭
      setTimeout(() => {
        setIsOpen(false);
        setSubmitSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Feedback submission error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Commit failed, please try again later!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSubmitSuccess(false);
    setSubmitError('');
  };

  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen)
    }

    // 首次进入页面时，判断是否处于全屏状态
    handleFullscreenChange()

    // 添加全屏变化监听器
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      // 移除全屏变化监听器
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    }
  }, [])

  return (
    <div className={`fixed right-2 md:right-4 bottom-4 z-50 ${className}`}
      style={{
        display: isFullscreen ? 'none' : 'block',
      }}
    >
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="bg-green-theme-600 hover:bg-green-theme-700 text-white cursor-pointer rounded-full p-2.5 shadow-lg hover:shadow-xl transition-all duration-150 group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Feedback"
      >
        <MessageSquare size={22} className="group-hover:rotate-12 transition-transform duration-300" />
      </motion.button>

      {/* Feedback Form Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              onClick={handleClose}
            />

            {/* Form Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 50, y: 50 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 50, y: 50 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed right-4 bottom-16 md:bottom-20 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 max-h-[85vh] overflow-auto thin-scrollbar z-50"
            >

              {submitSuccess ? (
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Send size={32} className="text-green-600" />
                    </motion.div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Feedback Submitted!</h3>
                  <p className="text-gray-600 text-sm">Thank you for your feedback. We will carefully review your suggestions.</p>
                </div>
              ) : (
                <>
                  {/* Form Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <MessageCircle size={20} className="text-green-theme-600" />
                      <h3 className="font-semibold text-gray-800">Feedback</h3>
                    </div>
                    <button
                      title='close'
                      onClick={handleClose}
                      className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Contact & Social Info */}
                  <div className="space-y-3 px-4 py-4">
                    {/* 说明 */}
                    <div className="flex items-start gap-2 bg-green-50 rounded-lg p-3">
                      {/* <MessageCircle size={20} className="text-green-theme-600 mt-0.5" /> */}
                      <span className="text-green-theme-800 text-[15px] leading-relaxed">
                        Have a character you'd like to see added, or any feedback about the site? We'd love to hear from you — your input helps us improve!
                      </span>
                    </div>

                    {/* 邮箱 */}
                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-3">

                      <span className="flex flex-col items-start gap-2 text-gray-700 text-sm">
                        <span className="font-medium">Feel free to email us at:</span>

                        <a
                          href="mailto:drewgrant616@gmail.com"
                          className="flex justify-start items-center gap-2 text-green-theme-700 hover:underline transition"
                        >
                          <Mail size={18} className="text-green-theme-600" />
                          drewgrant616@gmail.com
                        </a>
                      </span>
                    </div>

                    {/* X 社交 */}
                    {/* <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-3">
                      <TwitterIcon className="h-5 w-auto" />
                      <span className="text-gray-700 text-sm">
                        <span className="font-medium">:</span>
                        <a
                          href="https://x.com/compareheights"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-green-theme-700 hover:underline hover:font-semibold transition"
                        >
                          @compareheights
                        </a>
                      </span>
                    </div> */}
                  </div>

                  {/* Form Content */}
                  {/* <form onSubmit={handleSubmit} className="p-4 space-y-4">

                    <TextField
                      label="Name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      inputProps={{ maxLength: 32 }}
                      helperText={`${formData.name.length}/32`}
                      fullWidth
                      margin="dense"
                      disabled={isSubmitting}
                      placeholder="Your name"
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <User size={16} style={{ marginRight: 8, color: '#9ca3af' }} />
                        ),
                      }}
                    />

                    <TextField
                      label="Email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      inputProps={{ maxLength: 128 }}
                      helperText={`${formData.email.length}/128`}
                      fullWidth
                      margin="dense"
                      required
                      type='email'
                      disabled={isSubmitting}
                      placeholder="your@email.com"
                      variant="outlined"
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <Mail size={16} style={{ marginRight: 8, color: '#9ca3af' }} />
                        ),
                      }}
                    />

                    <TextField
                      label="Feedback"
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      inputProps={{ maxLength: 1000 }}
                      helperText={`${formData.message.length}/1000`}
                      fullWidth
                      margin="dense"
                      required
                      disabled={isSubmitting}
                      placeholder="Please share your suggestions, questions, or ideas..."
                      variant="outlined"
                      size="small"
                      multiline
                      minRows={4}
                    />

                    {submitError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-600 text-sm bg-red-50 p-2 rounded-md"
                      >
                        {submitError}
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-green-theme-600 hover:bg-green-theme-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Submit Feedback
                        </>
                      )}
                    </button>
                  </form> */}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
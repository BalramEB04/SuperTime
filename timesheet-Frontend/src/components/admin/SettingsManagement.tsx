import React, { useState } from 'react';
import { SystemSettingsConfig } from '../../types';
import {
  Settings,
  Building2,
  Globe,
  Bell,
  Palette,
  Save,
  Upload,
  CheckCircle2,
  Mail,
  Shield,
  Sparkles,
} from 'lucide-react';

interface SettingsManagementProps {
  settings: SystemSettingsConfig;
  onUpdateSettings: (newSettings: SystemSettingsConfig) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsManagement: React.FC<SettingsManagementProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
}) => {
  const [orgName, setOrgName] = useState(settings.orgName);
  const [orgRegId, setOrgRegId] = useState(settings.orgRegId);
  const [contactEmail, setContactEmail] = useState(settings.contactEmail);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(settings.companyLogoUrl);
  const [timeZone, setTimeZone] = useState(settings.timeZone);
  const [emailNotifications, setEmailNotifications] = useState(settings.emailNotifications);
  const [timesheetApprovalReminders, setTimesheetApprovalReminders] = useState(
    settings.timesheetApprovalReminders
  );
  const [leaveRequestAlerts, setLeaveRequestAlerts] = useState(settings.leaveRequestAlerts);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !contactEmail) {
      onShowToast('Validation Error', 'Organization name and contact email are required.', 'error');
      return;
    }

    const updatedSettings: SystemSettingsConfig = {
      orgName,
      orgRegId,
      contactEmail,
      companyLogoUrl,
      timeZone,
      emailNotifications,
      timesheetApprovalReminders,
      leaveRequestAlerts,
      primaryColor,
    };

    onUpdateSettings(updatedSettings);
    onShowToast('Settings Saved', 'Application configuration updated successfully.', 'success');
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header */}
      <div className="p-5 bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-sky-600" />
            <span>Application Master Settings &amp; Branding</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage organization identity, company logo, global time zones, automated email notifications, and UI appearance.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization Info */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Organization Master Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Organization Legal Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Registration CIN / Tax ID
                </label>
                <input
                  type="text"
                  value={orgRegId}
                  onChange={(e) => setOrgRegId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Administrator Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Primary Timezone
                </label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Asia/Kolkata (IST UTC+05:30)">Asia/Kolkata (IST UTC+05:30)</option>
                  <option value="America/New_York (EST UTC-05:00)">America/New_York (EST UTC-05:00)</option>
                  <option value="America/Los_Angeles (PST UTC-08:00)">America/Los_Angeles (PST UTC-08:00)</option>
                  <option value="Europe/London (GMT UTC+00:00)">Europe/London (GMT UTC+00:00)</option>
                  <option value="Asia/Singapore (SGT UTC+08:00)">Asia/Singapore (SGT UTC+08:00)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Company Branding & Logo */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200">
              <Palette className="w-4 h-4 text-blue-600" />
              <span>Branding & Logo Configuration</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                {companyLogoUrl ? (
                  <img
                    src={companyLogoUrl}
                    alt="Company Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div className="space-y-2 flex-1 w-full">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Company Logo Image URL
                </label>
                <input
                  type="url"
                  value={companyLogoUrl}
                  onChange={(e) => setCompanyLogoUrl(e.target.value)}
                  placeholder="https://domain.com/logo.png"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 font-medium">
                  PNG or SVG logo recommended (1:1 ratio or horizontal banner).
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Primary Brand Color Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                  Interface Theme Mode
                </label>
                <div className="p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 flex items-center justify-between">
                  <span>Standard Corporate Blue & Light Mode</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-black">
                    DEFAULT
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Notifications */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200">
              <Bell className="w-4 h-4 text-blue-600" />
              <span>Notification Preferences</span>
            </h3>

            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">System Email Notifications</span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    Send automated email digests for status changes and user activity.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={timesheetApprovalReminders}
                  onChange={(e) => setTimesheetApprovalReminders(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Timesheet Pending Reminders</span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    Alert PMs and Account Managers when timesheet submissions exceed 24 hours in pending queue.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={leaveRequestAlerts}
                  onChange={(e) => setLeaveRequestAlerts(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Leave Request Instant Alerts</span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    Notify managers immediately when an employee applies for leave.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* System Info Banner */}
          <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-black">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Timesheet & Project Management v3.5</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              System master data updated in real-time across all user sessions.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Image, Link, Upload, X, Check } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { colors, spacing, borderRadius, typography } from '../../../../styles/theme';
import { Button, Panel } from '../../../../components/ui';
import { useToast } from '../../../../contexts/ToastContext';

/**
 * Organization branding editor for host dashboard
 * Upload header logo (wide logo with name) and set website URL
 *
 * @param {string} organizationId - Organization UUID
 * @param {string} currentHeaderLogoUrl - Current header_logo_url
 * @param {string} currentWebsiteUrl - Current website_url
 * @param {function} onSave - Callback when save completes
 */
export function OrganizationBrandingEditor({ organizationId, currentHeaderLogoUrl, currentWebsiteUrl, onSave }) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [headerLogoUrl, setHeaderLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHeaderLogoUrl(currentHeaderLogoUrl || '');
    setWebsiteUrl(currentWebsiteUrl || '');
  }, [currentHeaderLogoUrl, currentWebsiteUrl]);

  const hasChanges = () => {
    return headerLogoUrl !== (currentHeaderLogoUrl || '') ||
           websiteUrl !== (currentWebsiteUrl || '');
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `org-logos/header-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setHeaderLogoUrl(urlData.publicUrl);
      toast.success('Logo uploaded');
    } catch (err) {
      console.error('Logo upload error:', err);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setHeaderLogoUrl('');
  };

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          header_logo_url: headerLogoUrl || null,
          website_url: websiteUrl.trim() || null,
        })
        .eq('id', organizationId);

      if (error) throw error;
      toast.success('Branding updated');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSave?.();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  const styles = {
    content: {
      padding: spacing.xl,
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.lg,
    },
    description: {
      color: colors.text.secondary,
      fontSize: typography.fontSize.sm,
      margin: 0,
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.sm,
    },
    label: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.text.primary,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.xs,
    },
    hint: {
      fontSize: typography.fontSize.xs,
      color: colors.text.muted,
    },
    uploadZone: {
      border: `2px dashed ${colors.border.light}`,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: spacing.md,
      cursor: 'pointer',
      transition: 'border-color 0.2s',
      background: colors.background.secondary,
    },
    previewContainer: {
      position: 'relative',
      background: colors.background.secondary,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px solid ${colors.border.lighter}`,
    },
    previewImage: {
      maxWidth: '280px',
      maxHeight: '120px',
      objectFit: 'contain',
    },
    removeButton: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      background: 'rgba(239,68,68,0.15)',
      border: '1px solid rgba(239,68,68,0.3)',
      color: '#ef4444',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      width: '100%',
      padding: `${spacing.sm} ${spacing.md}`,
      background: colors.background.secondary,
      border: `1px solid ${colors.border.lighter}`,
      borderRadius: borderRadius.md,
      color: colors.text.primary,
      fontSize: typography.fontSize.base,
      outline: 'none',
      boxSizing: 'border-box',
    },
    actions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
  };

  return (
    <Panel title="Organization Branding" icon={Image}>
      <div style={styles.content}>
        <p style={styles.description}>
          Upload your header logo (with organization name included) and set a website link.
          This logo appears on the competition page with "Presented by" above it.
        </p>

        {/* Header Logo Upload */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            <Image size={14} />
            Header Logo
          </label>
          <p style={styles.hint}>
            Wide logo with your organization name. Transparent background recommended (PNG).
          </p>

          {headerLogoUrl ? (
            <div style={styles.previewContainer}>
              <img src={headerLogoUrl} alt="Header logo" style={styles.previewImage} />
              <button style={styles.removeButton} onClick={handleRemoveLogo} title="Remove logo">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              style={styles.uploadZone}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <Upload size={24} style={{ color: colors.text.muted }} />
              <span style={{ color: colors.text.secondary, fontSize: typography.fontSize.sm }}>
                {uploading ? 'Uploading...' : 'Click to upload header logo'}
              </span>
              <span style={{ color: colors.text.muted, fontSize: typography.fontSize.xs }}>
                PNG, JPG, WebP · Max 2MB
              </span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={handleLogoUpload}
          />
        </div>

        {/* Website URL */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            <Link size={14} />
            Website URL
          </label>
          <p style={styles.hint}>
            Clicking your logo on the competition page will open this link.
          </p>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yourwebsite.com"
            style={styles.input}
          />
        </div>

        {/* Save Button */}
        <div style={styles.actions}>
          <Button
            onClick={handleSave}
            disabled={!hasChanges() || saving}
            icon={saved ? Check : undefined}
            variant={saved ? 'success' : 'primary'}
          >
            {saved ? 'Saved' : saving ? 'Saving...' : 'Save Branding'}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export default OrganizationBrandingEditor;

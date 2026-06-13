import React from 'react';
import { AboutSectionEditor, OrganizationBrandingEditor } from '../settings';

/**
 * ContentTab - Public-facing content: organization branding and the About section.
 * (Announcements moved to the Engagement tab.)
 */
export default function ContentTab({
  competition,
  onRefresh,
  organizationId,
  organizationHeaderLogoUrl,
  organizationWebsiteUrl,
}) {
  return (
    <div>
      {/* Organization Branding */}
      <OrganizationBrandingEditor
        organizationId={organizationId}
        currentHeaderLogoUrl={organizationHeaderLogoUrl}
        currentWebsiteUrl={organizationWebsiteUrl}
        onSave={onRefresh}
      />

      {/* About Section */}
      <AboutSectionEditor competition={competition} organization={null} onSave={onRefresh} />
    </div>
  );
}

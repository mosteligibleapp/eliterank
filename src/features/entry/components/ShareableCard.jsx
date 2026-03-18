import React, { useState, useEffect } from 'react';
import { generateAchievementCard } from '../../achievement-cards/generateAchievementCard';

/**
 * ShareableCard - Preview of the achievement card at 360x640 scale
 * Uses generateAchievementCard to render a consistent nominated card.
 */
export default function ShareableCard({
  name,
  photoUrl,
  handle,
  competitionTitle,
  cityName,
  season,
  accentColor = '#d4af37',
  organizationLogoUrl,
  voteUrl,
  votingStartDate,
}) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    generateAchievementCard({
      achievementType: 'nominated',
      name,
      photoUrl,
      handle,
      competitionName: competitionTitle,
      cityName,
      season: String(season || ''),
      accentColor,
      organizationLogoUrl,
      voteUrl,
      votingStartDate,
    })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch((err) => {
        console.error('Card preview generation failed:', err);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
    };
  }, [name, photoUrl, handle, competitionTitle, cityName, season, accentColor, organizationLogoUrl, voteUrl, votingStartDate]);

  return (
    <div className="entry-shareable-card">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Nominated card preview"
          className="entry-card-canvas"
          style={{ width: 360, height: 640, objectFit: 'contain', borderRadius: 12 }}
        />
      ) : (
        <div
          className="entry-card-canvas"
          style={{
            width: 360,
            height: 640,
            background: '#0a0a10',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
          }}
        >
          Generating...
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { FaCheck } from 'react-icons/fa';

// List of available avatar IDs (00 to 15)
const avatarIds = Array.from({ length: 16 }, (_, i) => 
  i < 10 ? `0${i}` : `${i}`
);

// Generate avatar paths
const getAvatarPath = (id) => {
  try {
    // Try to use the direct path first
    return `/avatars/${id}_final.svg`;
  } catch (error) {
    console.error('Error getting avatar path:', error);
    return '/avatars/00_final.svg';
  }
};

export default function AvatarSelector({ currentAvatar, onSelect }) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || '00');
  const [saving, setSaving] = useState(false);

  const handleAvatarSelect = async (avatarId) => {
    if (saving || selectedAvatar === avatarId) return;
    
    setSelectedAvatar(avatarId);
    setSaving(true);
    
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          avatar: avatarId,
          updatedAt: new Date().toISOString()
        });
        // Call onSelect after successful update
        if (onSelect) onSelect(avatarId);
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      // Revert the selection if there's an error
      setSelectedAvatar(currentAvatar);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="avatar-selector">
      <h3>Choisissez votre avatar</h3>
      <div className="avatar-grid">
        {avatarIds.map((id) => (
          <div 
            key={id}
            onClick={() => handleAvatarSelect(id)}
            className={`avatar-item ${selectedAvatar === id ? 'selected' : ''}`}
          >
            <img 
              src={getAvatarPath(id)}
              alt={`Avatar ${id}`}
              loading="eager"
              onError={(e) => {
                console.error(`Failed to load avatar ${id}`);
                e.target.src = '/avatars/00_final.svg';
              }}
              onLoad={(e) => console.log(`Loaded avatar ${id}`)}
              className="w-full h-auto"
            />
            {selectedAvatar === id && (
              <div className="checkmark">
                <FaCheck size={10} />
              </div>
            )}
          </div>
        ))}
      </div>
      {saving && <p className="saving-text">Enregistrement...</p>}
    </div>
  );
}

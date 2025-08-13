import React from 'react';
import { getAvatarUrl } from '../../utils/avatars';

const Avatar = ({ 
  userId, 
  username, 
  size = 'md',
  showTooltip = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-lg'
  };

  const avatarUrl = getAvatarUrl(userId || 'default');
  const displayName = username ? username.charAt(0).toUpperCase() : '?';

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 flex items-center justify-center`}>
        <img 
          src={avatarUrl} 
          alt={username || 'User avatar'} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initial if image fails to load
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div 
          className="hidden w-full h-full bg-[var(--primary-color)] text-white font-bold items-center justify-center"
          style={{ display: 'none' }}
        >
          {displayName}
        </div>
      </div>
      {showTooltip && username && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          {username}
        </div>
      )}
    </div>
  );
};

export default Avatar;

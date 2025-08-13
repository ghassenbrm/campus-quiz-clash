// List of available avatar URLs (using DiceBear Avatars with different styles)
export const AVATAR_STYLES = {
  avataaars: 'https://api.dicebear.com/7.x/avataaars/svg?seed=',
  bottts: 'https://api.dicebear.com/7.x/bottts/svg?seed=',
  identicon: 'https://api.dicebear.com/7.x/identicon/svg?seed=',
  micah: 'https://api.dicebear.com/7.x/micah/svg?seed=',
  miniavs: 'https://api.dicebear.com/7.x/miniavs/svg?seed='
};

// Generate a random avatar URL based on user ID
export const getAvatarUrl = (userId, style = 'avataaars') => {
  const baseUrl = AVATAR_STYLES[style] || AVATAR_STYLES.avataaars;
  return `${baseUrl}${userId}`;
};

// Get a random avatar style
export const getRandomAvatarStyle = () => {
  const styles = Object.keys(AVATAR_STYLES);
  return styles[Math.floor(Math.random() * styles.length)];
};

// Avatar images for user profile selection
// Using Cloudinary-hosted images for reliable delivery

export const AVATAR_OPTIONS = [
  "https://res.cloudinary.com/dtarhtz5w/image/upload/v1765317833/image4_nfbdvk.png",
  "https://res.cloudinary.com/dtarhtz5w/image/upload/v1765317832/image10_prpun0.jpg",
  "https://res.cloudinary.com/dtarhtz5w/image/upload/v1765317832/image2_levtat.png",
  "https://res.cloudinary.com/dtarhtz5w/image/upload/v1765317832/image3_ergsfw.png",
  "https://res.cloudinary.com/dtarhtz5w/image/upload/v1765317832/image6_yfyyap.png",
  "https://res.cloudinary.com/dtarhtz5w/image/upload/v1765317832/image9_rvnbwo.png",
  "https://res.cloudinary.com/dtarhtz5w/image/upload/v1765317832/image5_sbju6u.png",
  "https://res.cloudinary.com/dtarhtz5w/image/upload/v1765317832/image7_kvh8hu.jpg",
  "https://res.cloudinary.com/dtarhtz5w/image/upload/v1765317832/image8_qfdmet.png",
] as const;

export type AvatarOption = typeof AVATAR_OPTIONS[number];

export const DEFAULT_AVATAR = AVATAR_OPTIONS[0];

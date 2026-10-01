/** Honorifics that start most names in the roster ("Engr. Hassan", "Sir Yaqub"). */
const TITLES = /^(engr|eng|sir|mr|mrs|ms|dr)\.?\s+/i;

/**
 * The letter shown in a person's avatar. Taking the first character of the
 * full name gave nearly everyone an "E", for "Engr.".
 */
export const personInitial = (name: string): string => {
  const bare = name.trim().replace(TITLES, '');
  return (bare.charAt(0) || name.charAt(0) || '?').toUpperCase();
};

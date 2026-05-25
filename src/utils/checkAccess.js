/**
 * Checks if a user has pro access
 * @param {Object} user 
 * @returns boolean
 */
export const hasProAccess = (user) => user?.plan === "pro" || user?.plan === "enterprise";

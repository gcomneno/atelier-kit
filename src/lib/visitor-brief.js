/**
 * Copy a Visitor Brief while keeping a social profile opening tied to the
 * original user gesture. The placeholder is closed on clipboard failure.
 *
 * @param {{
 *   text: string,
 *   url: string,
 *   writeText: (text: string) => Promise<void>,
 *   openWindow: () => {
 *     opener: unknown,
 *     close: () => void,
 *     document: any,
 *     location: { replace: (url: string) => void }
 *   } | null
 * }} options
 * @returns {Promise<'opened' | 'copy-failed' | 'popup-blocked'>}
 */
export async function copyBriefAndOpenSocial({ text, url, writeText, openWindow }) {
  const profileWindow = openWindow();

  if (!profileWindow) {
    try {
      await writeText(text);
      return 'popup-blocked';
    } catch {
      return 'copy-failed';
    }
  }

  try {
    profileWindow.opener = null;
    const referrerPolicy = profileWindow.document.createElement('meta');
    referrerPolicy.name = 'referrer';
    referrerPolicy.content = 'no-referrer';
    profileWindow.document.head.append(referrerPolicy);
  } catch {
    profileWindow.close();
    try {
      await writeText(text);
      return 'popup-blocked';
    } catch {
      return 'copy-failed';
    }
  }

  try {
    await writeText(text);
  } catch {
    profileWindow.close();
    return 'copy-failed';
  }

  try {
    profileWindow.location.replace(url);
    return 'opened';
  } catch {
    profileWindow.close();
    return 'popup-blocked';
  }
}

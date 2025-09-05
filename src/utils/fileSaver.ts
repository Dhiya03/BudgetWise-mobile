import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

/**
 * A cross-platform helper to save files to a public directory, handling
 * modern Android storage restrictions.
 *
 * @param filename The name of the file to save.
 * @param data The file content, either as a string or base64 encoded.
 * @param opts Options for encoding and subfolder.
 */
export async function savePublicFile(
  filename: string,
  data: string,
  opts: { encoding?: Encoding; isBase64?: boolean; subfolder?: string } = {}
) {
  const subfolder = opts.subfolder || 'BudgetWise';

  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
      const permStatus = await Filesystem.checkPermissions();
      if (permStatus.publicStorage !== 'granted') {
        const permResult = await Filesystem.requestPermissions();
        if (permResult.publicStorage !== 'granted') {
          throw new Error('User denied storage permission.');
        }
      }
    }

    // On Android, to save to the public Download folder, we must use
    // Directory.External and prefix the path. On iOS, Directory.Download
    // is user-visible in the Files app.
    const directory = platform === 'android' ? Directory.External : Directory.Documents;
    // For Android, we use the Download directory as it's a more common public location.
    // For iOS, we use the app's sandboxed Download directory.
    const path = platform === 'android' ? `Download/${subfolder}/${filename}` : `${subfolder}/${filename}`;

    await Filesystem.writeFile({
      path,
      data,
      directory,
      encoding: opts.isBase64 ? undefined : opts.encoding || Encoding.UTF8,
      recursive: true,
    });

    const userVisiblePath = platform === 'android' ? `Download/${subfolder}/${filename}` : `Documents/${subfolder}/${filename}`;
    return userVisiblePath;
  } else {
    // Web fallback using a Blob to trigger a download.
    let blob;
    if (opts.isBase64) {
      // For Base64, we need to decode it into a byte array first.
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray]);
    } else {
      blob = new Blob([data]);
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return filename;
  }
}
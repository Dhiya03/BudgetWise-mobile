import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

/**
 * API 30+ Compatible File Saver
 * 
 */
export async function savePublicFile(
  filename: string,
  data: string,
  opts: { encoding?: Encoding; isBase64?: boolean; subfolder?: string } = {}
): Promise<string> {
  const subfolder = opts.subfolder || 'BudgetWise';

  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
      try {
        const permStatus = await Filesystem.checkPermissions();
        if (permStatus.publicStorage !== 'granted') {
          const permResult = await Filesystem.requestPermissions();
          if (permResult.publicStorage !== 'granted') {
            throw new Error('User denied storage permission.');
          }
        }

        await Filesystem.writeFile({
          path: `Documents/BudgetWise/${filename}`,
          data: data,
          directory: Directory.ExternalStorage,
          encoding: opts.isBase64 ? undefined : (opts.encoding || Encoding.UTF8),
          recursive: true,
        });

        return `Documents/BudgetWise/${filename}`;

      } catch (e) {
        if (e instanceof Error) {
          throw new Error(`Android file save failed: ${e.message}`);
        }
        throw new Error('An unknown error occurred during Android file save.');
      }

    } else if (platform === 'ios') {
      try {
        await Filesystem.writeFile({
          path: `${subfolder}/${filename}`,
          data: data,
          directory: Directory.Documents,
          encoding: opts.isBase64 ? undefined : (opts.encoding || Encoding.UTF8),
          recursive: true,
        });
        return `Documents/${subfolder}/${filename}`;
      } catch (e) {
        if (e instanceof Error) {
          throw new Error(`iOS file save failed: ${e.message}`);
        }
        throw new Error('An unknown error occurred during iOS file save.');
      }
    }else {
    // Web implementation (unchanged)
    try {
      let blob: Blob;
      if (opts.isBase64) {
        const byteCharacters = atob(data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray]);
      } else {
        blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
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
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(`Web download failed: ${e.message}`);
      }
      throw new Error('An unknown error occurred during web download.');
    }
  }
}
  throw new Error('Platform not supported');
}
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * API 30+ Compatible File Saver
 * Uses Share API as fallback for better user experience
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
      // Try the direct file save first
      try {
        const permStatus = await Filesystem.checkPermissions();
        if (permStatus.publicStorage !== 'granted') {
          const permResult = await Filesystem.requestPermissions();
          if (permResult.publicStorage !== 'granted') {
            // If permissions denied, use Share API instead
            return await shareFileAsAlternative(filename, data, opts);
          }
        }

        // Create folder and save file
        await Filesystem.mkdir({
          path: 'Download/BudgetWise',
          directory: Directory.ExternalStorage,
          recursive: true
        });

        await Filesystem.writeFile({
          path: `Download/BudgetWise/${filename}`,
          data: data,
          directory: Directory.ExternalStorage,
          encoding: opts.isBase64 ? undefined : (opts.encoding || Encoding.UTF8)
        });

        return `Downloads/BudgetWise/${filename}`;

      } catch (error) {
        console.log('Direct save to public Downloads failed, trying alternative methods...', error);
        
        // Fallback 1: App's external files directory (works on API 30+)
        try {
          await Filesystem.mkdir({
            path: subfolder,
            directory: Directory.ExternalStorage,
            recursive: true
          });

          await Filesystem.writeFile({
            path: `${subfolder}/${filename}`,
            data: data,
            directory: Directory.ExternalStorage,
            encoding: opts.isBase64 ? undefined : (opts.encoding || Encoding.UTF8)
          });

          return `Android/data/[app]/files/${subfolder}/${filename}`;

        } catch (fallbackError) {
          // Fallback 2: Use Share API to let user choose where to save
          return await shareFileAsAlternative(filename, data, opts);
        }
      }

    } else if (platform === 'ios') {
      // iOS implementation (unchanged)
      await Filesystem.mkdir({
        path: subfolder,
        directory: Directory.Documents,
        recursive: true
      });

      await Filesystem.writeFile({
        path: `${subfolder}/${filename}`,
        data: data,
        directory: Directory.Documents,
        encoding: opts.isBase64 ? undefined : (opts.encoding || Encoding.UTF8)
      });

      return `Documents/${subfolder}/${filename}`;
    }

  } else {
    // Web implementation (unchanged)
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
  }

  throw new Error('Platform not supported');
}

/**
 * Alternative method using Share API for Android API 30+
 * This lets users choose where to save the file
 */
async function shareFileAsAlternative(
  filename: string,
  data: string,
  opts: { encoding?: Encoding; isBase64?: boolean; subfolder?: string } = {}
): Promise<string> {
  try {
    // Save to temporary app directory first
    const tempPath = `temp/${filename}`;
    
    await Filesystem.mkdir({
      path: 'temp',
      directory: Directory.Cache,
      recursive: true
    });

    await Filesystem.writeFile({
      path: tempPath,
      data: data,
      directory: Directory.Cache,
      encoding: opts.isBase64 ? undefined : (opts.encoding || Encoding.UTF8)
    });

    // Get the file URI
    const fileUri = await Filesystem.getUri({
      path: tempPath,
      directory: Directory.Cache
    });

    // Use Share API to let user save the file
    await Share.share({
      title: 'Save BudgetWise Export',
      text: `Save ${filename} to your preferred location`,
      url: fileUri.uri,
      dialogTitle: 'Save File'
    });

    return `Shared via system - user can choose location`;

  } catch (shareError) {
    if (shareError instanceof Error) {
      throw new Error(`Could not save or share file: ${shareError.message}`);
    }
    throw new Error('An unknown error occurred while sharing the file.');
  }
}
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { FilePicker } from '@capawesome/capacitor-file-picker';

export type SupportedFormat = 'csv' | 'json' | 'txt' | 'html' | 'pdf' | 'xlsx';

const SUBFOLDER = 'BudgetWise';

class FileService {
  /**
   * Let user pick a file (Scoped Storage + SAF on Android 11+)
   */
  static async pickFile() {
    const result = await FilePicker.pickFiles({
      // Using '*/*' is broad, but necessary for user to find backups
      // that the OS may have mislabeled. We validate by extension later.
      types: ['*/*'],
      readData: false, // We only need the path, not the data content here
    });

    if (!result || result.files.length === 0) return null;

    const file = result.files[0];
    return { name: file.name, path: file.path };
  }

  /**
   * Detect format by file extension only
   */
  static detectFormat(name: string): SupportedFormat {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'pdf';
      case 'json': return 'json';
      case 'csv': return 'csv';
      case 'html': case 'htm': return 'html';
      case 'xlsx': case 'xls': return 'xlsx';
      case 'txt':
      default: return 'txt';
    }
  }

  /**
   * Read file based on detected format
   */
  static async readFile(path: string, format: SupportedFormat): Promise<string> {
    const encoding = (format === 'pdf' || format === 'xlsx') ? undefined : Encoding.UTF8;
    const result = await Filesystem.readFile({ path, encoding });
    return result.data as string;
  }

  /**
   * Write file and return filename + full native URI + human-readable path
   */
  static async writeFile(
    filename: string,
    data: string,
    format: SupportedFormat
  ): Promise<{ filename: string; uri: string; readablePath: string }> {
    const encoding = (format === 'pdf' || format === 'xlsx') ? undefined : Encoding.UTF8;
    const path = `${SUBFOLDER}/${filename}`;

    await Filesystem.writeFile({ path, data, directory: Directory.Documents, encoding, recursive: true });
    const fileUri = await Filesystem.getUri({ directory: Directory.Documents, path });

    return {
      filename,
      uri: fileUri.uri,
      readablePath: this.getReadablePath(fileUri.uri, filename),
    };
  }

  /**
   * Save JSON object as a pretty-printed file
   */
  static async saveJSON(
    filename: string,
    data: any
  ): Promise<{ filename: string; uri: string; readablePath: string }> {
    const json = JSON.stringify(data, null, 2);
    return this.writeFile(filename, json, 'json');
  }

  /**
   * Convert URI into a human-readable file path for the user
   */
  static getReadablePath(uri: string, filename: string): string {
    if (uri.startsWith('file://')) return uri.replace('file://', '');
    // This is a heuristic for Android's content URIs. The actual path might vary.
    if (uri.startsWith('content://')) return `Documents/${SUBFOLDER}/${filename}`;
    return uri;
  }

  /**
   * Delete a file from Documents directory
   */
  static async deleteFile(filename: string): Promise<boolean> {
    try {
      const path = `${SUBFOLDER}/${filename}`;
      await Filesystem.deleteFile({ directory: Directory.Documents, path });
      return true;
    } catch (err) {
      console.warn(`Failed to delete file "${filename}":`, err);
      return false;
    }
  }
}

export default FileService;
import { Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildRecipeHtml, buildRecipeText, pdfFileName, type ShareableRecipe } from './recipeText';

// Opens the phone's own share sheet with the recipe as text. From there the
// person picks Messages, Mail, Messenger, Facebook, Notes, AirDrop, and so on.
export async function shareRecipeText(r: ShareableRecipe): Promise<void> {
  await Share.share({ message: buildRecipeText(r), title: r.title });
}

// Builds a PDF and opens the share sheet with the file attached.
// Returns false if file sharing isn't available on this device.
export async function shareRecipePdf(r: ShareableRecipe): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const printed = await Print.printToFileAsync({ html: buildRecipeHtml(r), base64: true });
  const options = { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: r.title };

  // Preferred: write the PDF into the app's own cache under a readable name
  // ("Grandmas Cookies.pdf"), the same way the backup file is written.
  if (printed.base64) {
    try {
      const named = new File(Paths.cache, pdfFileName(r.title));
      named.create({ overwrite: true });
      named.write(base64ToBytes(printed.base64));
      await Sharing.shareAsync(named.uri, options);
      return true;
    } catch {
      // Fall through to the file the print engine made.
    }
  }

  // Fallback: share the generated file as-is (random name, but always works).
  await Sharing.shareAsync(printed.uri, options);
  return true;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Opens the system print dialog (AirPrint on iPhone).
export async function printRecipe(r: ShareableRecipe): Promise<void> {
  await Print.printAsync({ html: buildRecipeHtml(r) });
}

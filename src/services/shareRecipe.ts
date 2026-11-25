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
  const { uri } = await Print.printToFileAsync({ html: buildRecipeHtml(r) });

  // Give the file a readable name ("Grandmas Cookies.pdf") instead of a random one.
  let shareUri = uri;
  try {
    const named = new File(Paths.cache, pdfFileName(r.title));
    if (named.exists) named.delete();
    new File(uri).copy(named);
    shareUri = named.uri;
  } catch {
    // Fall back to the generated name; sharing still works.
  }

  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: r.title,
  });
  return true;
}

// Opens the system print dialog (AirPrint on iPhone).
export async function printRecipe(r: ShareableRecipe): Promise<void> {
  await Print.printAsync({ html: buildRecipeHtml(r) });
}

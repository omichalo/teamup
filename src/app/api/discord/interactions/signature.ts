import nacl from "tweetnacl";

export function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  try {
    const message = timestamp + body;
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(publicKey);

    return nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error(
      "[Discord Interactions] Erreur lors de la vérification de signature:",
      error
    );
    return false;
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) {
    throw new Error(`Invalid hex string: ${hex}`);
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

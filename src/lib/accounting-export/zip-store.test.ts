import { createDeflatedZip } from "./zip-store";

describe("createDeflatedZip", () => {
  it("produit un ZIP lisible avec en-têtes locaux", () => {
    const zip = createDeflatedZip([
      { name: "hello.txt", data: Buffer.from("bonjour", "utf8") },
      { name: "controle.json", data: Buffer.from('{"ok":true}\n', "utf8") },
    ]);
    expect(zip.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(
      true
    );
    expect(zip.includes(Buffer.from("hello.txt", "utf8"))).toBe(true);
    expect(zip.includes(Buffer.from("controle.json", "utf8"))).toBe(true);
    expect(zip.length).toBeGreaterThan(40);
  });
});

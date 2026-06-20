import path from "path";
import type { Attachment } from "nodemailer/lib/mailer";

export const SQYPING_EMAIL_LOGO_CID = "logo-sqyping";

export function getSqyPingLogoAttachment(): Attachment {
  return {
    filename: "sqyping-logo.jpg",
    path: path.join(process.cwd(), "public", "sqyping-logo.jpg"),
    cid: SQYPING_EMAIL_LOGO_CID,
    contentType: "image/jpeg",
  };
}

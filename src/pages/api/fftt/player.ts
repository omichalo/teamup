import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, licence } = req.query;

  if (!name && !licence) {
    return res
      .status(400)
      .json({ error: "Name or licence parameter is required" });
  }

  // FFTT API methods are not available
  return res.status(501).json({
    error: "FFTT API methods not implemented",
    message: "Player search functionality is not yet available",
  });
}

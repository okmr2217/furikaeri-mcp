import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatDateForPhotos, generatePhotosSearchUrl } from "../lib/photos-url.js";
import type { PhotosUrlResult } from "../types/index.js";

const paramsSchema = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください"),
};

export function registerGetPhotosUrl(server: McpServer): void {
  server.tool("get_photos_url", "Google Photos の検索 URL を生成する", paramsSchema, async ({ date }) => {
    const searchQuery = formatDateForPhotos(date);
    const url = generatePhotosSearchUrl(searchQuery);

    const result: PhotosUrlResult = { date, searchQuery, url };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });
}

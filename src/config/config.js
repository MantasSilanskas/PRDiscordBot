import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve("config/.env") });

export const env = {
  auth_token: process.env.AUTH_TOKEN,
  client_token: process.env.CLIENT_TOKEN,
  channel_id: process.env.CHANNEL_ID,
  role_id: process.env.ROLE_ID,
  timezone: process.env.TIMEZONE,
  date_format: process.env.DATEFORMAT,
  user_id: process.env.USER_ID,
};
